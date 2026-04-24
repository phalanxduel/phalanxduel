import '../../scripts/instrument-cli.ts';
import { readFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, Page, BrowserContext, Browser, type Locator } from '@playwright/test';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { beginQaRun, type QaRun } from './telemetry.js';

type UiScenario = 'guest-pvp' | 'auth-pvp' | 'guest-pvb' | 'auth-pvb';
type BotOpponent = 'bot-random' | 'bot-heuristic';

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
  matchKind: 'pvp' | 'pvb';
  mode: 'cumulative' | 'classic';
  startingLifepoints: number;
  creatorSession: StoredSession | null;
  joinerSession: StoredSession | null;
  serverTraceId: string | null;
  qaRun: QaRun;
  reconnectCount: number;
  spectator: BotPlayer | null;
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
  spectatorBanner: string | null;
  session: StoredSession | null;
}

interface ServerCorrelation {
  traceId: string | null;
  sessionEvents: string[];
}

interface AuthAccount {
  email: string;
  password: string;
  gamertag: string;
}

interface CliOptions {
  baseUrl: string;
  maxGames: number;
  maxMovesPerGame: number;
  stallThreshold: number;
  forfeitChance: number;
  devtoolsEnabled: boolean;
  slowMoMs: number;
  windowWidth: number;
  windowHeight: number;
  windowGap: number;
  windowTop: number;
  telemetryEnabled: boolean;
  fixedStartingLpRaw?: string;
  headed: boolean;
  spectator: boolean;
  scenario: UiScenario;
  botOpponent: BotOpponent;
}

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
const SERVER_LOG_PATH = resolve(repoRoot, 'logs/server.log');

function parseScenario(value: string | undefined): UiScenario {
  switch (value) {
    case 'guest-pvp':
    case 'auth-pvp':
    case 'guest-pvb':
    case 'auth-pvb':
      return value;
    default:
      return 'guest-pvp';
  }
}

function parseBotOpponent(value: string | undefined): BotOpponent {
  return value === 'bot-heuristic' ? 'bot-heuristic' : 'bot-random';
}

function showHelp(): void {
  console.log(`
PHALANX-QA-PLAYTHROUGH-UI(1) - Headed browser gameplay automation

SYNOPSIS
    tsx bin/qa/simulate-ui.ts [OPTIONS]

OPTIONS
    --base-url URL
        Target client URL (default: http://127.0.0.1:5173)

    --scenario guest-pvp|auth-pvp|guest-pvb|auth-pvb
        Choose guest/auth identity mode and PvP/PvB match shape.

    --bot-opponent bot-random|bot-heuristic
        Bot strategy used for PvB scenarios (default: bot-random).

    --max-games NUMBER
    --max-moves NUMBER
    --starting-lp NUMBER
    --stall-threshold NUMBER
    --forfeit-chance NUMBER
    --slow-mo-ms NUMBER
    --window-width NUMBER
    --window-height NUMBER
    --window-gap NUMBER
    --window-top NUMBER
    --devtools
    --no-devtools
    --telemetry
    --no-telemetry
    --spectator
    --no-spectator
    --headed
    --headless
    --help
`);
}

function parseArgs(argv: string[]): CliOptions | null {
  if (argv.includes('--help') || argv.includes('-h')) {
    showHelp();
    return null;
  }

  const options: CliOptions = {
    baseUrl: process.env.BASE_URL || 'http://127.0.0.1:5173',
    maxGames: Number(process.env['MAX_GAMES'] || 3),
    maxMovesPerGame: Number(process.env['MAX_MOVES_PER_GAME'] || 250),
    stallThreshold: Number(process.env['STALL_THRESHOLD'] || 10),
    forfeitChance: Number(process.env['FORFEIT_CHANCE'] || 0.02),
    devtoolsEnabled: process.env['DEVTOOLS'] === 'true',
    slowMoMs: Number(process.env.SLOW_MO_MS || 350),
    windowWidth: Number(process.env.WINDOW_WIDTH || 1600),
    windowHeight: Number(process.env.WINDOW_HEIGHT || 1440),
    windowGap: Number(process.env.WINDOW_GAP || 24),
    windowTop: Number(process.env.WINDOW_TOP || 32),
    telemetryEnabled: process.env.NO_TELEMETRY !== 'true',
    fixedStartingLpRaw: process.env.STARTING_LIFEPOINTS ?? process.env.STARTING_LP,
    headed: process.env.HEADLESS === 'false',
    spectator: process.env.SPECTATOR === 'true',
    scenario: parseScenario(process.env.QA_UI_SCENARIO),
    botOpponent: parseBotOpponent(process.env.BOT_OPPONENT),
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--base-url' && next) options.baseUrl = next;
    if (arg === '--scenario' && next) options.scenario = parseScenario(next);
    if (arg === '--bot-opponent' && next) options.botOpponent = parseBotOpponent(next);
    if (arg === '--max-games' && next) options.maxGames = Math.max(1, Number(next));
    if (arg === '--max-moves' && next) options.maxMovesPerGame = Math.max(1, Number(next));
    if (arg === '--starting-lp' && next) options.fixedStartingLpRaw = next;
    if (arg === '--stall-threshold' && next) options.stallThreshold = Math.max(1, Number(next));
    if (arg === '--forfeit-chance' && next) {
      options.forfeitChance = Math.max(0, Math.min(1, Number(next)));
    }
    if (arg === '--slow-mo-ms' && next) options.slowMoMs = Math.max(0, Number(next));
    if (arg === '--window-width' && next) options.windowWidth = Math.max(320, Number(next));
    if (arg === '--window-height' && next) options.windowHeight = Math.max(320, Number(next));
    if (arg === '--window-gap' && next) options.windowGap = Math.max(0, Number(next));
    if (arg === '--window-top' && next) options.windowTop = Math.max(0, Number(next));
    if (arg === '--devtools') options.devtoolsEnabled = true;
    if (arg === '--no-devtools') options.devtoolsEnabled = false;
    if (arg === '--telemetry') options.telemetryEnabled = true;
    if (arg === '--no-telemetry') options.telemetryEnabled = false;
    if (arg === '--spectator') options.spectator = true;
    if (arg === '--no-spectator') options.spectator = false;
    if (arg === '--headed') options.headed = true;
    if (arg === '--headless') options.headed = false;
  }

  return options;
}

const OPTIONS = parseArgs(process.argv.slice(2));
if (!OPTIONS) {
  process.exit(0);
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const PLAYTHROUGH_ID = `pt-${Math.random().toString(36).slice(2, 8)}`;
const rawConsoleLog = console.log.bind(console);
console.log = (...args: unknown[]): void => {
  rawConsoleLog(`[${new Date().toISOString()}]`, `[${PLAYTHROUGH_ID}]`, ...args);
};

function withRunParams(url: string, qaRunId: string): string {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set('qaRunId', qaRunId);
  nextUrl.searchParams.set('telemetry', OPTIONS.telemetryEnabled ? 'on' : 'off');
  return nextUrl.toString();
}

function logGame(gameRunId: string, ...args: unknown[]): void {
  console.log(`[${gameRunId}]`, ...args);
}

async function clickGameElement(locator: Locator): Promise<void> {
  try {
    await locator.click({ timeout: 5_000 });
  } catch {
    await locator.click({ force: true, timeout: 5_000 });
  }
}

/**
 * Attach console and error listeners to a page to capture UI feedback in the test log.
 */
function attachLogger(page: Page, playerName: string): void {
  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    console.log(`[BROWSER-${type.toUpperCase()}] [${playerName}] ${text}`);
  });
  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      console.log(
        `[BROWSER-NET-ERROR] [${playerName}] ${response.request().method()} ${response.url()} -> ${status}`,
      );
    }
  });
  page.on('requestfailed', (request) => {
    console.log(
      `[BROWSER-NET-FAIL] [${playerName}] ${request.method()} ${request.url()} -> ${request.failure()?.errorText}`,
    );
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

      const gameLayout = document.querySelector('[data-testid="game-layout"]');

      return {
        url: window.location.href,
        health: text('.health-badge'),
        error: text('.error-banner'),
        phase: text('[data-testid="phase-indicator"]'),
        turnIndicator: text('[data-testid="turn-indicator"]'),
        visibleMatchId:
          text('[data-testid="waiting-match-id"]') ??
          text('[data-testid="waiting-watch-match-id"]') ??
          gameLayout?.getAttribute('data-match-id') ??
          null,
        spectatorBanner: text('[data-testid="spectator-banner"]'),
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
    `spectator=${snapshot.spectatorBanner ?? 'no'}`,
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

async function readCurrentMatchId(page: Page, timeout = 10_000): Promise<string | null> {
  const uuidSource = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

  try {
    await page.waitForFunction(
      (uuidPatternSource) => {
        const uuidPattern = new RegExp(uuidPatternSource, 'i');
        const raw = sessionStorage.getItem('phalanx_session');
        if (raw && uuidPattern.test(raw)) return true;

        const values: string[] = [
          window.location.href,
          document.body?.textContent ?? '',
          document.querySelector('[data-testid="waiting-match-id"]')?.textContent ?? '',
          document.querySelector('[data-testid="waiting-watch-match-id"]')?.textContent ?? '',
          document.querySelector('[data-testid="game-layout"]')?.getAttribute('data-match-id') ??
            '',
        ];

        for (const el of Array.from(document.querySelectorAll('[data-match-id]'))) {
          values.push(el.getAttribute('data-match-id') ?? '');
        }

        return values.some((value) => uuidPattern.test(value));
      },
      uuidSource,
      { timeout },
    );
  } catch {
    return null;
  }

  const snapshot = await capturePageSnapshot(page);
  if (snapshot?.session?.matchId) return snapshot.session.matchId;
  if (snapshot?.visibleMatchId) {
    const match = snapshot.visibleMatchId.match(new RegExp(uuidSource, 'i'));
    if (match) return match[0];
  }

  return await page.evaluate((uuidPatternSource) => {
    const uuidPattern = new RegExp(uuidPatternSource, 'i');
    const candidates: string[] = [
      window.location.href,
      document.body?.textContent ?? '',
      document.querySelector('[data-testid="waiting-match-id"]')?.textContent ?? '',
      document.querySelector('[data-testid="waiting-watch-match-id"]')?.textContent ?? '',
      document.querySelector('[data-testid="game-layout"]')?.getAttribute('data-match-id') ?? '',
    ];

    for (const storage of [sessionStorage, localStorage]) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) candidates.push(storage.getItem(key) ?? '');
      }
    }

    for (const el of Array.from(document.querySelectorAll('[data-match-id]'))) {
      candidates.push(el.getAttribute('data-match-id') ?? '');
    }

    for (const candidate of candidates) {
      const match = candidate.match(uuidPattern);
      if (match) return match[0];
    }

    return null;
  }, uuidSource);
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
  if (Math.random() >= OPTIONS.forfeitChance) return false;
  const forfeitBtn = page.locator('[data-testid="combat-forfeit-btn"]');
  if (!(await forfeitBtn.isVisible().catch(() => false))) return false;

  console.log(`[${name}] FORFEIT triggered (chance=${OPTIONS.forfeitChance}).`);
  await forfeitBtn.click();
  return true;
}

async function clickCommandButton(page: Page, testId: string, label: string): Promise<boolean> {
  const drawer = page.locator('.phx-command-drawer').first();
  if (await drawer.isVisible().catch(() => false)) {
    const isOpen = await drawer
      .evaluate((el) => el.classList.contains('is-open'))
      .catch(() => true);
    if (!isOpen) {
      await page
        .locator('.phx-drawer-handle')
        .first()
        .click()
        .catch(() => {});
      await page.waitForTimeout(100);
    }
  }

  return await page
    .locator(`[data-testid="${testId}"], .phx-drawer-content button:has-text("${label}")`)
    .first()
    .click()
    .then(() => true)
    .catch(() => false);
}

function uniqueName(prefix: string): string {
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${suffix}`;
}

function buildAuthAccount(prefix: string): AuthAccount {
  const slug = Math.random().toString(36).slice(2, 8);
  const gamertag = `${prefix}${slug}`.slice(0, 20);
  return {
    email: `${PLAYTHROUGH_ID}-${slug}@example.test`,
    password: 'Password123!',
    gamertag,
  };
}

async function waitForLobbyReady(page: Page, qaRunId: string): Promise<void> {
  await page.goto(withRunParams(OPTIONS.baseUrl, qaRunId));
  await page.waitForFunction(
    () => {
      const badges = document.querySelectorAll('.health-badge');
      return Array.from(badges).some((b) => b.classList.contains('health-badge--green'));
    },
    { timeout: 15_000 },
  );
}

async function ensureGuestName(page: Page, name: string): Promise<void> {
  const nameInput = page.locator('[data-testid="lobby-name-input"]');
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill(name);
  }
}

async function authenticatePlayer(
  page: Page,
  account: AuthAccount,
  gameRunId: string,
): Promise<void> {
  logGame(gameRunId, `Authenticating ${account.gamertag} (${account.email})`);
  await page
    .locator('[data-testid="userbar-authorize-btn"], button:has-text("AUTHORIZE")')
    .first()
    .click();
  await page.locator('[data-testid="auth-toggle-mode-btn"], .btn-text').first().click();
  await page
    .locator('[data-testid="auth-gamertag-input"], #auth-gamertag')
    .first()
    .fill(account.gamertag);
  await page.locator('[data-testid="auth-email-input"], #auth-email').first().fill(account.email);
  await page
    .locator('[data-testid="auth-password-input"], #auth-password')
    .first()
    .fill(account.password);
  await page.locator('[data-testid="auth-submit-btn"], button[type="submit"]').first().click();

  await page.waitForTimeout(500);
  const authError = page.locator('.auth-error');
  if (await authError.isVisible().catch(() => false)) {
    throw new Error(`Authentication failed for ${account.email}: ${await authError.textContent()}`);
  }

  await page
    .waitForSelector('[data-testid="userbar-authorize-btn"]', {
      state: 'detached',
      timeout: 15_000,
    })
    .catch(async () => {
      await page
        .locator('[data-testid="userbar-authorize-btn"], button:has-text("AUTHORIZE")')
        .first()
        .waitFor({ state: 'hidden', timeout: 15_000 });
    });
}

async function configureMatchOptions(
  page: Page,
  playerName: string,
): Promise<{
  mode: 'cumulative' | 'classic';
  startingLifepoints: number;
}> {
  await ensureGuestName(page, playerName);

  const modes = ['cumulative', 'classic'] as const;
  const selectedMode = modes[Math.floor(Math.random() * modes.length)]!;
  const requestedStartingLp =
    OPTIONS.fixedStartingLpRaw !== undefined
      ? Number(OPTIONS.fixedStartingLpRaw)
      : Math.floor(Math.random() * 500) + 1;
  const startingLifepoints = Math.max(1, Math.min(500, Math.trunc(requestedStartingLp)));

  const advancedToggle = page.locator('[data-testid="advanced-options-toggle"]');
  if (await advancedToggle.isVisible().catch(() => false)) {
    await advancedToggle.click();
  }

  const modeSelect = page.locator('[data-testid="lobby-damage-mode"]');
  if (await modeSelect.isVisible().catch(() => false)) {
    await modeSelect.selectOption(selectedMode);
  }
  const lpInput = page.locator('[data-testid="lobby-starting-lp"]');
  if (await lpInput.isVisible().catch(() => false)) {
    await lpInput.fill(String(startingLifepoints));
    await lpInput.dispatchEvent('change');
  }

  return { mode: selectedMode, startingLifepoints };
}

async function createAndJoinMatch(
  creator: BotPlayer,
  joiner: BotPlayer,
  creatorAccount: AuthAccount | null,
  joinerAccount: AuthAccount | null,
): Promise<MatchSetup> {
  const gameRunId = `${PLAYTHROUGH_ID}:g${Math.random().toString(36).slice(2, 6)}`;
  const qaRun = beginQaRun({
    tool: 'simulate-ui',
    runId: gameRunId,
    baseUrl: OPTIONS.baseUrl,
    p1: creator.name,
    p2: joiner.name,
    headed: true,
  });

  if (creator.name === joiner.name) {
    throw new Error(`Refusing self-match: both players are named "${creator.name}"`);
  }

  await waitForLobbyReady(creator.page, qaRun.runId);
  if (creatorAccount) {
    await authenticatePlayer(creator.page, creatorAccount, gameRunId);
  }

  const { mode: selectedMode, startingLifepoints } = await configureMatchOptions(
    creator.page,
    creator.name,
  );

  if (OPTIONS.scenario.endsWith('pvb')) {
    const botButtonTestId =
      OPTIONS.botOpponent === 'bot-heuristic' ? 'lobby-bot-btn-med' : 'lobby-bot-btn-easy';
    const botButtonLabel = OPTIONS.botOpponent === 'bot-heuristic' ? 'BOT_MED' : 'BOT_EASY';
    await creator.page
      .locator(`[data-testid="${botButtonTestId}"], button:has-text("${botButtonLabel}")`)
      .first()
      .click();
    await creator.page.waitForSelector('[data-testid="game-layout"], [data-testid="game-over"]', {
      timeout: 15_000,
    });

    const creatorSession = await waitForStoredSession(creator.page);
    const matchId = creatorSession?.matchId ?? (await readCurrentMatchId(creator.page)) ?? '';
    if (!matchId) {
      throw new Error('Failed to recover bot match session after creation');
    }

    const correlation = await readServerCorrelation(matchId);
    qaRun.bindMatch(matchId, {
      'game.damage_mode': selectedMode,
      'game.starting_lp': startingLifepoints,
      'game.opponent': OPTIONS.botOpponent,
    });

    await logSnapshotIfChanged(creator, gameRunId, 'creator_bot_joined', qaRun);
    return {
      gameRunId,
      matchId,
      matchKind: 'pvb',
      mode: selectedMode,
      startingLifepoints,
      creatorSession,
      joinerSession: null,
      serverTraceId: correlation.traceId,
      qaRun,
      reconnectCount: 0,
      spectator: null,
    };
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

  await waitForLobbyReady(joiner.page, qaRun.runId);
  if (joinerAccount) {
    await authenticatePlayer(joiner.page, joinerAccount, gameRunId);
  }
  await ensureGuestName(joiner.page, joiner.name);
  await joiner.page
    .locator('[data-testid="lobby-join-input"], input[placeholder="MATCH_ID"]')
    .first()
    .fill(matchId);
  await joiner.page
    .locator('[data-testid="lobby-join-btn"], button:has-text("JOIN")')
    .first()
    .click();
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
    matchKind: 'pvp',
    mode: selectedMode,
    startingLifepoints,
    creatorSession,
    joinerSession,
    serverTraceId: correlation.traceId,
    qaRun,
    reconnectCount: 0,
    spectator: null,
  };
}

async function joinSpectator(
  spectator: BotPlayer,
  matchId: string,
  qaRunId: string,
  gameRunId: string,
): Promise<void> {
  const watchUrl = new URL(withRunParams(OPTIONS.baseUrl, qaRunId));
  watchUrl.searchParams.set('watch', matchId);
  logGame(gameRunId, `📺 ${spectator.name} watching via: ${watchUrl}`);
  await spectator.page.goto(watchUrl.toString());
  await spectator.page.waitForSelector(
    '[data-testid="game-layout"][data-spectator="true"], [data-testid="spectator-banner"]',
    { timeout: 15_000 },
  );
  await logSnapshotIfChanged(spectator, gameRunId, 'spectator_joined');
}

async function closePlayer(player: BotPlayer | null): Promise<void> {
  if (!player) return;
  await Promise.all([
    player.context.close().catch(() => {}),
    player.browser.close().catch(() => {}),
  ]);
}

async function takeAction(page: Page, name: string): Promise<string> {
  const phaseText = await page.textContent('[data-testid="phase-indicator"]');
  console.log(`[${name}] ${phaseText}`);

  const phaseLower = phaseText?.toLowerCase() ?? '';

  if (phaseLower.includes('deployment') || phaseLower.includes('deploy')) {
    const handCards = page.locator('.hand-card.playable');
    const count = await handCards.count();

    if (count > 0) {
      const idx = 0;
      await clickGameElement(handCards.nth(idx));
      await page.waitForTimeout(500); // Wait for "pick up"

      const frontRowTargets = page.locator(
        '[data-testid^="player-cell-r0-c"].bf-cell.valid-target',
      );
      const frontRowCount = await frontRowTargets.count();
      if (frontRowCount > 0) {
        const frontRowIdx = 0;
        await clickGameElement(frontRowTargets.nth(frontRowIdx));
        return `deploy front-row idx=${frontRowIdx}`;
      }

      const fallbackTargets = page.locator('[data-testid^="player-cell-"].bf-cell.valid-target');
      const fallbackCount = await fallbackTargets.count();
      if (fallbackCount > 0) {
        const fallbackIdx = 0;
        await clickGameElement(fallbackTargets.nth(fallbackIdx));
        return `deploy fallback idx=${fallbackIdx}`;
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
      await clickGameElement(handCards.nth(idx));
      await page.waitForTimeout(500); // Wait for "pick up"

      // Now click a valid reinforcement cell (may be multiple rows in same column)
      const targetCols = page.locator(
        '.bf-cell.is-reinforce-col.valid-target, .bf-cell.reinforce-col.valid-target',
      );
      const targetColCount = await targetCols.count();
      if (targetColCount > 0) {
        const targetIdx = Math.floor(Math.random() * targetColCount);
        await clickGameElement(targetCols.nth(targetIdx));
        return `reinforce complete`;
      }
    }

    if (await clickCommandButton(page, 'combat-skip-reinforce-btn', 'SKIP')) {
      return 'reinforce skipped (button clicked)';
    }

    return 'reinforce skipped (no button found)';
  }

  if (!phaseLower.includes('attack') && !phaseLower.includes('combat'))
    return `no-op phase="${phaseText ?? 'unknown'}"`;

  if (await maybeClickForfeit(page, name)) return 'forfeit';

  const attackers = page.locator(
    '[data-qa-attackable="true"], [data-testid^="player-cell-r0-c"].bf-cell.attack-playable, [data-testid^="player-cell-r0-c"].bf-cell.occupied',
  );
  const count = await attackers.count();
  console.log(`[${name}] Found ${count} playable front-row attackers`);

  if (count <= 0) {
    console.log(`[${name}] PASSING turn.`);
    const passed = await clickCommandButton(page, 'combat-pass-btn', 'PASS');
    return passed ? 'pass' : 'pass failed (button not found)';
  }

  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }

  for (const idx of order) {
    const attacker = attackers.nth(idx);
    await clickGameElement(attacker);

    await page.waitForTimeout(200);
    const selectedAttacker = page
      .locator(
        '[data-qa-attackable="true"].selected, [data-testid^="player-cell-r0-c"].bf-cell.selected',
      )
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
    const directTarget = page.locator(
      `[data-testid="opponent-cell-r0-c${col}"].bf-cell.valid-target`,
    );
    const directTargetCount = await directTarget.count();
    const target =
      directTargetCount > 0
        ? directTarget.first()
        : page.locator('[data-testid^="opponent-cell-r0-c"].bf-cell.valid-target').first();
    const targetCount = await target.count();

    if (targetCount > 0) {
      await clickGameElement(target);
      console.log(`[${name}] ATTACK executed in column ${col}`);
      return `attack col=${col}`;
    }
  }

  console.log(`[${name}] No legal direct front-row attacks found; passing.`);
  const passed = await clickCommandButton(page, 'combat-pass-btn', 'PASS');
  return passed ? 'pass (no legal direct attacks)' : 'pass failed (no legal direct attacks)';
}

async function determineOutcome(
  p1: BotPlayer,
  p2: BotPlayer,
  matchKind: 'pvp' | 'pvb',
): Promise<{ winner: BotPlayer; loser: BotPlayer } | null> {
  const p1Result = await getResultText(p1.page);
  const p2Result = matchKind === 'pvp' ? await getResultText(p2.page) : '';

  if (p1Result.includes('You Win') && p2Result.includes('You Lose')) {
    return { winner: p1, loser: p2 };
  }
  if (p2Result.includes('You Win') && p1Result.includes('You Lose')) {
    return { winner: p2, loser: p1 };
  }
  if (matchKind === 'pvb') {
    if (p1Result.includes('You Win')) return { winner: p1, loser: p2 };
    if (p1Result.includes('You Lose')) return { winner: p2, loser: p1 };
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

  while (moveCount < OPTIONS.maxMovesPerGame) {
    await sleep(1500); // Slightly longer to allow splash screens to settle
    moveCount++;
    const [p1Snapshot, p2Snapshot, spectatorSnapshot] = await Promise.all([
      logSnapshotIfChanged(p1, setup.gameRunId, `loop-${moveCount}`, setup.qaRun, () => {
        setup.reconnectCount++;
      }),
      logSnapshotIfChanged(p2, setup.gameRunId, `loop-${moveCount}`, setup.qaRun, () => {
        setup.reconnectCount++;
      }),
      setup.spectator
        ? logSnapshotIfChanged(
            setup.spectator,
            setup.gameRunId,
            `spectator-loop-${moveCount}`,
            setup.qaRun,
          )
        : Promise.resolve(null),
    ]);
    setup.qaRun.annotate('qa.loop', { 'game.turn_iteration': moveCount });

    const p1Over = await isGameOver(p1.page);
    const p2Over = setup.matchKind === 'pvp' ? await isGameOver(p2.page) : false;
    if (p1Over || p2Over) {
      logGame(setup.gameRunId, '🏁 Game Over detected!');
      return determineOutcome(p1, p2, setup.matchKind);
    }

    const p1IsActive = await p1.page
      .locator('.status-my-turn')
      .isVisible()
      .catch(() => false);
    const p2IsActive =
      setup.matchKind === 'pvp'
        ? await p2.page
            .locator('.status-my-turn')
            .isVisible()
            .catch(() => false)
        : false;

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
      if (idleLoopCount >= OPTIONS.stallThreshold) {
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
            'qa.spectator_phase': spectatorSnapshot?.phase,
            'qa.spectator_turn': spectatorSnapshot?.turnIndicator,
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

  logGame(setup.gameRunId, `⏹️ Reached move limit (${OPTIONS.maxMovesPerGame}) before game over.`);
  return null;
}

async function restartFromWinner(winner: BotPlayer, loser: BotPlayer): Promise<void> {
  const playAgainBtn = winner.page.locator('[data-testid="play-again-btn"]').first();
  if (await playAgainBtn.isVisible().catch(() => false)) {
    await playAgainBtn.click();
  } else {
    await winner.page.goto(OPTIONS.baseUrl);
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
    console.log(`🚀 Launching Phalanx UI Playthrough on ${OPTIONS.baseUrl}`);
    console.log(`🎯 Scenario=${OPTIONS.scenario} bot=${OPTIONS.botOpponent}`);

    await checkPortReachable(OPTIONS.baseUrl);

    const launchPlayer = async (name: string, slot: number): Promise<BotPlayer> => {
      const windowX = slot * (OPTIONS.windowWidth + OPTIONS.windowGap);
      const browser = await chromium.launch({
        headless: !OPTIONS.headed,
        slowMo: OPTIONS.slowMoMs,
        args: [
          `--window-size=${OPTIONS.windowWidth},${OPTIONS.windowHeight}`,
          `--window-position=${windowX},${OPTIONS.windowTop}`,
          ...(OPTIONS.headed && OPTIONS.devtoolsEnabled ? ['--auto-open-devtools-for-tabs'] : []),
        ],
      });
      const context = await browser.newContext({ viewport: null });
      if (!OPTIONS.telemetryEnabled) {
        await context.addInitScript(() => {
          try {
            localStorage.setItem('phx_telemetry_disabled', '1');
          } catch {
            // Ignore storage failures in hardened contexts.
          }
        });
      }
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

    console.log('[main] Launching P1...');
    let p1: BotPlayer = await launchPlayer(uniqueName('Foo'), 0);
    console.log('[main] Launching P2...');
    let p2: BotPlayer = await launchPlayer(uniqueName('Bar'), 1);

    console.log(
      `ℹ️ Settings: MAX_GAMES=${OPTIONS.maxGames}, MAX_MOVES_PER_GAME=${OPTIONS.maxMovesPerGame}, FORFEIT_CHANCE=${OPTIONS.forfeitChance}, WINDOW=${OPTIONS.windowWidth}x${OPTIONS.windowHeight}, DEVTOOLS=${OPTIONS.devtoolsEnabled}, SLOW_MO_MS=${OPTIONS.slowMoMs}, SPECTATOR=${OPTIONS.spectator}`,
    );

    const useAuth = OPTIONS.scenario.startsWith('auth');
    const creatorAccount = useAuth ? buildAuthAccount('QaFoo') : null;
    const joinerAccount =
      OPTIONS.scenario.endsWith('pvp') && useAuth ? buildAuthAccount('QaBar') : null;

    let gameNumber = 1;
    while (OPTIONS.maxGames <= 0 || gameNumber <= OPTIONS.maxGames) {
      console.log(`\n===== Game ${gameNumber} =====`);
      console.log('[main] Creating and joining match...');
      const setup = await createAndJoinMatch(p1, p2, creatorAccount, joinerAccount);
      if (OPTIONS.spectator) {
        setup.spectator = await launchPlayer(uniqueName('Spectator'), 2);
        await joinSpectator(setup.spectator, setup.matchId, setup.qaRun.runId, setup.gameRunId);
      }

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
        await closePlayer(setup.spectator);
        break;
      }

      logGame(setup.gameRunId, `✅ Winner: ${outcome.winner.name} | Loser: ${outcome.loser.name}`);
      setup.qaRun.finish({
        status: 'success',
        durationMs: 0,
        outcomeText: `${outcome.winner.name} defeated ${outcome.loser.name}`,
        reconnectCount: setup.reconnectCount,
      });
      await closePlayer(setup.spectator);
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
    await Promise.all([closePlayer(p1), closePlayer(p2)]);
  } catch (err) {
    console.error('FATAL ERROR in playthrough script:');
    console.error(err);
    process.exit(1);
  }
}

void main();
