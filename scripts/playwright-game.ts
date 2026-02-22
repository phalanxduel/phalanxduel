import { chromium, Page, BrowserContext } from '@playwright/test';

interface BotPlayer {
  name: string;
  context: BrowserContext;
  page: Page;
}

const BASE_URL = process.env.BASE_URL || 'https://play.phalanxduel.com';
const MAX_GAMES = Number(process.env.MAX_GAMES || 3);
const MAX_MOVES_PER_GAME = Number(process.env.MAX_MOVES_PER_GAME || 250);
const FORFEIT_CHANCE = Number(process.env.FORFEIT_CHANCE || 0.02);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function isGameOver(page: Page): Promise<boolean> {
  if (page.isClosed()) return false;
  try {
    return await page.locator('[data-testid="game-over"]').isVisible({ timeout: 500 });
  } catch {
    return false;
  }
}

async function getResultText(page: Page): Promise<string> {
  if (page.isClosed()) return '';
  try {
    const txt = await page.locator('[data-testid="game-over-result"]').first().textContent({ timeout: 500 });
    return txt?.trim() ?? '';
  } catch {
    return '';
  }
}

async function maybeClickForfeit(page: Page, name: string): Promise<boolean> {
  if (Math.random() >= FORFEIT_CHANCE) return false;
  const forfeitBtn = page.locator('[data-testid="combat-forfeit-btn"]');
  if (!(await forfeitBtn.isVisible().catch(() => false))) return false;

  console.log(`[${name}] FORFEIT triggered (chance=${FORFEIT_CHANCE}).`);
  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await forfeitBtn.click();
  return true;
}

async function createAndJoinMatch(creator: BotPlayer, joiner: BotPlayer): Promise<void> {
  await creator.page.goto(BASE_URL);
  await creator.page.fill('[data-testid="lobby-name-input"]', creator.name);
  await creator.page.click('[data-testid="lobby-create-btn"]');

  await creator.page.waitForSelector('[data-testid="waiting-match-id"]');
  const rawMatchId = await creator.page.textContent('[data-testid="waiting-match-id"]');
  const matchId = rawMatchId?.trim();
  console.log(`📦 Match Created by ${creator.name}: "${matchId}"`);

  const joinUrl = `${BASE_URL}?match=${matchId}`;
  console.log(`🔗 ${joiner.name} joining via: ${joinUrl}`);
  await joiner.page.goto(joinUrl);
  const joinBtn = joiner.page
    .locator('button:has-text("Accept & Enter Match"), [data-testid="lobby-join-accept-btn"]')
    .first();
  await joinBtn.waitFor({ state: 'visible' });
  await joiner.page.fill('[data-testid="lobby-name-input"], .name-input', joiner.name);
  await joinBtn.click();
}

async function takeAction(page: Page, name: string): Promise<void> {
  const phaseText = await page.textContent('[data-testid="phase-indicator"]');
  console.log(`[${name}] Phase: ${phaseText}`);

  if (phaseText?.includes('deployment')) {
    const handCards = page.locator('.hand-card.playable');
    const count = await handCards.count();
    console.log(`[${name}] Found ${count} playable cards in hand`);

    if (count > 0) {
      const idx = Math.floor(Math.random() * count);
      await handCards.nth(idx).click();
      console.log(`[${name}] Selected hand card ${idx}`);

      await page.waitForTimeout(600);
      const colBtns = page.locator('.col-btn.col-available');
      const colCount = await colBtns.count();
      console.log(`[${name}] Found ${colCount} available columns`);
      if (colCount > 0) {
        const colIdx = Math.floor(Math.random() * colCount);
        await colBtns.nth(colIdx).click();
        console.log(`[${name}] Deployed to column ${colIdx}`);
      } else {
        console.log(`[${name}] WARN: no available columns.`);
      }
    }
    return;
  }

  if (phaseText?.toLowerCase().includes('reinforce')) {
    if (await maybeClickForfeit(page, name)) return;

    const handCards = page.locator('.hand-card.reinforce-playable');
    const count = await handCards.count();
    console.log(`[${name}] Reinforcing: Found ${count} playable cards`);
    if (count > 0) {
      const idx = Math.floor(Math.random() * count);
      await handCards.nth(idx).click();
      console.log(`[${name}] REINFORCEMENT complete.`);
    }
    return;
  }

  if (!phaseText?.includes('combat')) return;

  if (await maybeClickForfeit(page, name)) return;

  const attackers = page.locator('[data-testid^="player-cell-r0-c"].bf-cell.occupied');
  const count = await attackers.count();
  console.log(`[${name}] Found ${count} front-row attackers`);

  if (count <= 0 || Math.random() < 0.05) {
    console.log(`[${name}] PASSING turn.`);
    await page.click('[data-testid="combat-pass-btn"]').catch(() => {});
    return;
  }

  const idx = Math.floor(Math.random() * count);
  const attacker = attackers.nth(idx);
  await attacker.click();

  await page.waitForTimeout(200);
  const selectedAttacker = page.locator('[data-testid^="player-cell-r0-c"].bf-cell.selected').first();
  const selectedCount = await selectedAttacker.count();
  if (selectedCount === 0) {
    console.log(`[${name}] No selected front-row attacker after click; passing.`);
    await page.click('[data-testid="combat-pass-btn"]').catch(() => {});
    return;
  }

  const selectedTestId = await selectedAttacker.getAttribute('data-testid');
  const colMatch = selectedTestId?.match(/-c(\d+)$/);
  if (!colMatch) {
    console.log(`[${name}] Could not parse selected attacker column from ${selectedTestId}; passing.`);
    await page.click('[data-testid="combat-pass-btn"]').catch(() => {});
    return;
  }
  const col = Number(colMatch[1]);
  console.log(`[${name}] Selected front-row attacker in column ${col}`);

  await page.waitForTimeout(600);
  const target = page.locator(
    `[data-testid="opponent-cell-r0-c${col}"].bf-cell.occupied.valid-target`,
  );
  const targetCount = await target.count();

  if (targetCount > 0) {
    await target.first().click();
    console.log(`[${name}] ATTACK executed in column ${col} (front-row direct target)`);
  } else {
    console.log(`[${name}] No front-row direct target in column ${col}; passing.`);
    await page.click('[data-testid="combat-pass-btn"]').catch(() => {});
  }
}

async function determineOutcome(p1: BotPlayer, p2: BotPlayer): Promise<{ winner: BotPlayer; loser: BotPlayer } | null> {
  const p1Result = await getResultText(p1.page);
  const p2Result = await getResultText(p2.page);

  if (p1Result.includes('You Win') && p2Result.includes('You Lose')) {
    return { winner: p1, loser: p2 };
  }
  if (p2Result.includes('You Win') && p1Result.includes('You Lose')) {
    return { winner: p2, loser: p1 };
  }
  return null;
}

async function runSingleGame(p1: BotPlayer, p2: BotPlayer): Promise<{ winner: BotPlayer; loser: BotPlayer } | null> {
  console.log('⚔️ Both players joined. Starting game loop...');
  let moveCount = 0;

  while (moveCount < MAX_MOVES_PER_GAME) {
    await sleep(1200);
    moveCount++;

    const p1Over = await isGameOver(p1.page);
    const p2Over = await isGameOver(p2.page);
    if (p1Over || p2Over) {
      console.log('🏁 Game Over detected!');
      return determineOutcome(p1, p2);
    }

    const p1IsActive = await p1.page.locator('.turn-indicator.my-turn').isVisible().catch(() => false);
    const p2IsActive = await p2.page.locator('.turn-indicator.my-turn').isVisible().catch(() => false);

    if (p1IsActive) {
      console.log(`>>> ${p1.name} is active`);
      await takeAction(p1.page, p1.name);
    } else if (p2IsActive) {
      console.log(`>>> ${p2.name} is active`);
      await takeAction(p2.page, p2.name);
    } else {
      console.log('... Waiting for turn transition ...');
    }
  }

  console.log(`⏹️ Reached move limit (${MAX_MOVES_PER_GAME}) before game over.`);
  return null;
}

async function restartFromWinner(winner: BotPlayer, loser: BotPlayer): Promise<void> {
  const playAgainBtn = winner.page.locator('[data-testid="play-again-btn"]').first();
  if (await playAgainBtn.isVisible().catch(() => false)) {
    await playAgainBtn.click();
  } else {
    await winner.page.goto(BASE_URL);
  }

  await loser.page.close();
  loser.page = await loser.context.newPage();
}

async function main(): Promise<void> {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 350,
  });

  const p1Context = await browser.newContext({ viewport: { width: 1000, height: 1000 } });
  const p2Context = await browser.newContext({ viewport: { width: 1000, height: 1000 } });

  let p1: BotPlayer = { name: 'Foo', context: p1Context, page: await p1Context.newPage() };
  let p2: BotPlayer = { name: 'Bar', context: p2Context, page: await p2Context.newPage() };

  console.log(`🚀 Starting Phalanx Duel automation on ${BASE_URL}`);
  console.log(`ℹ️ Settings: MAX_GAMES=${MAX_GAMES}, MAX_MOVES_PER_GAME=${MAX_MOVES_PER_GAME}, FORFEIT_CHANCE=${FORFEIT_CHANCE}`);

  let gameNumber = 1;
  while (MAX_GAMES <= 0 || gameNumber <= MAX_GAMES) {
    console.log(`\n===== Game ${gameNumber} =====`);
    await createAndJoinMatch(p1, p2);
    const outcome = await runSingleGame(p1, p2);
    if (!outcome) {
      console.log('❌ No decisive outcome detected; stopping.');
      break;
    }

    console.log(`✅ Winner: ${outcome.winner.name} | Loser: ${outcome.loser.name}`);
    await restartFromWinner(outcome.winner, outcome.loser);

    // Winner becomes the creator for the next loop.
    if (outcome.winner !== p1) {
      const tmp = p1;
      p1 = p2;
      p2 = tmp;
    }

    gameNumber++;
    await sleep(800);
  }

  console.log('🎉 Automation finished. Closing browser in 5s...');
  await sleep(5000);
  await browser.close();
}

void main();
