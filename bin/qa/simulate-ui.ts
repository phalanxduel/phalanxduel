import { chromium, Page, BrowserContext } from '@playwright/test';

interface BotPlayer {
  name: string;
  context: BrowserContext;
  page: Page;
}

interface MatchSetup {
  matchId: string;
  mode: 'cumulative' | 'classic';
  startingLifepoints: number;
}

const BASE_URL = process.env.BASE_URL || 'https://play.phalanxduel.com';
const MAX_GAMES = Number(process.env.MAX_GAMES || 3);
const MAX_MOVES_PER_GAME = Number(process.env.MAX_MOVES_PER_GAME || 250);
const FORFEIT_CHANCE = Number(process.env.FORFEIT_CHANCE || 0.02);
// Using a "normal" width for side-by-side but not cramped.
const VIEWPORT_WIDTH = Number(process.env.VIEWPORT_WIDTH || 1280);
const VIEWPORT_HEIGHT = Number(process.env.VIEWPORT_HEIGHT || 1080);
const FIXED_STARTING_LP_RAW = process.env.STARTING_LIFEPOINTS ?? process.env.STARTING_LP;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const PLAYTHROUGH_ID = `pt-${Math.random().toString(36).slice(2, 8)}`;
const rawConsoleLog = console.log.bind(console);
console.log = (...args: unknown[]): void => {
  rawConsoleLog(`[${new Date().toISOString()}]`, `[${PLAYTHROUGH_ID}]`, ...args);
};

/**
 * Attach console and error listeners to a page to capture UI feedback in the test log.
 */
function attachLogger(page: Page, playerName: string): void {
  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    if (type === 'error') {
      console.log(`[BROWSER-ERROR] [${playerName}] ${text}`);
    } else if (type === 'warn') {
      console.log(`[BROWSER-WARN] [${playerName}] ${text}`);
    }
    // Debug/Log are ignored to keep the automation output clean unless it's an error.
  });

  page.on('pageerror', (err) => {
    console.log(`[UNCAUGHT-EXCEPTION] [${playerName}] ${err.message}`);
    if (err.stack) console.log(err.stack);
  });
}

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
    const txt = await page
      .locator('[data-testid="game-over-result"]')
      .first()
      .textContent({ timeout: 500 });
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

function uniqueName(prefix: string): string {
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${suffix}`;
}

async function createAndJoinMatch(creator: BotPlayer, joiner: BotPlayer): Promise<MatchSetup> {
  if (creator.name === joiner.name) {
    throw new Error(`Refusing self-match: both players are named "${creator.name}"`);
  }

  await creator.page.goto(BASE_URL);

  // Verify the backend WebSocket is connected before proceeding.
  await creator.page.waitForSelector('.health-badge--green', { timeout: 15_000 }).catch(() => {
    throw new Error(
      `Backend WebSocket not connected at ${BASE_URL}. ` +
        `Is the dev server running? (health badge never turned green)`,
    );
  });

  await creator.page.fill('[data-testid="lobby-name-input"]', creator.name);
  const modes = ['cumulative', 'classic'] as const;
  const selectedMode = modes[Math.floor(Math.random() * modes.length)]!;
  const requestedStartingLp =
    FIXED_STARTING_LP_RAW !== undefined
      ? Number(FIXED_STARTING_LP_RAW)
      : Math.floor(Math.random() * 500) + 1;
  const startingLifepoints = Math.max(1, Math.min(500, Math.trunc(requestedStartingLp)));
  const modeSelect = creator.page.locator('[data-testid="lobby-damage-mode"]');
  if (await modeSelect.isVisible().catch(() => false)) {
    await modeSelect.selectOption(selectedMode);
    console.log(`🎲 ${creator.name} selected mode: ${selectedMode}`);
  }
  const lpInput = creator.page.locator('[data-testid="lobby-starting-lp"]');
  if (await lpInput.isVisible().catch(() => false)) {
    await lpInput.fill(String(startingLifepoints));
    await lpInput.dispatchEvent('change');
    console.log(
      `🎲 ${creator.name} selected starting LP: ${startingLifepoints}${FIXED_STARTING_LP_RAW !== undefined ? ' (env)' : ' (random)'}`,
    );
  }
  await creator.page.click('[data-testid="lobby-create-btn"]');

  await creator.page.waitForSelector('[data-testid="waiting-match-id"]');
  const rawMatchId = await creator.page.textContent('[data-testid="waiting-match-id"]');
  const matchId = rawMatchId?.trim() ?? '';
  if (!matchId) {
    throw new Error(`Failed to read match ID for creator ${creator.name}`);
  }
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

  return { matchId, mode: selectedMode, startingLifepoints };
}

async function takeAction(page: Page, name: string): Promise<string> {
  const phaseText = await page.textContent('[data-testid="phase-indicator"]');
  console.log(`[${name}] ${phaseText}`);

  if (phaseText?.toLowerCase().includes('deployment')) {
    const handCards = page.locator('.hand-card.playable');
    const count = await handCards.count();

    if (count > 0) {
      const idx = Math.floor(Math.random() * count);
      await handCards.nth(idx).click();
      await page.waitForTimeout(500); // Wait for "pick up"

      const colBtns = page.locator('[data-testid^="player-cell-"].bf-cell.valid-target');
      const colCount = await colBtns.count();
      if (colCount > 0) {
        const colIdx = Math.floor(Math.random() * colCount);
        await colBtns.nth(colIdx).click();
        return `deploy col=${colIdx}`;
      }
    }
    return 'deploy skipped';
  }

  if (phaseText?.toLowerCase().includes('reinforce')) {
    if (await maybeClickForfeit(page, name)) return 'forfeit';

    const handCards = page.locator('.hand-card.reinforce-playable');
    const count = await handCards.count();
    if (count > 0) {
      const idx = Math.floor(Math.random() * count);
      await handCards.nth(idx).click();
      await page.waitForTimeout(500); // Wait for "pick up"

      // Now click a valid reinforcement cell (may be multiple rows in same column)
      const targetCols = page.locator('.bf-cell.reinforce-col.valid-target');
      const targetColCount = await targetCols.count();
      if (targetColCount > 0) {
        const targetIdx = Math.floor(Math.random() * targetColCount);
        await targetCols.nth(targetIdx).click();
        return `reinforce complete`;
      }
    }
    return 'reinforce skipped';
  }

  if (!phaseText?.toLowerCase().includes('attack'))
    return `no-op phase="${phaseText ?? 'unknown'}"`;

  if (await maybeClickForfeit(page, name)) return 'forfeit';

  const attackers = page.locator('[data-testid^="player-cell-r0-c"].bf-cell.occupied');
  const count = await attackers.count();
  console.log(`[${name}] Found ${count} front-row attackers`);

  if (count <= 0) {
    console.log(`[${name}] PASSING turn.`);
    await page.click('[data-testid="combat-pass-btn"]').catch(() => {});
    return 'pass';
  }

  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }

  for (const idx of order) {
    const attacker = attackers.nth(idx);
    await attacker.click();

    await page.waitForTimeout(200);
    const selectedAttacker = page
      .locator('[data-testid^="player-cell-r0-c"].bf-cell.selected')
      .first();
    const selectedCount = await selectedAttacker.count();
    if (selectedCount === 0) {
      continue;
    }

    const selectedTestId = await selectedAttacker.getAttribute('data-testid');
    const colMatch = selectedTestId?.match(/-c(\d+)$/);
    if (!colMatch) {
      continue;
    }
    const col = Number(colMatch[1]);
    console.log(`[${name}] Selected front-row attacker in column ${col}`);

    await page.waitForTimeout(400);
    const target = page.locator(
      `[data-testid="opponent-cell-r0-c${col}"].bf-cell.occupied.valid-target`,
    );
    const targetCount = await target.count();

    if (targetCount > 0) {
      await target.first().click();
      console.log(`[${name}] ATTACK executed in column ${col} (front-row direct target)`);
      return `attack col=${col}`;
    }
  }

  console.log(`[${name}] No legal direct front-row attacks found; passing.`);
  await page.click('[data-testid="combat-pass-btn"]').catch(() => {});
  return 'pass (no legal direct attacks)';
}

async function determineOutcome(
  p1: BotPlayer,
  p2: BotPlayer,
): Promise<{ winner: BotPlayer; loser: BotPlayer } | null> {
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

async function runSingleGame(
  p1: BotPlayer,
  p2: BotPlayer,
  matchId: string,
): Promise<{ winner: BotPlayer; loser: BotPlayer } | null> {
  console.log(`⚔️ Both players joined. Starting game loop... [match ${matchId}]`);
  let moveCount = 0;

  while (moveCount < MAX_MOVES_PER_GAME) {
    await sleep(1500); // Slightly longer to allow splash screens to settle
    moveCount++;

    const p1Over = await isGameOver(p1.page);
    const p2Over = await isGameOver(p2.page);
    if (p1Over || p2Over) {
      console.log('🏁 Game Over detected!');
      return determineOutcome(p1, p2);
    }

    const p1IsActive = await p1.page
      .locator('.turn-indicator.my-turn')
      .isVisible()
      .catch(() => false);
    const p2IsActive = await p2.page
      .locator('.turn-indicator.my-turn')
      .isVisible()
      .catch(() => false);

    if (p1IsActive) {
      console.log(`>>> ${p1.name} is active (playerIndex=${p1.name.includes('Foo') ? 0 : 1})`);
      const action = await takeAction(p1.page, p1.name);
      console.log(`[MOVE ${moveCount}] [match ${matchId}] ${p1.name}: ${action}`);
    } else if (p2IsActive) {
      console.log(`>>> ${p2.name} is active (playerIndex=${p2.name.includes('Bar') ? 1 : 0})`);
      const action = await takeAction(p2.page, p2.name);
      console.log(`[MOVE ${moveCount}] [match ${matchId}] ${p2.name}: ${action}`);
    } else {
      console.log('... Waiting for turn transition (or splash to clear) ...');
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

  // Restart loser
  await loser.page.close();
  loser.page = await loser.context.newPage();
  attachLogger(loser.page, loser.name);
}

async function main(): Promise<void> {
  console.log(`🚀 Launching Phalanx Bot Playthrough on ${BASE_URL}`);

  const browser = await chromium.launch({
    headless: false,
    devtools: process.env['DEVTOOLS'] !== 'false',
    slowMo: 350,
    args: process.env['DEVTOOLS'] !== 'false' ? ['--auto-open-devtools-for-tabs'] : [],
  });

  const p1Context = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
  });
  const p2Context = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
  });

  let p1: BotPlayer = {
    name: uniqueName('Foo'),
    context: p1Context,
    page: await p1Context.newPage(),
  };
  let p2: BotPlayer = {
    name: uniqueName('Bar'),
    context: p2Context,
    page: await p2Context.newPage(),
  };

  // Attach error loggers to initial pages
  attachLogger(p1.page, p1.name);
  attachLogger(p2.page, p2.name);

  console.log(
    `ℹ️ Settings: MAX_GAMES=${MAX_GAMES}, MAX_MOVES_PER_GAME=${MAX_MOVES_PER_GAME}, FORFEIT_CHANCE=${FORFEIT_CHANCE}`,
  );

  let gameNumber = 1;
  while (MAX_GAMES <= 0 || gameNumber <= MAX_GAMES) {
    console.log(`\n===== Game ${gameNumber} =====`);
    const setup = await createAndJoinMatch(p1, p2);
    console.log(
      `🧾 Game ${gameNumber} setup: matchId=${setup.matchId} mode=${setup.mode} startingLP=${setup.startingLifepoints} players=${p1.name} vs ${p2.name}`,
    );
    const outcome = await runSingleGame(p1, p2, setup.matchId);
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
