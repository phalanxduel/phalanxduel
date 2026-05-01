import '../../scripts/instrument-cli.ts';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, Page, BrowserContext, Browser, type Locator } from '@playwright/test';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { beginQaRun, type QaRun } from './telemetry.js';
import {
  buildBotIdentity,
  buildTournamentIdentity,
  deriveWaveSizes,
  parseWaveSizes,
  type BotIdentity,
  type BotPersona,
} from './bot-swarm.js';

type UiScenario = 'guest-pvp' | 'auth-pvp' | 'guest-pvb' | 'auth-pvb';
type BotOpponent = 'bot-random' | 'bot-heuristic';

interface BotPlayer {
  name: string;
  operativeId: string;
  persona: BotPersona;
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
  spectators: BotPlayer[];
}

interface StoredSession {
  matchId: string;
  playerId: string;
  playerIndex: number;
  operativeId: string;
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

type PlaythroughIdentity = AuthAccount & { registered?: boolean };

interface CliOptions {
  baseUrl: string;
  apiBaseUrl: string;
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
  telemetryExplicit: boolean;
  fixedStartingLpRaw?: string;
  headed: boolean;
  spectator: boolean;
  scenario: UiScenario;
  botOpponent: BotOpponent;
  swarm: boolean;
  waveCount: number;
  cohortSize: number;
  cohortSizesRaw: string | null;
  cohortGrowth: 'fibonacci' | 'fixed';
  botEmailPrefix: string;
  botEmailDomain: string;
  botIdentityStore: string;
  reloginBetweenWaves: boolean;
  miniTournament: boolean;
  tournamentPlayers: number;
  tournamentStartingLp: number;
  internalToken: string | null;
}

interface BotAccountRecord extends BotIdentity {
  registered: boolean;
}

interface AuthUser {
  id: string;
  gamertag: string;
  suffix: number;
  email: string;
  elo: number;
}

interface AuthSession {
  token: string;
  user: AuthUser;
}

type RatingMode = 'pvp' | 'sp-random' | 'sp-heuristic';

interface RatingSnapshot {
  source: 'internal' | 'profile-inferred';
  eloRating: number;
  glickoRating: number;
  glickoRatingDeviation: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

interface PostBattleReport {
  viewer: string;
  role: 'player' | 'spectator';
  matchId: string;
  resultText: string;
  outcomeText: string | null;
  lifepointsText: string | null;
  turningPoint: string | null;
  why: string | null;
  impact: string | null;
  capturedAt: string;
}

interface ProfileRecord {
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
}

interface TournamentBattleRecord {
  matchNumber: number;
  matchId: string;
  contestant: string;
  email: string;
  opponent: BotOpponent;
  spectators: string[];
  result: TournamentPlayer['result'];
  points: number;
  turnNumber: number | null;
  mode: 'cumulative' | 'classic';
  startingLifepoints: number;
  preRating: RatingSnapshot;
  postRating: RatingSnapshot;
  profileRecord: ProfileRecord | null;
  playerReport: PostBattleReport;
  spectatorReports: PostBattleReport[];
}

interface TournamentPlayer {
  account: PlaythroughIdentity;
  identity: BotIdentity;
  player: BotPlayer;
  session: AuthSession;
  preRating: RatingSnapshot;
  postRating: RatingSnapshot | null;
  profileRecord: ProfileRecord | null;
  result: 'win' | 'loss' | 'draw' | 'unknown';
  matchId: string | null;
  turnNumber: number | null;
  postBattleReport: PostBattleReport | null;
  battleRecord: TournamentBattleRecord | null;
  spectatedMatches: string[];
}

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
const SERVER_LOG_PATH = resolve(repoRoot, 'logs/server.log');
const DEFAULT_BOT_IDENTITY_STORE = resolve(
  repoRoot,
  'artifacts/playthrough-ui/bot-identities.json',
);

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

function isLocalBaseUrl(baseUrl: string): boolean {
  try {
    const hostname = new URL(baseUrl).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

function resolveDefaultApiBaseUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    if ((url.hostname === '127.0.0.1' || url.hostname === 'localhost') && url.port === '5173') {
      return process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:3001';
    }
  } catch {
    return baseUrl;
  }
  return baseUrl;
}

function showHelp(): void {
  console.log(`
PHALANX-QA-PLAYTHROUGH-UI(1) - Headed browser gameplay automation

SYNOPSIS
    tsx bin/qa/simulate-ui.ts [OPTIONS]

OPTIONS
    --base-url URL
        Target client URL (default: http://127.0.0.1:5173)

    --api-base-url URL
        Target server/API URL. Defaults to VITE_PROXY_TARGET or http://127.0.0.1:3001
        when --base-url points at local Vite, otherwise defaults to --base-url.

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
        Telemetry defaults on for localhost URLs and off for remote URLs.
    --spectator
    --no-spectator
    --headed
    --headless
        Browser display mode. Headless (default) runs silently with no visible windows.
        --headed opens a visible browser window for each player or spectator.

    --mini-tournament
        Run a ranked mini-tournament instead of a single match. Registers N players,
        seeds them into a bracket, plays all matches to determine standings, then prints
        a full report with per-match results, ELO changes, and ordinal standings.

    --tournament-players NUMBER
        Number of players to register for --mini-tournament (default: 5, minimum: 3).

    --tournament-starting-lp NUMBER
        Override starting life points for tournament matches only.

    HEADLESS GAMEPLAY + HEADED SPECTATOR WINDOWS:
        Run player matches silently while watching what spectators see in real browsers:

            pnpm qa:playthrough:tournament --mini-tournament --headed

        Each player's browser runs headless (no window). After each match is seeded, a
        separate headed Chromium window opens to the spectator view of that match. The
        display window closes automatically when the match ends or times out. Use this to
        visually verify the spectator experience without slowing down the bot gameplay.

    --swarm
    --wave-count NUMBER
    --cohort-size NUMBER
    --cohort-sizes CSV
    --cohort-growth fibonacci|fixed
    --bot-email-prefix PREFIX
    --bot-email-domain DOMAIN
    --bot-identity-store PATH
    --relogin-between-waves
    --no-relogin-between-waves
    --internal-token TOKEN
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
    apiBaseUrl:
      process.env.API_BASE_URL ||
      process.env.SERVER_BASE_URL ||
      resolveDefaultApiBaseUrl(process.env.BASE_URL || 'http://127.0.0.1:5173'),
    maxGames: Number(process.env['MAX_GAMES'] || 3),
    maxMovesPerGame: Number(process.env['MAX_MOVES_PER_GAME'] || 250),
    stallThreshold: Number(process.env['STALL_THRESHOLD'] || 10),
    forfeitChance: Number(process.env['FORFEIT_CHANCE'] || 0),
    devtoolsEnabled: process.env['DEVTOOLS'] === 'true',
    slowMoMs: Number(process.env.SLOW_MO_MS || 350),
    windowWidth: Number(process.env.WINDOW_WIDTH || 1600),
    windowHeight: Number(process.env.WINDOW_HEIGHT || 1440),
    windowGap: Number(process.env.WINDOW_GAP || 24),
    windowTop: Number(process.env.WINDOW_TOP || 32),
    telemetryEnabled: isLocalBaseUrl(process.env.BASE_URL || 'http://127.0.0.1:5173'),
    telemetryExplicit: false,
    fixedStartingLpRaw: process.env.STARTING_LIFEPOINTS ?? process.env.STARTING_LP,
    headed: process.env.HEADLESS === 'false',
    spectator: process.env.SPECTATOR === 'true',
    scenario: parseScenario(process.env.QA_UI_SCENARIO),
    botOpponent: parseBotOpponent(process.env.BOT_OPPONENT),
    swarm: process.env.SWARM === 'true',
    waveCount: Number(process.env.WAVE_COUNT || 5),
    cohortSize: Number(process.env.COHORT_SIZE || 2),
    cohortSizesRaw: process.env.COHORT_SIZES ?? null,
    cohortGrowth: process.env.COHORT_GROWTH === 'fixed' ? 'fixed' : 'fibonacci',
    botEmailPrefix: process.env.BOT_EMAIL_PREFIX || 'bot',
    botEmailDomain: process.env.BOT_EMAIL_DOMAIN || 'phalanxduel.com',
    botIdentityStore: process.env.BOT_IDENTITY_STORE || DEFAULT_BOT_IDENTITY_STORE,
    reloginBetweenWaves: process.env.RELOGIN_BETWEEN_WAVES !== 'false',
    miniTournament: process.env.MINI_TOURNAMENT === 'true',
    tournamentPlayers: Number(process.env.TOURNAMENT_PLAYERS || 5),
    tournamentStartingLp: Number(process.env.TOURNAMENT_STARTING_LP || 3),
    internalToken: process.env.ADMIN_INTERNAL_TOKEN || process.env.INTERNAL_TOKEN || null,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--base-url' && next) options.baseUrl = next;
    if (arg === '--api-base-url' && next) options.apiBaseUrl = next;
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
    if (arg === '--telemetry') {
      options.telemetryEnabled = true;
      options.telemetryExplicit = true;
    }
    if (arg === '--no-telemetry') {
      options.telemetryEnabled = false;
      options.telemetryExplicit = true;
    }
    if (arg === '--spectator') options.spectator = true;
    if (arg === '--no-spectator') options.spectator = false;
    if (arg === '--headed') options.headed = true;
    if (arg === '--headless') options.headed = false;
    if (arg === '--swarm') options.swarm = true;
    if (arg === '--wave-count' && next) options.waveCount = Math.max(1, Number(next));
    if (arg === '--cohort-size' && next) options.cohortSize = Math.max(1, Number(next));
    if (arg === '--cohort-sizes' && next) options.cohortSizesRaw = next;
    if (arg === '--cohort-growth' && next) {
      options.cohortGrowth = next === 'fixed' ? 'fixed' : 'fibonacci';
    }
    if (arg === '--bot-email-prefix' && next) options.botEmailPrefix = next.trim() || 'bot';
    if (arg === '--bot-email-domain' && next) options.botEmailDomain = next.trim();
    if (arg === '--bot-identity-store' && next) options.botIdentityStore = next;
    if (arg === '--relogin-between-waves') options.reloginBetweenWaves = true;
    if (arg === '--no-relogin-between-waves') options.reloginBetweenWaves = false;
    if (arg === '--mini-tournament') options.miniTournament = true;
    if (arg === '--tournament-players' && next) {
      const value = Number(next);
      options.tournamentPlayers = Number.isFinite(value) ? Math.max(3, Math.trunc(value)) : 5;
    }
    if (arg === '--tournament-starting-lp' && next) {
      const value = Number(next);
      options.tournamentStartingLp = Number.isFinite(value)
        ? Math.max(1, Math.min(500, Math.trunc(value)))
        : 3;
    }
    if (arg === '--internal-token' && next) options.internalToken = next;
  }

  if (!options.telemetryExplicit) {
    options.telemetryEnabled = isLocalBaseUrl(options.baseUrl);
    if (process.env.NO_TELEMETRY === 'true') {
      options.telemetryEnabled = false;
    }
  }

  if (
    !process.env.API_BASE_URL &&
    !process.env.SERVER_BASE_URL &&
    options.apiBaseUrl === resolveDefaultApiBaseUrl(process.env.BASE_URL || 'http://127.0.0.1:5173')
  ) {
    options.apiBaseUrl = resolveDefaultApiBaseUrl(options.baseUrl);
  }

  return options;
}

const OPTIONS = parseArgs(process.argv.slice(2));
if (!OPTIONS) {
  process.exit(0);
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
/**
 * Semantic Adapters for UI Interaction
 */

class LobbyAdapter {
  constructor(private page: Page) {}

  async enterOperativeId(id: string) {
    const idInput = this.page.locator('[data-testid="lobby-name-input"]');
    if (await idInput.isVisible()) {
      await idInput.fill(id);
    }
  }

  async setStartingLp(lp: number) {
    const advancedToggle = this.page.locator('[data-testid="advanced-options-toggle"]');
    if (!(await this.page.locator('[data-testid="advanced-options-panel"]').isVisible())) {
      await advancedToggle.click();
    }
    await this.page.locator('[data-testid="lobby-starting-lp"]').fill(lp.toString());
  }

  async createPrivateMatch() {
    await this.page.locator('[data-testid="lobby-create-btn"]').click();
  }

  async openAuth() {
    await this.page.locator('[data-testid="userbar-authorize-btn"]').click();
  }

  async getMatchIdFromUrl(): Promise<string | null> {
    const url = new URL(this.page.url());
    return url.searchParams.get('match') || url.searchParams.get('matchId');
  }
}

class AuthAdapter {
  constructor(private page: Page) {}

  async toggleToRegister() {
    const titleText = (await this.page.locator('.auth-panel h3').innerText()).toUpperCase();
    if (!titleText.includes('REGISTER')) {
      await this.page.locator('[data-testid="auth-toggle-mode-btn"]').click();
      await this.page.waitForSelector('.auth-panel h3:has-text("REGISTER")', { timeout: 10_000 });
    }
  }

  async fillRegisterForm(account: AuthAccount) {
    await this.page.locator('[data-testid="auth-gamertag-input"]').fill(account.gamertag);
    await this.page.locator('[data-testid="auth-email-input"]').fill(account.email);
    await this.page.locator('[data-testid="auth-password-input"]').fill(account.password);
  }

  async submit() {
    await this.page.locator('[data-testid="auth-submit-btn"]').click();
  }
}

class GameAdapter {
  constructor(private page: Page) {}

  async getPhase(): Promise<string> {
    return (await this.page.getAttribute('[data-testid="game-layout"]', 'data-phase')) || 'unknown';
  }

  async deployCard(cardId: string, colIndex: number) {
    await this.page.locator(`[data-testid="hand-card-${cardId}"]`).click();
    await this.page.locator(`[data-testid="player-grid-col-${colIndex}"]`).click();
  }

  async selectAttacker(colIndex: number) {
    await this.page.locator(`[data-testid="player-battlefield-card-col-${colIndex}"]`).click();
  }

  async selectTarget(colIndex: number) {
    await this.page.locator(`[data-testid="opponent-battlefield-card-col-${colIndex}"]`).click();
  }

  async pass() {
    await this.page.locator('[data-testid="pass-btn"]').click();
  }

  async isMyTurn(): Promise<boolean> {
    const indicator = this.page.locator('[data-testid="turn-indicator"]');
    const text = await indicator.innerText();
    return text.includes('YOUR_TURN');
  }
}

const PLAYTHROUGH_ID = `pt-${Math.random().toString(36).substring(2, 8)}`;
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
function attachLogger(page: Page, operativeId: string): void {
  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    console.log(`[BROWSER-${type.toUpperCase()}] [${operativeId}] ${text}`);
  });
  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      console.log(
        `[BROWSER-NET-ERROR] [${operativeId}] ${response.request().method()} ${response.url()} -> ${status}`,
      );
    }
  });
  page.on('requestfailed', (request) => {
    console.log(
      `[BROWSER-NET-FAIL] [${operativeId}] ${request.method()} ${request.url()} -> ${request.failure()?.errorText}`,
    );
  });
  page.on('dialog', async (dialog) => {
    // Auto-accept confirmation dialogs (forfeit, lethal pass)
    console.log(`[DIALOG] [${operativeId}] ${dialog.type()}: ${dialog.message()}`);
    await dialog.accept();
  });
  page.on('pageerror', (err) => {
    console.log(`[UNCAUGHT-EXCEPTION] [${operativeId}] ${err.message}`);
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
  return `${session.matchId}/${session.playerId}/p${session.playerIndex}/${session.operativeId}`;
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
    logGame(
      gameRunId,
      `[SNAPSHOT] [${player.operativeId}] [${reason}] ${describeSnapshot(snapshot)}`,
    );
    player.lastSnapshot = snapshot;
    if (snapshot?.error && /reconnect|disconnected/i.test(snapshot.error)) {
      onReconnectSignal?.();
      qaRun?.recordReconnect(player.operativeId, 'ui_error_banner', {
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

function normalizeReportText(text: string | null | undefined): string | null {
  const normalized = text?.replace(/\s+/g, ' ').trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

function stripReportLabel(text: string | null, label: string): string | null {
  if (!text) return null;
  const stripped = text.replace(new RegExp(`^${label}\\s*`, 'i'), '').trim();
  return stripped.length > 0 ? stripped : null;
}

async function readLocatorText(locator: Locator, timeout = 500): Promise<string | null> {
  try {
    return normalizeReportText(await locator.textContent({ timeout }));
  } catch {
    return null;
  }
}

async function capturePostBattleReport(
  page: Page,
  viewer: string,
  role: PostBattleReport['role'],
  matchId: string,
): Promise<PostBattleReport> {
  await page.waitForSelector('[data-testid="game-over"]', { timeout: 5_000 }).catch(() => {});
  const summary = page.locator('[data-testid="turning-point-summary"]').first();
  const blocks = summary.locator('.turning-point-block');

  return {
    viewer,
    role,
    matchId,
    resultText: (await getResultText(page)) || 'Game Over',
    outcomeText: await readLocatorText(page.locator('.game-over .lp-summary').nth(0)),
    lifepointsText: await readLocatorText(page.locator('.game-over .lp-summary').nth(1)),
    turningPoint: await readLocatorText(summary.locator('.turning-point-line').first()),
    why: stripReportLabel(await readLocatorText(blocks.nth(0)), 'WHY'),
    impact: stripReportLabel(await readLocatorText(blocks.nth(1)), 'RESULT'),
    capturedAt: new Date().toISOString(),
  };
}

async function maybeClickForfeit(page: Page, name: string): Promise<boolean> {
  if (Math.random() >= OPTIONS.forfeitChance) return false;
  const forfeitBtn = page.locator('[data-testid="combat-forfeit-btn"]');
  if (!(await forfeitBtn.isVisible().catch(() => false))) return false;

  console.log(`[${name}] FORFEIT triggered (chance=${OPTIONS.forfeitChance}).`);
  await forfeitBtn.click({ force: true });
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

function buildAuthAccount(index: number): AuthAccount {
  const identity = buildBotIdentity(index, OPTIONS.botEmailPrefix, OPTIONS.botEmailDomain);
  return {
    email: identity.email,
    password: identity.password,
    gamertag: identity.gamertag,
  };
}

async function loadBotAccounts(): Promise<BotAccountRecord[]> {
  try {
    const raw = await readFile(OPTIONS.botIdentityStore, 'utf8');
    const parsed = JSON.parse(raw) as BotAccountRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveBotAccounts(records: BotAccountRecord[]): Promise<void> {
  await mkdir(dirname(OPTIONS.botIdentityStore), { recursive: true });
  await writeFile(OPTIONS.botIdentityStore, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
}

async function ensureBotAccounts(minCount: number): Promise<BotAccountRecord[]> {
  const records = await loadBotAccounts();
  let nextIndex = records.length + 1;
  while (records.length < minCount) {
    const identity = buildBotIdentity(nextIndex, OPTIONS.botEmailPrefix, OPTIONS.botEmailDomain);
    records.push({ ...identity, registered: false });
    nextIndex++;
  }
  await saveBotAccounts(records);
  return records;
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

async function ensureGuestOperativeId(page: Page, id: string): Promise<void> {
  const lobby = new LobbyAdapter(page);
  await lobby.enterOperativeId(id);
}

async function authenticatePlayer(
  page: Page,
  account: PlaythroughIdentity,
  gameRunId: string,
  mode: 'login' | 'register' = 'register',
): Promise<AuthSession | null> {
  logGame(gameRunId, `Authenticating ${account.gamertag} (${account.email}) as ${mode}`);
  const authButton = page
    .locator('[data-testid="userbar-authorize-btn"], button:has-text("AUTHORIZE")')
    .first();
  if (!(await authButton.isVisible().catch(() => false))) {
    const alreadyAuthenticated = await page
      .locator('[data-testid="lobby-create-btn"], button:has-text("DISCONNECT")')
      .first()
      .isVisible()
      .catch(() => false);
    if (alreadyAuthenticated) {
      logGame(gameRunId, `Skipping auth for ${account.gamertag}; session already active`);
      return null;
    }
  }

  await authButton.click();
  await page.waitForSelector('.auth-panel', { timeout: 5000 });

  if (mode === 'register') {
    const titleText = (await page.locator('.auth-panel h3').innerText()).toUpperCase();
    if (!titleText.includes('REGISTER')) {
      await page.locator('[data-testid="auth-toggle-mode-btn"]').click();
      await page.waitForSelector('.auth-panel h3:has-text("REGISTER")', { timeout: 10_000 });
    }
    await page
      .locator('[data-testid="auth-gamertag-input"], #auth-gamertag')
      .first()
      .fill(account.gamertag);
  }
  await page.locator('[data-testid="auth-email-input"], #auth-email').first().fill(account.email);
  await page
    .locator('[data-testid="auth-password-input"], #auth-password')
    .first()
    .fill(account.password);
  const waitForAuthResponse = () =>
    page.waitForResponse(
      (response) => {
        const url = new URL(response.url());
        return (
          response.request().method() === 'POST' &&
          (url.pathname === '/api/auth/register' || url.pathname === '/api/auth/login')
        );
      },
      { timeout: 15_000 },
    );
  let authResponsePromise = waitForAuthResponse();
  await page.locator('[data-testid="auth-submit-btn"], button[type="submit"]').first().click();
  let authResponse = await authResponsePromise.catch(() => null);

  await page.waitForTimeout(500);
  const authError = page.locator('.auth-error');
  if (await authError.isVisible().catch(() => false)) {
    const authErrorText = (await authError.textContent())?.trim() ?? '';
    if (mode === 'register' && /already registered/i.test(authErrorText)) {
      await page.locator('[data-testid="auth-toggle-mode-btn"], .btn-text').first().click();
      authResponsePromise = waitForAuthResponse();
      await page.locator('[data-testid="auth-submit-btn"], button[type="submit"]').first().click();
      authResponse = await authResponsePromise.catch(() => null);
      await page.waitForTimeout(500);
      if (await authError.isVisible().catch(() => false)) {
        throw new Error(
          `Authentication failed for ${account.email}: ${((await authError.textContent()) ?? '').trim()}`,
        );
      }
    } else {
      throw new Error(`Authentication failed for ${account.email}: ${authErrorText}`);
    }
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

  if (authResponse?.ok()) {
    return (await authResponse.json()) as AuthSession;
  }
  return null;
}

async function logoutPlayer(page: Page, gameRunId: string, name: string): Promise<void> {
  logGame(gameRunId, `Logging out ${name}`);
  await page.goto(OPTIONS.baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(750);
  const disconnect = page.locator('button:has-text("DISCONNECT")').first();
  if (await disconnect.isVisible().catch(() => false)) {
    await disconnect.click();
  }
  await page
    .waitForSelector('[data-testid="userbar-authorize-btn"], [data-testid="lobby-name-input"]', {
      timeout: 10_000,
    })
    .catch(() => {});
}

async function configureMatchOptions(
  page: Page,
  operativeId: string,
): Promise<{
  mode: 'cumulative' | 'classic';
  startingLifepoints: number;
}> {
  await ensureGuestOperativeId(page, operativeId);

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
  joiner: BotPlayer | null,
  creatorAccount: PlaythroughIdentity | null,
  joinerAccount: PlaythroughIdentity | null,
): Promise<MatchSetup> {
  const gameRunId = `${PLAYTHROUGH_ID}:g${Math.random().toString(36).slice(2, 6)}`;
  const qaRun = beginQaRun({
    tool: 'simulate-ui',
    runId: gameRunId,
    baseUrl: OPTIONS.baseUrl,
    p1: creator.operativeId,
    p2: joiner?.name ?? (OPTIONS.scenario.endsWith('pvb') ? OPTIONS.botOpponent : 'server-bot'),
    headed: true,
  });

  if (joiner && creator.operativeId === joiner.name) {
    throw new Error(`Refusing self-match: both players are named "${creator.operativeId}"`);
  }

  await waitForLobbyReady(creator.page, qaRun.runId);
  if (creatorAccount) {
    await authenticatePlayer(
      creator.page,
      creatorAccount,
      gameRunId,
      creatorAccount.registered ? 'login' : 'register',
    );
  }

  const { mode: selectedMode, startingLifepoints } = await configureMatchOptions(
    creator.page,
    creator.operativeId,
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
      spectators: [],
    };
  }

  await creator.page.click('[data-testid="lobby-create-btn"]');

  await creator.page.waitForSelector('[data-testid="waiting-match-id"]');
  await logSnapshotIfChanged(creator, gameRunId, 'creator_waiting', qaRun);
  const rawMatchId = await creator.page.textContent('[data-testid="waiting-match-id"]');
  const matchId = rawMatchId?.trim() ?? '';
  if (!matchId) {
    throw new Error(`Failed to read match ID for creator ${creator.operativeId}`);
  }
  qaRun.bindMatch(matchId, {
    'game.damage_mode': selectedMode,
    'game.starting_lp': startingLifepoints,
  });
  logGame(gameRunId, `📦 Match Created by ${creator.operativeId}: "${matchId}"`);

  if (joiner) {
    await waitForLobbyReady(joiner.page, qaRun.runId);
    if (joinerAccount) {
      await authenticatePlayer(
        joiner.page,
        joinerAccount,
        gameRunId,
        joinerAccount.registered ? 'login' : 'register',
      );
    }
    await ensureGuestOperativeId(joiner.page, joiner.name);
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
  } else {
    await creator.page.waitForSelector('[data-testid="game-layout"], [data-testid="game-over"]', {
      timeout: 10_000,
    });
  }

  const [creatorSession, joinerSession] = await Promise.all([
    waitForStoredSession(creator.page),
    joiner ? waitForStoredSession(joiner.page) : Promise.resolve(null),
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
    spectators: [],
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

  const banner = await spectator.page
    .textContent('[data-testid="spectator-banner"]')
    .catch(() => null);
  const livePanel = await spectator.page
    .locator('[data-testid="spectator-live-panel"]')
    .isVisible()
    .catch(() => false);
  const spectatorCount = await spectator.page
    .textContent('[data-testid="spectator-count"]')
    .catch(() => null);
  logGame(
    gameRunId,
    `📺 Spectator HUD: banner="${banner ?? 'missing'}" livePanel=${livePanel} count="${spectatorCount ?? 'n/a'}"`,
  );

  await logSnapshotIfChanged(spectator, gameRunId, 'spectator_joined');
}

function addSetupSpectator(setup: MatchSetup, spectator: BotPlayer): void {
  const alreadyTracked =
    setup.spectator?.name === spectator.name ||
    setup.spectators.some((tracked) => tracked.name === spectator.name);
  if (!alreadyTracked) {
    setup.spectators.push(spectator);
  }
}

function getSetupSpectators(setup: MatchSetup): BotPlayer[] {
  const spectators: BotPlayer[] = [];
  const seen = new Set<string>();
  for (const spectator of [setup.spectator, ...setup.spectators]) {
    if (!spectator || seen.has(spectator.name)) continue;
    seen.add(spectator.name);
    spectators.push(spectator);
  }
  return spectators;
}

async function closePlayer(player: BotPlayer | null): Promise<void> {
  if (!player) return;
  await Promise.all([
    player.context.close().catch(() => {}),
    player.browser.close().catch(() => {}),
  ]);
}

async function purgeAccount(player: BotPlayer, account: AuthAccount): Promise<void> {
  const { page } = player;
  console.log(`[purge] Initializing purge for ${account.gamertag}...`);

  // Ensure we are at the lobby first
  const hudId = page.locator('.phx-user-info .status-title');
  if (!(await hudId.isVisible().catch(() => false))) {
    console.log(`[purge] HUD not visible for ${account.gamertag}, returning to lobby...`);
    await page.goto(OPTIONS.baseUrl);
    await page.waitForSelector('.phx-user-info .status-title', { timeout: 10_000 });
  }

  // 1. Navigate to Profile via HUD
  await hudId.click();
  await page.waitForSelector('.hud-panel h2:has-text("OPERATIVE_PROFILE")');

  // 2. Open Settings via Lobby (Return first)
  await page.locator('button:has-text("RETURN_TO_LOBBY")').click();
  await page.locator('button:has-text("SETTINGS")').click();
  await page.waitForSelector('.auth-panel h2:has-text("OPERATIVE_SETTINGS")');

  // 3. Trigger Purge Confirmation
  await page.locator('button:has-text("INITIALIZE_THE_PURGE")').click();
  const passwordInput = page.locator('.purge-confirm-zone input[type="password"]');
  await passwordInput.fill(account.password);

  // 4. Confirm Purge
  const confirmBtn = page.locator('.purge-confirm-zone button:has-text("CONFIRM_PURGE")');
  await confirmBtn.click();

  // 5. Verify logout and redirect to lobby (as guest)
  await page.waitForSelector('.lobby-header:has-text("PHALANX_COMMAND")');
  console.log(`[purge] ✅ Account ${account.gamertag} purged successfully.`);
}

async function takeAction(
  page: Page,
  name: string,
  persona: BotPersona = 'stuck-in-middle',
): Promise<string> {
  try {
    const phaseText = await page.textContent('[data-testid="phase-indicator"]');
    console.log(`[${name}] (${persona}) ${phaseText}`);

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
    if (persona === 'born-to-be-wild') {
      order.reverse();
    } else if (persona === 'stuck-in-middle') {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j]!, order[i]!];
      }
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/closed/i.test(message)) {
      return 'browser closed';
    }
    throw error;
  }
}

async function determineOutcome(
  p1: BotPlayer,
  p2: BotPlayer | null,
  matchKind: 'pvp' | 'pvb',
): Promise<{ winner: BotPlayer; loser: BotPlayer | null } | null> {
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
    if (p1Result.includes('You Lose')) {
      return p2 ? { winner: p2, loser: p1 } : { winner: p1, loser: null };
    }
  }
  return null;
}

async function runSingleGame(
  p1: BotPlayer,
  p2: BotPlayer | null,
  setup: MatchSetup,
): Promise<{ winner: BotPlayer; loser: BotPlayer | null } | null> {
  logGame(
    setup.gameRunId,
    `⚔️ Both players joined. Starting game loop... [match ${setup.matchId}] [trace ${setup.serverTraceId ?? 'pending'}]`,
  );
  let moveCount = 0;
  let idleLoopCount = 0;
  let stallSignalSent = false;

  while (moveCount < OPTIONS.maxMovesPerGame) {
    const spectators = getSetupSpectators(setup);
    if (
      p1.page.isClosed() ||
      (p2 && p2.page.isClosed()) ||
      spectators.some((spectator) => spectator.page.isClosed())
    ) {
      logGame(setup.gameRunId, '🚪 Browser closed during run; aborting swarm wave.');
      return null;
    }
    await sleep(1500); // Slightly longer to allow splash screens to settle
    moveCount++;
    const [p1Snapshot, p2Snapshot, spectatorSnapshots] = await Promise.all([
      logSnapshotIfChanged(p1, setup.gameRunId, `loop-${moveCount}`, setup.qaRun, () => {
        setup.reconnectCount++;
      }),
      p2
        ? logSnapshotIfChanged(p2, setup.gameRunId, `loop-${moveCount}`, setup.qaRun, () => {
            setup.reconnectCount++;
          })
        : Promise.resolve(null),
      Promise.all(
        spectators.map((spectator) =>
          logSnapshotIfChanged(
            spectator,
            setup.gameRunId,
            `spectator-${spectator.slot}-loop-${moveCount}`,
            setup.qaRun,
          ),
        ),
      ),
    ]);
    const firstSpectatorSnapshot = spectatorSnapshots[0] ?? null;
    setup.qaRun.annotate('qa.loop', { 'game.turn_iteration': moveCount });

    const p1Over = await isGameOver(p1.page);
    const p2Over = setup.matchKind === 'pvp' && p2 ? await isGameOver(p2.page) : false;
    if (p1Over || p2Over) {
      logGame(setup.gameRunId, '🏁 Game Over detected!');
      return determineOutcome(p1, p2, setup.matchKind);
    }

    const p1IsActive = await p1.page
      .locator('.status-my-turn')
      .isVisible()
      .catch(() => false);
    const p2IsActive =
      setup.matchKind === 'pvp' && p2
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
      const action = await takeAction(p1.page, p1.name, p1.persona);
      if (action === 'browser closed') {
        logGame(setup.gameRunId, `🚪 ${p1.name} browser closed; aborting match.`);
        return null;
      }
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
      const action = await takeAction(p2.page, p2.name, p2.persona);
      if (action === 'browser closed') {
        logGame(setup.gameRunId, `🚪 ${p2.name} browser closed; aborting match.`);
        return null;
      }
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
      const p2Phase = p2
        ? await p2.page.textContent('[data-testid="phase-indicator"]').catch(() => 'n/a')
        : 'n/a';
      const p1Turn = await p1.page.textContent('[data-testid="turn-indicator"]').catch(() => 'n/a');
      const p2Turn = p2
        ? await p2.page.textContent('[data-testid="turn-indicator"]').catch(() => 'n/a')
        : 'n/a';

      if (idleLoopCount >= 5 && !stallSignalSent) {
        setup.qaRun.recordPattern(
          'ui_turn_stall',
          {
            'match.id': setup.matchId,
            'qa.idle_loop_count': idleLoopCount,
            'qa.p1_error': p1Snapshot?.error,
            'qa.p2_error': p2Snapshot?.error,
            'qa.spectator_count': spectatorSnapshots.length,
            'qa.spectator_phase': firstSpectatorSnapshot?.phase,
            'qa.spectator_turn': firstSpectatorSnapshot?.turnIndicator,
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

async function restartFromWinner(winner: BotPlayer, loser: BotPlayer | null): Promise<void> {
  const playAgainBtn = winner.page.locator('[data-testid="play-again-btn"]').first();
  if (await playAgainBtn.isVisible().catch(() => false)) {
    await playAgainBtn.click();
  } else {
    await winner.page.goto(OPTIONS.baseUrl);
  }

  if (!loser) return;
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

function apiUrl(path: string): string {
  return new URL(path, OPTIONS.apiBaseUrl).toString();
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  const response = await fetch(apiUrl(path), init);
  if (!response.ok) return null;
  return (await response.json()) as T;
}

function tournamentRatingMode(): RatingMode {
  return OPTIONS.botOpponent === 'bot-heuristic' ? 'sp-heuristic' : 'sp-random';
}

async function fetchInternalRating(
  userId: string,
  mode: RatingMode,
): Promise<RatingSnapshot | null> {
  if (!OPTIONS.internalToken) return null;
  const rating = await fetchJson<RatingSnapshot>(`/internal/ratings/${userId}/${mode}`, {
    headers: { authorization: `Bearer ${OPTIONS.internalToken}` },
  }).catch(() => null);
  return rating ? { ...rating, source: 'internal' } : null;
}

async function fetchLadderRating(
  userId: string,
  mode: RatingMode,
  previous?: RatingSnapshot,
): Promise<RatingSnapshot> {
  const stats = await fetchJson<{
    elo: number;
    matches: number;
    wins: number;
  }>(`/api/ladder/${mode}/${userId}`).catch(() => null);
  const eloRating = stats?.elo ?? previous?.eloRating ?? 1000;
  const gamesPlayed = stats?.matches ?? previous?.gamesPlayed ?? 0;
  const wins = stats?.wins ?? previous?.wins ?? 0;
  const losses = Math.max(0, gamesPlayed - wins);
  const eloDelta = eloRating - (previous?.eloRating ?? 1000);
  const advanced = previous && gamesPlayed > previous.gamesPlayed;
  return {
    source: 'profile-inferred',
    eloRating,
    glickoRating: (previous?.glickoRating ?? 1500) + Math.round(eloDelta * 1.5),
    glickoRatingDeviation: advanced
      ? Math.max(80, Math.round(previous.glickoRatingDeviation * 0.92))
      : (previous?.glickoRatingDeviation ?? 350),
    gamesPlayed,
    wins,
    losses,
    draws: 0,
  };
}

async function readRatingSnapshot(
  userId: string,
  mode: RatingMode,
  previous?: RatingSnapshot,
): Promise<RatingSnapshot> {
  return (
    (await fetchInternalRating(userId, mode)) ?? (await fetchLadderRating(userId, mode, previous))
  );
}

async function readLatestTournamentResult(
  userId: string,
  mode: RatingMode,
  matchId: string | null,
): Promise<{ result: 'win' | 'loss' | 'draw' | 'unknown'; turnNumber: number | null }> {
  const profile = await fetchJson<{
    recentMatches: {
      matchId: string;
      result: 'win' | 'loss' | 'draw';
      mode: RatingMode;
      turnNumber: number | null;
    }[];
  }>(`/api/profiles/${userId}`).catch(() => null);
  const match =
    profile?.recentMatches.find((entry) => entry.matchId === matchId) ??
    profile?.recentMatches.find((entry) => entry.mode === mode);
  return {
    result: match?.result ?? 'unknown',
    turnNumber: match?.turnNumber ?? null,
  };
}

function formatRatingSnapshot(snapshot: RatingSnapshot | null): string {
  if (!snapshot) return 'n/a';
  return `ELO=${snapshot.eloRating} Glicko=${snapshot.glickoRating} RD=${snapshot.glickoRatingDeviation} W-L-D=${snapshot.wins}-${snapshot.losses}-${snapshot.draws} (${snapshot.source})`;
}

function tournamentPoints(result: TournamentPlayer['result']): number {
  if (result === 'win') return 3;
  if (result === 'draw') return 1;
  return 0;
}

function rankTournament(players: TournamentPlayer[]): TournamentPlayer[] {
  return players.slice().sort((a, b) => {
    const pointsDelta = tournamentPoints(b.result) - tournamentPoints(a.result);
    if (pointsDelta !== 0) return pointsDelta;

    const aEloDelta = (a.postRating?.eloRating ?? a.preRating.eloRating) - a.preRating.eloRating;
    const bEloDelta = (b.postRating?.eloRating ?? b.preRating.eloRating) - b.preRating.eloRating;
    if (bEloDelta !== aEloDelta) return bEloDelta - aEloDelta;

    const aGlickoDelta =
      (a.postRating?.glickoRating ?? a.preRating.glickoRating) - a.preRating.glickoRating;
    const bGlickoDelta =
      (b.postRating?.glickoRating ?? b.preRating.glickoRating) - b.preRating.glickoRating;
    if (bGlickoDelta !== aGlickoDelta) return bGlickoDelta - aGlickoDelta;

    const aTurns = a.turnNumber ?? Number.MAX_SAFE_INTEGER;
    const bTurns = b.turnNumber ?? Number.MAX_SAFE_INTEGER;
    if (aTurns !== bTurns) return aTurns - bTurns;

    return a.identity.index - b.identity.index;
  });
}

async function readPublicProfileRecord(userId: string): Promise<ProfileRecord | null> {
  const profile = await fetchJson<{ record: ProfileRecord }>(`/api/profiles/${userId}`).catch(
    () => null,
  );
  return profile?.record ?? null;
}

async function readPostTournamentState(
  player: TournamentPlayer,
  mode: RatingMode,
  matchId: string | null,
): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const [rating, result] = await Promise.all([
      readRatingSnapshot(player.session.user.id, mode, player.preRating),
      readLatestTournamentResult(player.session.user.id, mode, matchId),
    ]);
    player.postRating = rating;
    player.result = result.result;
    player.turnNumber = result.turnNumber;
    if (rating.gamesPlayed > player.preRating.gamesPlayed || result.result !== 'unknown') {
      player.profileRecord = await readPublicProfileRecord(player.session.user.id);
      return;
    }
    await sleep(750);
  }
  player.profileRecord = await readPublicProfileRecord(player.session.user.id);
}

function formatReportSummary(report: PostBattleReport): string {
  return [
    report.resultText,
    report.outcomeText,
    report.lifepointsText,
    report.turningPoint ? `Turning point: ${report.turningPoint}` : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' | ');
}

function formatSpectatorList(spectators: string[]): string {
  return spectators.length > 0 ? spectators.join(', ') : 'none';
}

function createTournamentBattleRecord(args: {
  matchNumber: number;
  entry: TournamentPlayer;
  setup: MatchSetup;
  spectators: TournamentPlayer[];
  playerReport: PostBattleReport;
  spectatorReports: PostBattleReport[];
}): TournamentBattleRecord {
  const postRating = args.entry.postRating ?? args.entry.preRating;
  return {
    matchNumber: args.matchNumber,
    matchId: args.setup.matchId,
    contestant: args.entry.identity.gamertag,
    email: args.entry.identity.email,
    opponent: OPTIONS.botOpponent,
    spectators: args.spectators.map((spectator) => spectator.identity.gamertag),
    result: args.entry.result,
    points: tournamentPoints(args.entry.result),
    turnNumber: args.entry.turnNumber,
    mode: args.setup.mode,
    startingLifepoints: args.setup.startingLifepoints,
    preRating: args.entry.preRating,
    postRating,
    profileRecord: args.entry.profileRecord,
    playerReport: args.playerReport,
    spectatorReports: args.spectatorReports,
  };
}

async function writeTournamentReportArtifact(args: {
  mode: RatingMode;
  startingLifepoints: number;
  players: TournamentPlayer[];
  records: TournamentBattleRecord[];
  ranked: TournamentPlayer[];
}): Promise<string> {
  const artifactPath = resolve(
    repoRoot,
    'artifacts/playthrough-ui',
    `${PLAYTHROUGH_ID}-mini-tournament-report.json`,
  );
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(
    artifactPath,
    `${JSON.stringify(
      {
        runId: PLAYTHROUGH_ID,
        generatedAt: new Date().toISOString(),
        baseUrl: OPTIONS.baseUrl,
        apiBaseUrl: OPTIONS.apiBaseUrl,
        ratingMode: args.mode,
        startingLifepoints: args.startingLifepoints,
        players: args.players.map((player) => ({
          gamertag: player.identity.gamertag,
          email: player.identity.email,
          userId: player.session.user.id,
          spectatedMatches: player.spectatedMatches,
          preRating: player.preRating,
          postRating: player.postRating,
        })),
        battles: args.records,
        standings: args.ranked.map((player, index) => ({
          place: index + 1,
          gamertag: player.identity.gamertag,
          email: player.identity.email,
          result: player.result,
          points: tournamentPoints(player.result),
          turnNumber: player.turnNumber,
          matchId: player.matchId,
          preRating: player.preRating,
          postRating: player.postRating,
          profileRecord: player.profileRecord,
        })),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  return artifactPath;
}

function formatProfileRecord(record: ProfileRecord | null): string {
  if (!record) return 'n/a';
  return `${record.wins}W-${record.losses}L-${record.draws}D (${record.gamesPlayed} played)`;
}

function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const rem100 = n % 100;
  const rem10 = n % 10;
  const suffix = rem100 >= 11 && rem100 <= 13 ? 'th' : (suffixes[rem10] ?? 'th');
  return `${n}${suffix}`;
}

function printTournamentReport(args: {
  mode: RatingMode;
  startingLifepoints: number;
  records: TournamentBattleRecord[];
  ranked: TournamentPlayer[];
  artifactPath: string;
}): void {
  const divider = '─'.repeat(54);

  console.log(`\nMini Tournament Report`);
  console.log(
    `Run ${PLAYTHROUGH_ID}  |  ${args.ranked.length} players  |  ${args.startingLifepoints} LP  |  ${args.mode}`,
  );
  console.log(`Artifact: ${args.artifactPath}`);

  console.log(`\n${divider}`);
  console.log(`  Battles`);
  console.log(divider);

  for (const record of args.records) {
    const turns = record.turnNumber != null ? `${record.turnNumber} turns` : 'n/a turns';
    console.log(
      `\nBattle ${record.matchNumber}  ${record.contestant} vs ${record.opponent}  (${record.matchId})`,
    );
    console.log(
      `  ${record.result.toUpperCase()}  ·  ${turns}  ·  ${record.mode}  ·  ${record.startingLifepoints} LP  ·  ${record.points} pts`,
    );
    console.log(`  Spectators: ${formatSpectatorList(record.spectators)}`);

    const summary = formatReportSummary(record.playerReport);
    if (summary) console.log(`  Report:  "${summary}"`);
    if (record.playerReport.why) console.log(`  Why:     ${record.playerReport.why}`);
    if (record.playerReport.impact) console.log(`  Impact:  ${record.playerReport.impact}`);

    const eloPre = record.preRating.eloRating;
    const eloPost = record.postRating.eloRating;
    const glickoPre = record.preRating.glickoRating;
    const glickoPost = record.postRating.glickoRating;
    console.log(
      `  Rating:  ELO ${eloPre} → ${eloPost} (${eloPost >= eloPre ? '+' : ''}${eloPost - eloPre})  |  Glicko ${glickoPre} → ${glickoPost}`,
    );
    console.log(`  Profile: ${formatProfileRecord(record.profileRecord)}`);

    for (const report of record.spectatorReports) {
      const spectatorSummary = formatReportSummary(report);
      if (spectatorSummary) console.log(`  · ${report.viewer} (spectator): "${spectatorSummary}"`);
    }
  }

  console.log(`\n${divider}`);
  console.log(`  Final Standings`);
  console.log(divider);

  for (let index = 0; index < args.ranked.length; index++) {
    const entry = args.ranked[index]!;
    const post = entry.postRating ?? entry.preRating;
    const turns = entry.turnNumber != null ? `${entry.turnNumber} turns` : 'n/a turns';
    const eloDelta = post.eloRating - entry.preRating.eloRating;
    const glickoDelta = post.glickoRating - entry.preRating.glickoRating;

    console.log(`\n${index + 1}. ${entry.identity.gamertag} finished ${ordinal(index + 1)}`);
    console.log(
      `   Result: ${entry.result}, ${turns}, spectators: ${formatSpectatorList(entry.spectatedMatches.length > 0 ? entry.spectatedMatches : [])}`,
    );
    console.log(
      `   Rating: ELO ${entry.preRating.eloRating} → ${post.eloRating} (${eloDelta >= 0 ? '+' : ''}${eloDelta})  |  Glicko ${entry.preRating.glickoRating} → ${post.glickoRating} (${glickoDelta >= 0 ? '+' : ''}${glickoDelta})`,
    );
    console.log(`   Profile: ${formatProfileRecord(entry.profileRecord)}`);
  }

  console.log('');
}

async function main(): Promise<void> {
  try {
    console.log(`🚀 Launching Phalanx UI Playthrough on ${OPTIONS.baseUrl}`);
    console.log(`🎯 Scenario=${OPTIONS.scenario} bot=${OPTIONS.botOpponent}`);

    await checkPortReachable(OPTIONS.baseUrl);

    const launchPlayer = async (
      name: string,
      slot: number,
      persona: BotPersona = 'stuck-in-middle',
      opts: { headed?: boolean } = {},
    ): Promise<BotPlayer> => {
      const headed = opts.headed ?? OPTIONS.headed;
      const windowX = slot * (OPTIONS.windowWidth + OPTIONS.windowGap);
      const browser = await chromium.launch({
        headless: !headed,
        slowMo: OPTIONS.slowMoMs,
        args: [
          `--window-size=${OPTIONS.windowWidth},${OPTIONS.windowHeight}`,
          `--window-position=${windowX},${OPTIONS.windowTop}`,
          ...(headed && OPTIONS.devtoolsEnabled ? ['--auto-open-devtools-for-tabs'] : []),
        ],
      });
      const context = await browser.newContext({ viewport: null });
      await context.addInitScript(() => {
        try {
          localStorage.setItem('phx_welcome_v1_seen', '1');
          localStorage.setItem('phx_onboarding_deploy_seen', '1');
          localStorage.setItem('phx:helpOpen', 'false');
        } catch {
          // Ignore storage failures in hardened contexts.
        }
      });
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
        operativeId: name,
        persona,
        browser,
        context,
        page,
        slot,
        lastSnapshot: null,
      };
    };

    const useAuth = OPTIONS.scenario.startsWith('auth');

    const runMiniTournament = async (): Promise<void> => {
      OPTIONS.scenario = 'auth-pvb';
      OPTIONS.tournamentStartingLp = Number.isFinite(OPTIONS.tournamentStartingLp)
        ? Math.max(1, Math.min(500, Math.trunc(OPTIONS.tournamentStartingLp)))
        : 3;
      OPTIONS.fixedStartingLpRaw = String(OPTIONS.tournamentStartingLp);
      OPTIONS.spectator = true;

      const mode = tournamentRatingMode();
      const playerCount = Math.max(
        3,
        Number.isFinite(OPTIONS.tournamentPlayers) ? Math.trunc(OPTIONS.tournamentPlayers) : 5,
      );
      const passwordToken = randomBytes(6).toString('hex');
      const identities = Array.from({ length: playerCount }, (_, idx) =>
        buildTournamentIdentity(
          idx + 1,
          PLAYTHROUGH_ID,
          OPTIONS.botEmailPrefix,
          OPTIONS.botEmailDomain,
          passwordToken,
        ),
      );
      const tournamentPlayers: TournamentPlayer[] = [];
      const battleRecords: TournamentBattleRecord[] = [];

      logGame(
        PLAYTHROUGH_ID,
        `🏆 Mini tournament starting players=${playerCount} mode=${mode} startingLP=${OPTIONS.tournamentStartingLp} api=${OPTIONS.apiBaseUrl}`,
      );

      const openDisplayWindow = async (
        gamertag: string,
        slot: number,
        matchId: string,
        qaRunId: string,
      ): Promise<BotPlayer> => {
        const display = await launchPlayer(gamertag, slot, 'stuck-in-middle', { headed: true });
        await joinSpectator(display, matchId, qaRunId, `${PLAYTHROUGH_ID}:display`);
        logGame(PLAYTHROUGH_ID, `🖥️ Headed display window for ${gamertag} → match ${matchId}`);
        return display;
      };

      const registerPlayer = async (
        identity: BotIdentity,
        slot: number,
        spectatorMatchId: string | null,
        spectatorQaRunId: string,
      ): Promise<TournamentPlayer> => {
        const player = await launchPlayer(identity.gamertag, slot, identity.persona, {
          headed: false,
        });
        const account: PlaythroughIdentity = {
          email: identity.email,
          password: identity.password,
          gamertag: identity.gamertag,
          registered: false,
        };

        if (spectatorMatchId) {
          await joinSpectator(player, spectatorMatchId, spectatorQaRunId, `${PLAYTHROUGH_ID}:seed`);
          logGame(
            PLAYTHROUGH_ID,
            `👁️ ${identity.gamertag} accepted spectator invite for ${spectatorMatchId}; continuing to registration`,
          );
        }

        await waitForLobbyReady(player.page, `${PLAYTHROUGH_ID}:register-${identity.index}`);
        const session = await authenticatePlayer(
          player.page,
          account,
          `${PLAYTHROUGH_ID}:register-${identity.index}`,
          'register',
        );
        if (!session) {
          throw new Error(`Registration did not return an auth session for ${identity.gamertag}`);
        }
        account.registered = true;
        const preRating = await readRatingSnapshot(session.user.id, mode);
        logGame(
          PLAYTHROUGH_ID,
          `🧾 Registered ${identity.gamertag} email=${identity.email} userId=${session.user.id} pre=${formatRatingSnapshot(preRating)}`,
        );

        if (spectatorMatchId) {
          await joinSpectator(
            player,
            spectatorMatchId,
            spectatorQaRunId,
            `${PLAYTHROUGH_ID}:seed-live`,
          );
          logGame(
            PLAYTHROUGH_ID,
            `👁️ ${identity.gamertag} returned to live spectator view for ${spectatorMatchId}`,
          );
        }

        return {
          account,
          identity,
          player,
          session,
          preRating,
          postRating: null,
          profileRecord: null,
          result: 'unknown',
          matchId: null,
          turnNumber: null,
          postBattleReport: null,
          battleRecord: null,
          spectatedMatches: spectatorMatchId ? [spectatorMatchId] : [],
        };
      };

      const watchTournamentMatch = async (
        watcher: TournamentPlayer,
        setup: MatchSetup,
      ): Promise<BotPlayer | null> => {
        await joinSpectator(
          watcher.player,
          setup.matchId,
          setup.qaRun.runId,
          `${PLAYTHROUGH_ID}:watch-${watcher.identity.index}`,
        );
        addSetupSpectator(setup, watcher.player);
        if (!watcher.spectatedMatches.includes(setup.matchId)) {
          watcher.spectatedMatches.push(setup.matchId);
        }
        logGame(PLAYTHROUGH_ID, `👁️ ${watcher.identity.gamertag} is spectating ${setup.matchId}`);
        if (!OPTIONS.headed) return null;
        return openDisplayWindow(
          watcher.identity.gamertag,
          watcher.identity.index,
          setup.matchId,
          setup.qaRun.runId,
        );
      };

      const finishTournamentMatch = async (
        matchNumber: number,
        entry: TournamentPlayer,
        setup: MatchSetup,
        spectators: TournamentPlayer[],
        outcome: { winner: BotPlayer; loser: BotPlayer | null } | null,
      ): Promise<TournamentBattleRecord> => {
        const resultText = await getResultText(entry.player.page);
        if (!outcome && !/You (Win|Lose)/i.test(resultText)) {
          setup.qaRun.finish({
            status: 'failure',
            durationMs: 0,
            failureReason: 'no_decisive_outcome',
            failureMessage: 'Mini tournament bot match stopped without a decisive outcome',
          });
          throw new Error(`No decisive outcome for ${entry.identity.gamertag}`);
        }

        await readPostTournamentState(entry, mode, setup.matchId);
        const playerReport = await capturePostBattleReport(
          entry.player.page,
          entry.identity.gamertag,
          'player',
          setup.matchId,
        );
        const spectatorReports = await Promise.all(
          spectators.map((spectator) =>
            capturePostBattleReport(
              spectator.player.page,
              spectator.identity.gamertag,
              'spectator',
              setup.matchId,
            ),
          ),
        );
        const record = createTournamentBattleRecord({
          matchNumber,
          entry,
          setup,
          spectators,
          playerReport,
          spectatorReports,
        });
        entry.postBattleReport = playerReport;
        entry.battleRecord = record;
        setup.qaRun.finish({
          status: 'success',
          durationMs: 0,
          outcomeText: `${entry.identity.gamertag} result=${entry.result}`,
          reconnectCount: setup.reconnectCount,
        });
        logGame(
          PLAYTHROUGH_ID,
          `✅ ${entry.identity.gamertag} completed match=${setup.matchId} result=${entry.result} post=${formatRatingSnapshot(entry.postRating)} report="${formatReportSummary(playerReport)}" spectators=${formatSpectatorList(record.spectators)}`,
        );
        return record;
      };

      const playBotMatch = async (
        matchNumber: number,
        entry: TournamentPlayer,
        spectators: TournamentPlayer[],
      ): Promise<MatchSetup> => {
        const setup = await createAndJoinMatch(entry.player, null, entry.account, null);
        entry.matchId = setup.matchId;
        const displayWindows: BotPlayer[] = [];
        for (const spectator of spectators) {
          const display = await watchTournamentMatch(spectator, setup);
          if (display) displayWindows.push(display);
        }
        const outcome = await runSingleGame(entry.player, null, setup);
        battleRecords.push(
          await finishTournamentMatch(matchNumber, entry, setup, spectators, outcome),
        );
        await Promise.all(displayWindows.map(closePlayer));
        return setup;
      };

      tournamentPlayers.push(
        await registerPlayer(identities[0]!, 0, null, `${PLAYTHROUGH_ID}:bootstrap`),
      );

      const firstSetup = await createAndJoinMatch(
        tournamentPlayers[0]!.player,
        null,
        tournamentPlayers[0]!.account,
        null,
      );
      tournamentPlayers[0]!.matchId = firstSetup.matchId;
      tournamentPlayers.push(
        await registerPlayer(identities[1]!, 1, firstSetup.matchId, firstSetup.qaRun.runId),
      );
      addSetupSpectator(firstSetup, tournamentPlayers[1]!.player);
      const match1DisplayWindows: BotPlayer[] = [];
      if (OPTIONS.headed) {
        match1DisplayWindows.push(
          await openDisplayWindow(
            tournamentPlayers[1]!.identity.gamertag,
            tournamentPlayers[1]!.identity.index,
            firstSetup.matchId,
            firstSetup.qaRun.runId,
          ),
        );
      }
      let outcome = await runSingleGame(tournamentPlayers[0]!.player, null, firstSetup);
      battleRecords.push(
        await finishTournamentMatch(
          1,
          tournamentPlayers[0]!,
          firstSetup,
          [tournamentPlayers[1]!],
          outcome,
        ),
      );
      await Promise.all(match1DisplayWindows.map(closePlayer));

      const secondSetup = await createAndJoinMatch(
        tournamentPlayers[1]!.player,
        null,
        tournamentPlayers[1]!.account,
        null,
      );
      tournamentPlayers[1]!.matchId = secondSetup.matchId;
      const match2DisplayWindows: BotPlayer[] = [];
      const match2Display0 = await watchTournamentMatch(tournamentPlayers[0]!, secondSetup);
      if (match2Display0) match2DisplayWindows.push(match2Display0);
      tournamentPlayers.push(
        await registerPlayer(identities[2]!, 2, secondSetup.matchId, secondSetup.qaRun.runId),
      );
      addSetupSpectator(secondSetup, tournamentPlayers[2]!.player);
      if (OPTIONS.headed) {
        match2DisplayWindows.push(
          await openDisplayWindow(
            tournamentPlayers[2]!.identity.gamertag,
            tournamentPlayers[2]!.identity.index,
            secondSetup.matchId,
            secondSetup.qaRun.runId,
          ),
        );
      }
      for (let idx = 3; idx < identities.length; idx++) {
        tournamentPlayers.push(
          await registerPlayer(identities[idx]!, idx, null, `${PLAYTHROUGH_ID}:register-extra`),
        );
      }
      outcome = await runSingleGame(tournamentPlayers[1]!.player, null, secondSetup);
      battleRecords.push(
        await finishTournamentMatch(
          2,
          tournamentPlayers[1]!,
          secondSetup,
          [tournamentPlayers[0]!, tournamentPlayers[2]!],
          outcome,
        ),
      );
      await Promise.all(match2DisplayWindows.map(closePlayer));

      for (let idx = 2; idx < tournamentPlayers.length; idx++) {
        const entry = tournamentPlayers[idx]!;
        const spectators = tournamentPlayers.filter((candidate) => candidate !== entry);
        await playBotMatch(idx + 1, entry, spectators);
      }

      const ranked = rankTournament(tournamentPlayers);
      const artifactPath = await writeTournamentReportArtifact({
        mode,
        startingLifepoints: OPTIONS.tournamentStartingLp,
        players: tournamentPlayers,
        records: battleRecords,
        ranked,
      });
      printTournamentReport({
        mode,
        startingLifepoints: OPTIONS.tournamentStartingLp,
        records: battleRecords,
        ranked,
        artifactPath,
      });

      await sleep(2500);
      await Promise.all(tournamentPlayers.map((entry) => closePlayer(entry.player)));
    };

    const runSwarm = async (): Promise<void> => {
      const waveSizes = deriveWaveSizes({
        growth: OPTIONS.cohortGrowth,
        waveCount: OPTIONS.waveCount,
        cohortSize: OPTIONS.cohortSize,
        explicitSizes: parseWaveSizes(OPTIONS.cohortSizesRaw),
        maxBots: Number.MAX_SAFE_INTEGER,
      });
      const totalBotsRequired = waveSizes.reduce((sum, value) => sum + value, 0);
      const records = await ensureBotAccounts(totalBotsRequired);
      logGame(
        PLAYTHROUGH_ID,
        `🧬 Swarm plan=${waveSizes.join(',')} prefix=${OPTIONS.botEmailPrefix} domain=${OPTIONS.botEmailDomain} store=${OPTIONS.botIdentityStore}`,
      );

      let offset = 0;
      for (let waveIndex = 0; waveIndex < waveSizes.length; waveIndex++) {
        const waveSize = waveSizes[waveIndex] ?? 0;
        if (waveSize <= 0) continue;

        const waveRunId = `${PLAYTHROUGH_ID}:wave-${waveIndex + 1}`;
        const waveAccounts = records.slice(offset, offset + waveSize);
        offset += waveSize;
        const wavePlayers = await Promise.all(
          waveAccounts.map(async (record, slot) =>
            launchPlayer(record.gamertag, slot, record.persona),
          ),
        );

        logGame(
          waveRunId,
          `🌊 Wave ${waveIndex + 1}/${waveSizes.length} starting with ${waveSize} bots`,
        );
        await Promise.all(
          wavePlayers.map(async (player, idx) => {
            const account = waveAccounts[idx]!;
            const mode = account.registered ? 'login' : 'register';
            await waitForLobbyReady(player.page, waveRunId);
            await authenticatePlayer(player.page, account, waveRunId, mode);
            if (!account.registered) {
              account.registered = true;
            }
          }),
        );
        await saveBotAccounts(records);

        const matchPromises: Promise<void>[] = [];
        if (OPTIONS.scenario.endsWith('pvb')) {
          for (let idx = 0; idx < wavePlayers.length; idx++) {
            const creator = wavePlayers[idx]!;
            const creatorAccount = waveAccounts[idx] ?? null;
            matchPromises.push(
              (async () => {
                const setup = await createAndJoinMatch(creator, null, creatorAccount, null);
                if (OPTIONS.spectator && idx === 0) {
                  setup.spectator = await launchPlayer(uniqueName('Spectator'), waveSize + 1);
                  await joinSpectator(
                    setup.spectator,
                    setup.matchId,
                    setup.qaRun.runId,
                    setup.gameRunId,
                  );
                }
                const outcome = await runSingleGame(creator, null, setup);
                if (!outcome) {
                  setup.qaRun.finish({
                    status: 'failure',
                    durationMs: 0,
                    failureReason: 'no_decisive_outcome',
                    failureMessage: 'UI swarm playthrough stopped without a decisive outcome',
                  });
                  await closePlayer(setup.spectator);
                  return;
                }
                setup.qaRun.finish({
                  status: 'success',
                  durationMs: 0,
                  outcomeText: `${outcome.winner.name} defeated ${outcome.loser?.name ?? 'server-bot'}`,
                  reconnectCount: setup.reconnectCount,
                });
                await logoutPlayer(creator.page, setup.gameRunId, creator.operativeId);
                await closePlayer(setup.spectator);
                await closePlayer(creator);
              })(),
            );
          }
        } else {
          for (let idx = 0; idx + 1 < wavePlayers.length; idx += 2) {
            const creator = wavePlayers[idx]!;
            const joiner = wavePlayers[idx + 1]!;
            const creatorAccount = waveAccounts[idx]!;
            const joinerAccount = waveAccounts[idx + 1]!;
            matchPromises.push(
              (async () => {
                const setup = await createAndJoinMatch(
                  creator,
                  joiner,
                  creatorAccount,
                  joinerAccount,
                );
                if (OPTIONS.spectator && idx === 0) {
                  setup.spectator = await launchPlayer(uniqueName('Spectator'), waveSize + 1);
                  await joinSpectator(
                    setup.spectator,
                    setup.matchId,
                    setup.qaRun.runId,
                    setup.gameRunId,
                  );
                }
                const outcome = await runSingleGame(creator, joiner, setup);
                if (!outcome) {
                  setup.qaRun.finish({
                    status: 'failure',
                    durationMs: 0,
                    failureReason: 'no_decisive_outcome',
                    failureMessage: 'UI swarm playthrough stopped without a decisive outcome',
                  });
                  await closePlayer(setup.spectator);
                  return;
                }
                setup.qaRun.finish({
                  status: 'success',
                  durationMs: 0,
                  outcomeText: `${outcome.winner.name} defeated ${outcome.loser?.name ?? 'unknown'}`,
                  reconnectCount: setup.reconnectCount,
                });
                if (OPTIONS.reloginBetweenWaves) {
                  await Promise.all([
                    logoutPlayer(creator.page, setup.gameRunId, creator.operativeId),
                    logoutPlayer(joiner.page, setup.gameRunId, joiner.name),
                  ]);
                } else if (useAuth) {
                  await Promise.all([
                    purgeAccount(creator, creatorAccount),
                    purgeAccount(joiner, joinerAccount),
                  ]);
                }
                await closePlayer(setup.spectator);
                await closePlayer(creator);
                await closePlayer(joiner);
              })(),
            );
          }
          if (wavePlayers.length % 2 === 1) {
            const leftoverIndex = wavePlayers.length - 1;
            const creator = wavePlayers[leftoverIndex]!;
            const creatorAccount = waveAccounts[leftoverIndex]!;
            matchPromises.push(
              (async () => {
                const setup = await createAndJoinMatch(creator, null, creatorAccount, null);
                const outcome = await runSingleGame(creator, null, setup);
                if (!outcome) {
                  setup.qaRun.finish({
                    status: 'failure',
                    durationMs: 0,
                    failureReason: 'no_decisive_outcome',
                    failureMessage: 'UI swarm playthrough stopped without a decisive outcome',
                  });
                  await closePlayer(setup.spectator);
                  return;
                }
                setup.qaRun.finish({
                  status: 'success',
                  durationMs: 0,
                  outcomeText: `${outcome.winner.name} defeated ${outcome.loser?.name ?? 'server-bot'}`,
                  reconnectCount: setup.reconnectCount,
                });
                if (useAuth) {
                  await purgeAccount(creator, creatorAccount);
                }
                await closePlayer(setup.spectator);
                await closePlayer(creator);
              })(),
            );
          }
        }

        await Promise.all(matchPromises);
        if (OPTIONS.reloginBetweenWaves) {
          logGame(waveRunId, `↩️ Wave ${waveIndex + 1} finished; identities retained for relogin.`);
        }
      }
    };

    if (OPTIONS.miniTournament) {
      await runMiniTournament();
      console.log('🎉 Mini tournament automation finished.');
      return;
    }

    if (OPTIONS.swarm) {
      await runSwarm();
      console.log('🎉 Swarm automation finished.');
      return;
    }

    console.log('[main] Launching P1...');
    let p1: BotPlayer = await launchPlayer(uniqueName('Foo'), 0);
    console.log('[main] Launching P2...');
    let p2: BotPlayer = await launchPlayer(uniqueName('Bar'), 1);

    console.log(
      `ℹ️ Settings: MAX_GAMES=${OPTIONS.maxGames}, MAX_MOVES_PER_GAME=${OPTIONS.maxMovesPerGame}, FORFEIT_CHANCE=${OPTIONS.forfeitChance}, WINDOW=${OPTIONS.windowWidth}x${OPTIONS.windowHeight}, DEVTOOLS=${OPTIONS.devtoolsEnabled}, SLOW_MO_MS=${OPTIONS.slowMoMs}, SPECTATOR=${OPTIONS.spectator}`,
    );

    const creatorAccount = useAuth ? { ...buildAuthAccount(1), registered: false } : null;
    const joinerAccount =
      OPTIONS.scenario.endsWith('pvp') && useAuth
        ? { ...buildAuthAccount(2), registered: false }
        : null;

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

    if (useAuth) {
      console.log('[main] Purging accounts...');
      if (p1 && creatorAccount) await purgeAccount(p1, creatorAccount);
      if (p2 && joinerAccount) await purgeAccount(p2, joinerAccount);
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
