import '../../scripts/instrument-cli.ts';
import { readFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, Page, BrowserContext, Browser } from '@playwright/test';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { beginQaRun, type QaRun } from './telemetry.js';

interface BotPlayer {
  name: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  slot: number;
  lastSnapshot: PageSnapshot | null;
}

interface MatchSetup {
  gameRunId: string;
  matchId: string;
  mode: 'cumulative' | 'classic';
  startingLifepoints: number;
  creatorSession: StoredSession | null;
  joinerSession: StoredSession | null;
  serverTraceId: string | null;
  qaRun: QaRun;
  reconnectCount: number;
}

interface StoredSession {
  matchId: string;
  playerId: string;
  playerIndex: number;
  playerName: string;
}

interface PageSnapshot {
  url: string;
  health: string | null;
  error: string | null;
  phase: string | null;
  turnIndicator: string | null;
  visibleMatchId: string | null;
  session: StoredSession | null;
}

interface ServerCorrelation {
  traceId: string | null;
  sessionEvents: string[];
}

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
const SERVER_LOG_PATH = resolve(repoRoot, 'logs/server.log');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const MAX_GAMES = Number(process.env['MAX_GAMES'] || 3);
const MAX_MOVES_PER_GAME = Number(process.env['MAX_MOVES_PER_GAME'] || 250);
const STALL_THRESHOLD = Number(process.env['STALL_THRESHOLD'] || 10);
const FORFEIT_CHANCE = Number(process.env['FORFEIT_CHANCE'] || 0.02);
const DEVTOOLS_ENABLED = process.env['DEVTOOLS'] === 'true';
const SLOW_MO_MS = Number(process.env.SLOW_MO_MS || 350);
const WINDOW_WIDTH = Number(process.env.WINDOW_WIDTH || 1600);
const WINDOW_HEIGHT = Number(process.env.WINDOW_HEIGHT || 1440);
const WINDOW_GAP = Number(process.env.WINDOW_GAP || 24);
const WINDOW_TOP = Number(process.env.WINDOW_TOP || 32);
const FIXED_STARTING_LP_RAW = process.env.STARTING_LIFEPOINTS ?? process.env.STARTING_LP;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const PLAYTHROUGH_ID = `pt-${Math.random().toString(36).slice(2, 8)}`;
const rawConsoleLog = console.log.bind(console);
console.log = (...args: unknown[]): void => {
  rawConsoleLog(`[${new Date().toISOString()}]`, `[${PLAYTHROUGH_ID}]`, ...args);
};

function withQaRunId(url: string, qaRunId: string): string {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set('qaRunId', qaRunId);
  return nextUrl.toString();
}

function logGame(gameRunId: string, ...args: unknown[]): void {
  console.log(`[${gameRunId}]`, ...args);
}

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
  });
  page.on('dialog', async (dialog) => {
    // Auto-accept confirmation dialogs (forfeit, lethal pass)
    console.log(`[DIALOG] [${playerName}] ${dialog.type()}: ${dialog.message()}`);
    await dialog.accept();
  });
  page.on('pageerror', (err) => {
    console.log(`[UNCAUGHT-EXCEPTION] [${playerName}] ${err.message}`);
    if (err.stack) console.log(err.stack);
  });
}

async function capturePageSnapshot(page: Page): Promise<PageSnapshot | null> {
  if (page.isClosed()) return null;

  try {
    return await page.evaluate(() => {
      const text = (selector: string): string | null => {
        const el = document.querySelector(selector);
        const value = el?.textContent?.replace(/\s+/g, ' ').trim();
        return value ? value : null;
      };

      let session: StoredSession | null = null;
      try {
        const raw = sessionStorage.getItem('phalanx_session');
        session = raw ? (JSON.parse(raw) as StoredSession) : null;
      } catch {
        session = null;
      }

      return {
        url: window.location.href,
        health: text('.health-badge'),
        error: text('.error-banner'),
        phase: text('[data-testid="phase-indicator"]'),
        turnIndicator: text('[data-testid="turn-indicator"]'),
        visibleMatchId:
          text('[data-testid="waiting-match-id"]') ??
          text('[data-testid="waiting-watch-match-id"]'),
        session,
      };
    });
  } catch {
    return null;
  }
}

function formatSession(session: StoredSession | null): string {
  if (!session) return 'none';
  return `${session.matchId}/${session.playerId}/p${session.playerIndex}/${session.playerName}`;
}

function describeSnapshot(snapshot: PageSnapshot | null): string {
  if (!snapshot) return 'snapshot=unavailable';
  return [
    `url=${snapshot.url}`,
    `health=${snapshot.health ?? 'n/a'}`,
    `error=${snapshot.error ?? 'none'}`,
    `phase=${snapshot.phase ?? 'n/a'}`,
    `turn=${snapshot.turnIndicator ?? 'n/a'}`,
    `visibleMatch=${snapshot.visibleMatchId ?? 'n/a'}`,
    `session=${formatSession(snapshot.session)}`,
  ].join(' ');
}

async function logSnapshotIfChanged(
  player: BotPlayer,
  gameRunId: string,
  reason: string,
  qaRun?: QaRun,
  onReconnectSignal?: () => void,
): Promise<PageSnapshot | null> {
  const snapshot = await capturePageSnapshot(player.page);
  const nextFingerprint = snapshot ? JSON.stringify(snapshot) : 'null';
  const prevFingerprint = player.lastSnapshot ? JSON.stringify(player.lastSnapshot) : 'null';

  if (nextFingerprint !== prevFingerprint) {
    logGame(gameRunId, `[SNAPSHOT] [${player.name}] [${reason}] ${describeSnapshot(snapshot)}`);
    player.lastSnapshot = snapshot;
    if (snapshot?.error && /reconnect|disconnected/i.test(snapshot.error)) {
      onReconnectSignal?.();
      qaRun?.recordReconnect(player.name, 'ui_error_banner', {
        'match.id': snapshot.session?.matchId,
        'qa.snapshot_reason': reason,
      });
    }
  }

  return snapshot;
}

async function waitForStoredSession(page: Page, timeout = 10_000): Promise<StoredSession | null> {
  try {
    await page.waitForFunction(() => !!sessionStorage.getItem('phalanx_session'), undefined, {
      timeout,
    });
  } catch {
    return null;
  }

  return await capturePageSnapshot(page).then((snapshot) => snapshot?.session ?? null);
}

async function readServerCorrelation(matchId: string): Promise<ServerCorrelation> {
  try {
    const raw = await readFile(SERVER_LOG_PATH, 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    const sessionEvents: string[] = [];
    let traceId: string | null = null;

    for (const line of lines) {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(line) as Record<string, unknown>;
      } catch {
        continue;
      }

      if (parsed['matchId'] !== matchId) continue;

      const parsedTraceId =
        typeof parsed['trace_id'] === 'string' && parsed['trace_id'].length > 0
          ? parsed['trace_id']
          : null;

      if (parsed['event'] === 'match_session' && typeof parsed['sessionEvent'] === 'string') {
        sessionEvents.push(parsed['sessionEvent']);
        if (!traceId && parsedTraceId) {
          traceId = parsedTraceId;
        }
      }

      if (!traceId && parsed['event'] === 'game_action' && parsedTraceId) {
        traceId = parsedTraceId;
      }
    }

    return { traceId, sessionEvents };
  } catch {
    return { traceId: null, sessionEvents: [] };
  }
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
  await forfeitBtn.click();
  return true;
}

function uniqueName(prefix: string): string {
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${suffix}`;
}

async function createAndJoinMatch(creator: BotPlayer, joiner: BotPlayer): Promise<MatchSetup> {
  const gameRunId = `${PLAYTHROUGH_ID}:g${Math.random().toString(36).slice(2, 6)}`;
  const qaRun = beginQaRun({
    tool: 'simulate-ui',
    runId: gameRunId,
    baseUrl: BASE_URL,
    p1: creator.name,
    p2: joiner.name,
    headed: true,
  });

  if (creator.name === joiner.name) {
    throw new Error(`Refusing self-match: both players are named "${creator.name}"`);
  }

  await creator.page.goto(withQaRunId(BASE_URL, qaRun.runId));
  creator.lastSnapshot = null;
  joiner.lastSnapshot = null;

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
  await logSnapshotIfChanged(creator, gameRunId, 'creator_waiting', qaRun);
  const rawMatchId = await creator.page.textContent('[data-testid="waiting-match-id"]');
  const matchId = rawMatchId?.trim() ?? '';
  if (!matchId) {
    throw new Error(`Failed to read match ID for creator ${creator.name}`);
  }
  qaRun.bindMatch(matchId, {
    'game.damage_mode': selectedMode,
    'game.starting_lp': startingLifepoints,
  });
  logGame(gameRunId, `📦 Match Created by ${creator.name}: "${matchId}"`);

  const joinUrl = new URL(withQaRunId(BASE_URL, qaRun.runId));
  joinUrl.searchParams.set('match', matchId);
  logGame(gameRunId, `🔗 ${joiner.name} joining via: ${joinUrl}`);
  await joiner.page.goto(joinUrl.toString());
  const joinBtn = joiner.page
    .locator(
      'button:has-text("Accept & Enter Match"), button:has-text("ACCEPT_ENGAGEMENT"), [data-testid="lobby-join-accept-btn"]',
    )
    .first();
  await joinBtn.waitFor({ state: 'visible' });
  await joiner.page.fill('[data-testid="lobby-name-input"], .name-input', joiner.name);
  await joinBtn.click();
  await Promise.all([
    creator.page.waitForSelector('[data-testid="game-layout"], [data-testid="game-over"]', {
      timeout: 10_000,
    }),
    joiner.page.waitForSelector('[data-testid="game-layout"], [data-testid="game-over"]', {
      timeout: 10_000,
    }),
  ]);

  const [creatorSession, joinerSession] = await Promise.all([
    waitForStoredSession(creator.page),
    waitForStoredSession(joiner.page),
  ]);
  const correlation = await readServerCorrelation(matchId);

  await Promise.all([
    logSnapshotIfChanged(creator, gameRunId, 'creator_joined', qaRun),
    logSnapshotIfChanged(joiner, gameRunId, 'joiner_joined', qaRun),
  ]);
  qaRun.annotate('qa.sessions.bound', {
    'qa.creator_player_id': creatorSession?.playerId,
    'qa.joiner_player_id': joinerSession?.playerId,
    'qa.server_trace_present': Boolean(correlation.traceId),
  });
  logGame(
    gameRunId,
    `🧾 Correlation matchId=${matchId} traceId=${correlation.traceId ?? 'pending'} creatorSession=${formatSession(creatorSession)} joinerSession=${formatSession(joinerSession)} sessionEvents=${correlation.sessionEvents.join(',') || 'none'}`,
  );

  return {
    gameRunId,
    matchId,
    mode: selectedMode,
    startingLifepoints,
    creatorSession,
    joinerSession,
    serverTraceId: correlation.traceId,
    qaRun,
    reconnectCount: 0,
  };
}

async function takeAction(page: Page, name: string): Promise<string> {
  const phaseText = await page.textContent('[data-testid="phase-indicator"]');
  console.log(`[${name}] ${phaseText}`);

  const phaseLower = phaseText?.toLowerCase() ?? '';

  if (phaseLower.includes('deployment') || phaseLower.includes('deploy')) {
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

  if (phaseLower.includes('reinforce')) {
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

    const skipBtn = page.locator('[data-testid="combat-skip-reinforce-btn"]');
    if ((await skipBtn.count()) > 0) {
      await skipBtn.click();
      return 'reinforce skipped (button clicked)';
    }

    return 'reinforce skipped (no button found)';
  }

  if (!phaseLower.includes('attack') && !phaseLower.includes('combat'))
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
  setup: MatchSetup,
): Promise<{ winner: BotPlayer; loser: BotPlayer } | null> {
  logGame(
    setup.gameRunId,
    `⚔️ Both players joined. Starting game loop... [match ${setup.matchId}] [trace ${setup.serverTraceId ?? 'pending'}]`,
  );
  let moveCount = 0;
  let idleLoopCount = 0;
  let stallSignalSent = false;

  while (moveCount < MAX_MOVES_PER_GAME) {
    await sleep(1500); // Slightly longer to allow splash screens to settle
    moveCount++;
    const [p1Snapshot, p2Snapshot] = await Promise.all([
      logSnapshotIfChanged(p1, setup.gameRunId, `loop-${moveCount}`, setup.qaRun, () => {
        setup.reconnectCount++;
      }),
      logSnapshotIfChanged(p2, setup.gameRunId, `loop-${moveCount}`, setup.qaRun, () => {
        setup.reconnectCount++;
      }),
    ]);
    setup.qaRun.annotate('qa.loop', { 'game.turn_iteration': moveCount });

    const p1Over = await isGameOver(p1.page);
    const p2Over = await isGameOver(p2.page);
    if (p1Over || p2Over) {
      logGame(setup.gameRunId, '🏁 Game Over detected!');
      return determineOutcome(p1, p2);
    }

    const p1IsActive = await p1.page
      .locator('.status-my-turn')
      .isVisible()
      .catch(() => false);
    const p2IsActive = await p2.page
      .locator('.status-my-turn')
      .isVisible()
      .catch(() => false);

    if (p1IsActive) {
      idleLoopCount = 0;
      stallSignalSent = false;
      logGame(
        setup.gameRunId,
        `>>> ${p1.name} is active (playerIndex=${p1.name.includes('Foo') ? 0 : 1})`,
      );
      const action = await takeAction(p1.page, p1.name);
      setup.qaRun.annotate('qa.action', { 'qa.actor': p1.name, 'game.turn_iteration': moveCount });
      logGame(
        setup.gameRunId,
        `[MOVE ${moveCount}] [match ${setup.matchId}] [trace ${setup.serverTraceId ?? 'pending'}] ${p1.name}: ${action}`,
      );
    } else if (p2IsActive) {
      idleLoopCount = 0;
      stallSignalSent = false;
      logGame(
        setup.gameRunId,
        `>>> ${p2.name} is active (playerIndex=${p2.name.includes('Bar') ? 1 : 0})`,
      );
      const action = await takeAction(p2.page, p2.name);
      setup.qaRun.annotate('qa.action', { 'qa.actor': p2.name, 'game.turn_iteration': moveCount });
      logGame(
        setup.gameRunId,
        `[MOVE ${moveCount}] [match ${setup.matchId}] [trace ${setup.serverTraceId ?? 'pending'}] ${p2.name}: ${action}`,
      );
    } else {
      idleLoopCount++;
      if (idleLoopCount >= STALL_THRESHOLD) {
        logGame(setup.gameRunId, `🚨 Stalled for ${idleLoopCount} iterations. Aborting game.`);
        return null;
      }
      const p1Phase = await p1.page
        .textContent('[data-testid="phase-indicator"]')
        .catch(() => 'n/a');
      const p2Phase = await p2.page
        .textContent('[data-testid="phase-indicator"]')
        .catch(() => 'n/a');
      const p1Turn = await p1.page.textContent('[data-testid="turn-indicator"]').catch(() => 'n/a');
      const p2Turn = await p2.page.textContent('[data-testid="turn-indicator"]').catch(() => 'n/a');

      if (idleLoopCount >= 5 && !stallSignalSent) {
        setup.qaRun.recordPattern(
          'ui_turn_stall',
          {
            'match.id': setup.matchId,
            'qa.idle_loop_count': idleLoopCount,
            'qa.p1_error': p1Snapshot?.error,
            'qa.p2_error': p2Snapshot?.error,
            'qa.p1_phase': p1Phase,
            'qa.p2_phase': p2Phase,
            'qa.p1_turn': p1Turn,
            'qa.p2_turn': p2Turn,
          },
          SeverityNumber.WARN,
          'WARN',
        );
        stallSignalSent = true;
      }
      logGame(
        setup.gameRunId,
        `... Waiting for turn transition ... P1: [${p1Phase}] [${p1Turn}] P2: [${p2Phase}] [${p2Turn}]`,
      );
    }
  }

  logGame(setup.gameRunId, `⏹️ Reached move limit (${MAX_MOVES_PER_GAME}) before game over.`);
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
  loser.lastSnapshot = null;
}

async function checkPortReachable(url: string): Promise<void> {
  const parsed = new URL(url);
  const host = parsed.hostname;
  const port = Number(parsed.port) || (parsed.protocol === 'https:' ? 443 : 80);

  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port }, () => {
      socket.destroy();
      resolve();
    });
    socket.setTimeout(3000);
    socket.on('timeout', () => {
      socket.destroy();
      reject(
        new Error(
          `Port ${port} on ${host} is not reachable (timeout).\n` +
            `Is the dev server running? Try: pnpm dev:server`,
        ),
      );
    });
    socket.on('error', (err: NodeJS.ErrnoException) => {
      socket.destroy();
      if (err.code === 'ECONNREFUSED') {
        reject(
          new Error(
            `Port ${port} on ${host} is not listening (ECONNREFUSED).\n` +
              `Is the dev server running? Try: pnpm dev:server`,
          ),
        );
      } else {
        reject(new Error(`Cannot reach ${host}:${port} — ${err.message}`));
      }
    });
  });
}

async function main(): Promise<void> {
  try {
    console.log(`🚀 Launching Phalanx Bot Playthrough on ${BASE_URL}`);

    await checkPortReachable(BASE_URL);

    const launchPlayer = async (name: string, slot: number): Promise<BotPlayer> => {
      const windowX = slot * (WINDOW_WIDTH + WINDOW_GAP);
      const isHeadless = process.env.HEADLESS !== 'false';
      const browser = await chromium.launch({
        headless: isHeadless,
        devtools: !isHeadless && DEVTOOLS_ENABLED,
        slowMo: SLOW_MO_MS,
        args: [
          `--window-size=${WINDOW_WIDTH},${WINDOW_HEIGHT}`,
          `--window-position=${windowX},${WINDOW_TOP}`,
          ...(!isHeadless && DEVTOOLS_ENABLED ? ['--auto-open-devtools-for-tabs'] : []),
        ],
      });
      const context = await browser.newContext({ viewport: null });
      const page = await context.newPage();
      attachLogger(page, name);
      return {
        name,
        browser,
        context,
        page,
        slot,
        lastSnapshot: null,
      };
    };

    let p1: BotPlayer = await launchPlayer(uniqueName('Foo'), 0);
    let p2: BotPlayer = await launchPlayer(uniqueName('Bar'), 1);

    console.log(
      `ℹ️ Settings: MAX_GAMES=${MAX_GAMES}, MAX_MOVES_PER_GAME=${MAX_MOVES_PER_GAME}, FORFEIT_CHANCE=${FORFEIT_CHANCE}, WINDOW=${WINDOW_WIDTH}x${WINDOW_HEIGHT}, DEVTOOLS=${DEVTOOLS_ENABLED}, SLOW_MO_MS=${SLOW_MO_MS}`,
    );

    let gameNumber = 1;
    while (MAX_GAMES <= 0 || gameNumber <= MAX_GAMES) {
      console.log(`\n===== Game ${gameNumber} =====`);
      const setup = await createAndJoinMatch(p1, p2);
      logGame(
        setup.gameRunId,
        `🧾 Game ${gameNumber} setup: matchId=${setup.matchId} traceId=${setup.serverTraceId ?? 'pending'} mode=${setup.mode} startingLP=${setup.startingLifepoints} players=${p1.name} vs ${p2.name}`,
      );
      const outcome = await runSingleGame(p1, p2, setup);
      if (!outcome) {
        logGame(setup.gameRunId, '❌ No decisive outcome detected; stopping.');
        setup.qaRun.recordPattern('no_decisive_outcome', undefined, SeverityNumber.WARN, 'WARN');
        setup.qaRun.finish({
          status: 'failure',
          durationMs: 0,
          failureReason: 'no_decisive_outcome',
          failureMessage: 'UI playthrough stopped without a decisive outcome',
        });
        break;
      }

      logGame(setup.gameRunId, `✅ Winner: ${outcome.winner.name} | Loser: ${outcome.loser.name}`);
      setup.qaRun.finish({
        status: 'success',
        durationMs: 0,
        outcomeText: `${outcome.winner.name} defeated ${outcome.loser.name}`,
        reconnectCount: setup.reconnectCount,
      });
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

    console.log('🎉 Automation finished. Closing browsers in 5s...');
    await sleep(5000);
    await Promise.all([
      p1.context.close().catch(() => {}),
      p2.context.close().catch(() => {}),
      p1.browser.close().catch(() => {}),
      p2.browser.close().catch(() => {}),
    ]);
  } catch (err) {
    console.error('FATAL ERROR in playthrough script:');
    console.error(err);
    process.exit(1);
  }
}

void main();
