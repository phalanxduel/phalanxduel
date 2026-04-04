#!/usr/bin/env tsx

import '../../scripts/instrument-cli.js';
import { createConnection } from 'node:net';
import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { beginQaRun } from './telemetry.js';
import { loadScenario, type GameScenario } from './scenario.js';

type ScreenshotMode = 'turn' | 'action' | 'phase';
type FailureReason = 'timeout' | 'stalled' | 'selector_error' | 'runtime_error';
type DamageMode = 'classic' | 'cumulative';
type PlayerType = 'human' | 'bot-random' | 'bot-heuristic';

interface CliOptions {
  baseUrl: string;
  seed?: number;
  batch: number;
  maxTurns: number;
  maxActionRetries: number;
  maxIdleMs: number;
  screenshotMode: ScreenshotMode;
  outDir: string;
  headed: boolean;
  damageModes: DamageMode[];
  startingLifepoints: number[];
  p1: PlayerType;
  p2: PlayerType;
  quickStart: boolean;
  scenarioPath?: string;
}

interface RunEvent {
  at: string;
  type: 'action' | 'state' | 'result' | 'error';
  actor?: 'A' | 'B' | 'S';
  detail: string;
}

interface RunManifest {
  seed: number;
  startAt: string;
  endAt: string;
  durationMs: number;
  baseUrl: string;
  damageMode: DamageMode;
  startingLifepoints: number;
  status: 'success' | 'failure';
  failureReason?: FailureReason;
  failureMessage?: string;
  turnCount: number;
  actionCount: number;
  screenshotCount: number;
  outcomeText: string | null;
  screenshotMode: ScreenshotMode;
  p1: PlayerType;
  p2: PlayerType;
}

interface PlaythroughScenario {
  damageMode: DamageMode;
  startingLifepoints: number;
  p1: PlayerType;
  p2: PlayerType;
  scenarioPath?: string;
  fileData?: GameScenario;
}

type PageLike = {
  goto: (url: string, opts?: unknown) => Promise<unknown>;
  locator: (selector: string) => {
    click: () => Promise<void>;
    fill: (value: string) => Promise<void>;
    selectOption: (value: string) => Promise<void>;
    count: () => Promise<number>;
    allTextContents: () => Promise<string[]>;
    textContent: () => Promise<string | null>;
    isVisible: () => Promise<boolean>;
    dispatchEvent: (event: string) => Promise<void>;
    first: () => unknown;
    nth: (index: number) => unknown;
    waitFor: (opts?: {
      state?: 'attached' | 'detached' | 'visible' | 'hidden';
      timeout?: number;
    }) => Promise<void>;
  };
  waitForTimeout: (ms: number) => Promise<void>;
  screenshot: (opts: { path: string; fullPage: boolean }) => Promise<void>;
  on: (event: 'console' | 'dialog', cb: (arg: any) => void | Promise<void>) => void;
};

function showHelp(): void {
  console.log(`
PHALANX-QA-PLAYTHROUGH(1) - Automated Tactical Combat Simulator

NAME
    qa-playthrough - Run automated game simulations via Playwright

SYNOPSIS
    tsx bin/qa/simulate-headless.ts [OPTIONS]

DESCRIPTION
    Boots two browser instances, joins a match, and plays until victory or
    the turn limit is reached. Used for regression testing and balance analysis.

OPTIONS
    --base-url URL
        The target environment (default: http://127.0.0.1:5173).

    --seed NUMBER
        Inject a specific RNG seed for deterministic simulation.

    --batch NUMBER
        Number of games to run sequentially (default: 1).

    --damage-mode MODE
        Set one mode for all runs: classic or cumulative.

    --damage-modes LIST
        Comma-separated mode permutation set.
        Example: classic,cumulative

    --starting-lp NUMBER
        Set one starting LP for all runs.

    --starting-lps LIST
        Comma-separated starting LP permutation set.
        Example: 1,20,100,500

    --max-turns NUMBER
        Hard limit on turns before declaring a draw/stall (default: 140).

    --screenshot-mode turn|action|phase
        When to capture visual artifacts (default: turn).

    --out-dir PATH
        Where to save logs and screenshots (default: artifacts/playthrough).

    --p1 human|bot-random|bot-heuristic
        Player 1 type (default: human). Bot types use engine AI.

    --p2 human|bot-random|bot-heuristic
        Player 2 type (default: human). Bot types use server-side AI.
        When both are bots, runs engine-only (no browser).

    --quick-start
        Pre-deploy cards and skip DeploymentPhase (default for auto modes).

    --no-quick-start
        Disable quick start even for auto modes.

    --scenario PATH
        Path to a generated scenario.json file to validate.
        Overrides seed, damage-modes, starting-lps, p1, and p2.

    --headed
        Run browsers in visible mode (default: headless).

    --help
        Display this manual page.

EXIT STATUS
    0   Success (game completed normally)
    1   Failure (browser crash or simulation stall)
`);
}

function parseArgs(argv: string[]): CliOptions | null {
  if (argv.includes('--help') || argv.includes('-h')) {
    showHelp();
    return null;
  }

  const opts: CliOptions = {
    baseUrl: 'http://127.0.0.1:5173',
    batch: 1,
    maxTurns: 140,
    maxActionRetries: 6,
    maxIdleMs: 20000,
    screenshotMode: 'turn',
    outDir: 'artifacts/playthrough',
    headed: false,
    damageModes: ['classic'],
    startingLifepoints: [20],
    p1: 'human',
    p2: 'human',
    quickStart: false, // Will be set to true for auto modes below
    scenarioPath: undefined as string | undefined,
  };

  const parseDamageModeList = (raw: string): DamageMode[] => {
    const modes = raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    const parsed: DamageMode[] = [];
    for (const mode of modes) {
      if (mode === 'classic' || mode === 'cumulative') {
        if (!parsed.includes(mode)) parsed.push(mode);
      }
    }
    return parsed.length > 0 ? parsed : ['classic'];
  };

  const parseStartingLpList = (raw: string): number[] => {
    const parsed = raw
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isFinite(n))
      .map((n) => Math.max(1, Math.min(500, Math.trunc(n))));
    const uniq: number[] = [];
    for (const value of parsed) {
      if (!uniq.includes(value)) uniq.push(value);
    }
    return uniq.length > 0 ? uniq : [20];
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const v = argv[i + 1];
    if (a === '--base-url' && v) opts.baseUrl = v;
    if (a === '--seed' && v) opts.seed = Number(v);
    if (a === '--batch' && v) opts.batch = Math.max(1, Number(v));
    if (a === '--damage-mode' && v && (v === 'classic' || v === 'cumulative')) {
      opts.damageModes = [v];
    }
    if (a === '--damage-modes' && v) opts.damageModes = parseDamageModeList(v);
    if (a === '--starting-lp' && v) {
      const n = Number(v);
      if (Number.isFinite(n)) {
        opts.startingLifepoints = [Math.max(1, Math.min(500, Math.trunc(n)))];
      }
    }
    if (a === '--starting-lps' && v) opts.startingLifepoints = parseStartingLpList(v);
    if (a === '--max-turns' && v) opts.maxTurns = Math.max(1, Number(v));
    if (a === '--max-action-retries' && v) opts.maxActionRetries = Math.max(1, Number(v));
    if (a === '--max-idle-ms' && v) opts.maxIdleMs = Math.max(1000, Number(v));
    if (a === '--screenshot-mode' && v && (v === 'turn' || v === 'action' || v === 'phase'))
      opts.screenshotMode = v;
    if (a === '--out-dir' && v) opts.outDir = v;
    if (a === '--headed') opts.headed = true;
    if (a === '--p1' && v && isPlayerType(v)) opts.p1 = v;
    if (a === '--p2' && v && isPlayerType(v)) opts.p2 = v;
    if (a === '--quick-start') opts.quickStart = true;
    if (a === '--no-quick-start') opts.quickStart = false;
    if (a === '--scenario' && v) opts.scenarioPath = v;
  }

  // Default quickStart to true for auto (bot-vs-bot) modes
  const isAuto = opts.p1.startsWith('bot-') && opts.p2.startsWith('bot-');
  if (!argv.includes('--no-quick-start') && isAuto) {
    opts.quickStart = true;
  }

  return opts;
}

function isPlayerType(v: string): v is PlayerType {
  return v === 'human' || v === 'bot-random' || v === 'bot-heuristic';
}

function tsSlug(d: Date): string {
  return d.toISOString().replace(/[:.]/g, '-');
}

function parseTurn(phaseText: string | null): number {
  if (!phaseText) return 0;
  const m = phaseText.match(/Turn:\s*(\d+)/i);
  return m ? Number(m[1]) : 0;
}

function parsePhase(phaseText: string | null): string {
  if (!phaseText) return 'unknown';
  const m = phaseText.match(/Phase:\s*(.+?)\s*\|/i);
  return m ? m[1]!.trim() : 'unknown';
}

function pickRandomIndex(len: number): number {
  return Math.floor(Math.random() * len);
}

async function chooseRandomClickable(page: PageLike, selector: string): Promise<boolean> {
  const count = await page.locator(selector).count();
  if (count === 0) {
    // console.log(`  [BOT] No elements found for selector: ${selector}`);
    return false;
  }
  const idx = pickRandomIndex(count);
  // console.log(`  [BOT] Clicking ${selector} (index ${idx} of ${count})`);
  await (page.locator(selector).nth(idx) as { click: () => Promise<void> }).click();
  return true;
}

async function runOne(
  baseSeed: number,
  opts: CliOptions,
  scenario: PlaythroughScenario,
): Promise<RunManifest> {
  let playwright: {
    chromium: { launch: (opts: { headless: boolean }) => Promise<unknown> };
  };
  try {
    playwright = (await import('playwright')) as typeof playwright;
  } catch {
    throw new Error('Missing dependency: playwright. Install with `pnpm add -D playwright`.');
  }

  const start = new Date();
  const runDir = join(
    opts.outDir,
    `${tsSlug(start)}_${baseSeed}_${scenario.damageMode}_lp${scenario.startingLifepoints}`,
  );
  const shotsDir = join(runDir, 'screenshots');
  await mkdir(shotsDir, { recursive: true });
  const qaRun = beginQaRun({
    tool: 'simulate-headless',
    runId: `headless-${tsSlug(start)}-${baseSeed}`,
    baseUrl: opts.baseUrl,
    seed: baseSeed,
    damageMode: scenario.damageMode,
    startingLifepoints: scenario.startingLifepoints,
    p1: scenario.p1,
    p2: scenario.p2,
    headed: opts.headed,
    scenarioPath: scenario.scenarioPath,
  });

  const events: RunEvent[] = [];
  const logEvent = async (e: RunEvent) => {
    events.push(e);
    await appendFile(join(runDir, 'events.ndjson'), `${JSON.stringify(e)}\n`);
  };

  const browser = await playwright.chromium.launch({ headless: !opts.headed });
  const contextA = await (browser as { newContext: () => Promise<unknown> }).newContext();
  const contextB = await (browser as { newContext: () => Promise<unknown> }).newContext();
  const contextS = await (browser as { newContext: () => Promise<unknown> }).newContext();
  const pageA = await (contextA as { newPage: () => Promise<PageLike> }).newPage();
  const pageB = await (contextB as { newPage: () => Promise<PageLike> }).newPage();
  const pageS = await (contextS as { newPage: () => Promise<PageLike> }).newPage();
  let activePage: PageLike | null = null;

  const consoleErrors: string[] = [];
  for (const [actor, p] of [
    ['A', pageA],
    ['B', pageB],
    ['S', pageS],
  ] as const) {
    p.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[${actor}] ${msg.text()}`);
      }
    });
    p.on('dialog', async (dialog) => {
      // Auto-accept any confirmation dialogs (forfeit, lethal pass)
      await (dialog as { accept: () => Promise<void> }).accept();
    });
  }

  let shotCount = 0;
  const screenshot = async (label: string) => {
    const currentPage = activePage ?? pageS;
    const phaseText = await currentPage
      .locator('[data-testid="phase-indicator"]')
      .textContent()
      .catch(() => null);
    const turn = parseTurn(phaseText);
    const phase = parsePhase(phaseText).replace(/\s+/g, '-').toLowerCase();
    const file = `t${String(turn).padStart(4, '0')}_${phase}_${String(++shotCount).padStart(4, '0')}_${label}.png`;
    await currentPage.screenshot({
      path: join(shotsDir, file),
      fullPage: true,
    });
  };

  let actionCount = 0;
  let lastTurn = -1;
  let lastPhase = '';
  let lastProgressAt = Date.now();
  let failureReason: FailureReason | undefined;
  let failureMessage: string | undefined;
  let outcomeText: string | null = null;

  try {
    await logEvent({
      at: new Date().toISOString(),
      type: 'state',
      detail: `start seed=${baseSeed}`,
    });

    const isSP = scenario.p1 === 'human' && scenario.p2 !== 'human';

    await pageA.goto(`${opts.baseUrl}/?seed=${baseSeed}`);
    await pageA.locator('[data-testid="lobby-name-input"]').fill('Bot A');
    await pageA.locator('[data-testid="lobby-damage-mode"]').selectOption(scenario.damageMode);
    await pageA
      .locator('[data-testid="lobby-starting-lp"]')
      .fill(String(scenario.startingLifepoints));
    await pageA.locator('[data-testid="lobby-starting-lp"]').dispatchEvent('change');

    if (isSP) {
      // Single-player: click "Play vs Bot" button — server-side bot handles P2
      const botTestId =
        scenario.p2 === 'bot-heuristic' ? 'create-bot-heuristic-match' : 'create-bot-match';
      await pageA.locator(`[data-testid="${botTestId}"]`).click();
    } else {
      // PvP: create match, then have second browser join
      await pageA.locator('[data-testid="lobby-create-btn"]').click();
      await pageA
        .locator('[data-testid="waiting-match-id"]')
        .waitFor({ state: 'visible', timeout: 10000 });
      const matchId = (
        await pageA.locator('[data-testid="waiting-match-id"]').textContent()
      )?.trim();
      if (!matchId) {
        throw new Error('match id not found on waiting screen');
      }
      qaRun.bindMatch(matchId);

      await pageB.goto(opts.baseUrl);
      await pageB.locator('[data-testid="lobby-name-input"]').fill('Bot B');
      await pageB.locator('[data-testid="lobby-join-match-input"]').fill(matchId);
      await pageB.locator('[data-testid="lobby-join-btn"]').click();

      await pageS.goto(`${opts.baseUrl}/?watch=${matchId}`);
    }
    const observerPage = isSP ? pageA : pageS;
    await observerPage
      .locator('[data-testid="game-layout"]')
      .waitFor({ state: 'visible', timeout: 10000 });
    await screenshot('start');

    while (true) {
      if (
        await observerPage
          .locator('[data-testid="game-over"]')
          .isVisible()
          .catch(() => false)
      ) {
        const resultLocator = observerPage.locator('[data-testid="game-over-result"]');
        await resultLocator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        outcomeText = await resultLocator.textContent();
        await screenshot('game-over');
        break;
      }

      const currentPage = activePage ?? observerPage;
      const phaseText = await currentPage.locator('[data-testid="phase-indicator"]').textContent();
      const turn = parseTurn(phaseText);
      const phase = parsePhase(phaseText);

      if (turn > opts.maxTurns) {
        failureReason = 'timeout';
        failureMessage = `max turns exceeded (${opts.maxTurns})`;
        break;
      }

      if (turn !== lastTurn || phase !== lastPhase) {
        lastTurn = turn;
        lastPhase = phase;
        lastProgressAt = Date.now();
        qaRun.annotate('qa.phase', { 'game.phase': phase, 'game.turn': turn });
        await logEvent({
          at: new Date().toISOString(),
          type: 'state',
          detail: `turn=${turn} phase=${phase}`,
        });
        if (opts.screenshotMode === 'turn' || opts.screenshotMode === 'phase') {
          await screenshot('state-change');
        }
      } else if (Date.now() - lastProgressAt > opts.maxIdleMs) {
        failureReason = 'stalled';
        failureMessage = `no visible progress for ${opts.maxIdleMs}ms`;
        qaRun.recordPattern(
          'stalled_run',
          { 'game.phase': phase, 'game.turn': turn },
          SeverityNumber.WARN,
          'WARN',
        );
        break;
      }

      if (isSP) {
        // SP mode: only P1 (pageA) takes actions; server bot handles P2
        const turnA = await pageA
          .locator('[data-testid="turn-indicator"]')
          .textContent()
          .catch(() => '');
        activePage = /your turn|reinforce your column/i.test(turnA ?? '') ? pageA : null;
      } else {
        // PvP mode: check both players
        const turnA = await pageA
          .locator('[data-testid="turn-indicator"]')
          .textContent()
          .catch(() => '');
        const turnB = await pageB
          .locator('[data-testid="turn-indicator"]')
          .textContent()
          .catch(() => '');
        activePage = /your turn|reinforce your column/i.test(turnA ?? '')
          ? pageA
          : /your turn|reinforce your column/i.test(turnB ?? '')
            ? pageB
            : null;
      }

      if (!activePage) {
        await observerPage.waitForTimeout(100);
        continue;
      }

      const targetAction = scenario.fileData?.actions[actionCount] ?? null;

      let success = false;
      let retries = 0;
      while (!success && retries < opts.maxActionRetries) {
        retries++;

        if (targetAction) {
          // Drive the specific action from the scenario file
          if (targetAction.type === 'pass' || targetAction.type === 'system:init') {
            success = await activePage
              .locator('[data-testid="combat-pass-btn"], [data-testid="combat-skip-reinforce-btn"]')
              .click()
              .then(() => true)
              .catch(() => false);
            if (!success) {
              // Sometimes it's init phase, which doesn't really have a pass btn, just wait
              success = true;
            }
          } else if (targetAction.type === 'deploy') {
            await activePage.locator(`[data-cardid="${targetAction.cardId}"]`).click();
            success = await activePage
              .locator(
                `[data-testid^="player-cell-"][data-testid$="-c${targetAction.column}"].valid-target`,
              )
              .click()
              .then(() => true)
              .catch(() => false);
          } else if (targetAction.type === 'attack') {
            await activePage
              .locator(`[data-testid="player-cell-r0-c${targetAction.attackingColumn}"]`)
              .click();
            success = await activePage
              .locator('.bf-cell.valid-target')
              .click()
              .then(() => true)
              .catch(() => false);
            if (!success)
              success = await activePage
                .locator(
                  '[data-testid="combat-pass-btn"], [data-testid="combat-skip-reinforce-btn"]',
                )
                .click()
                .then(() => true)
                .catch(() => false);
          } else if (targetAction.type === 'reinforce') {
            await activePage.locator(`[data-cardid="${targetAction.cardId}"]`).click();
            success = await activePage
              .locator('.bf-cell.reinforce-col.valid-target')
              .click()
              .then(() => true)
              .catch(() => false);
          }
        } else if (/Deployment/i.test(phase)) {
          const pickedCard = await chooseRandomClickable(
            activePage,
            '[data-testid^="hand-card-"].playable',
          );
          if (!pickedCard) break;
          // After clicking card, click an empty cell
          success = await chooseRandomClickable(
            activePage,
            '[data-testid^="player-cell-"].empty.valid-target',
          );
        } else if (/AttackPhase/i.test(phase)) {
          const pickedAttacker = await chooseRandomClickable(
            activePage,
            '[data-testid^="player-cell-r0-c"].occupied',
          );
          if (!pickedAttacker) {
            success = await chooseRandomClickable(
              activePage,
              '[data-testid="combat-pass-btn"], [data-testid="combat-skip-reinforce-btn"]',
            );
          } else {
            // In v1.0, valid-target is ONLY in the same column as selected attacker
            success = await chooseRandomClickable(activePage, '.bf-cell.valid-target');
            if (!success) {
              success = await chooseRandomClickable(
                activePage,
                '[data-testid="combat-pass-btn"], [data-testid="combat-skip-reinforce-btn"]',
              );
            }
          }
        } else if (/Reinforce/i.test(phase)) {
          const pickedCard = await chooseRandomClickable(
            activePage,
            '[data-testid^="hand-card-"].reinforce-playable',
          );
          if (!pickedCard) break;
          // After selecting card, click the reinforcement column target cell
          success = await chooseRandomClickable(activePage, '.bf-cell.reinforce-col.valid-target');
        } else {
          break;
        }
      }

      if (!success) {
        failureReason = 'selector_error';
        failureMessage = `failed action in phase=${phase} after ${opts.maxActionRetries} retries`;
        break;
      }

      actionCount++;
      qaRun.annotate('qa.action', {
        'game.phase': phase,
        'game.turn': turn,
      });
      await logEvent({
        at: new Date().toISOString(),
        type: 'action',
        detail: `turn=${turn} phase=${phase}`,
      });
      if (opts.screenshotMode === 'action') {
        await screenshot('action');
      }
      await pageS.waitForTimeout(80);
    }
  } catch (err) {
    failureReason = failureReason ?? 'runtime_error';
    failureMessage = failureMessage ?? (err instanceof Error ? err.message : String(err));
    qaRun.recordPattern(
      'runtime_error',
      { 'qa.failure_message': failureMessage },
      SeverityNumber.ERROR,
      'ERROR',
    );
    await logEvent({ at: new Date().toISOString(), type: 'error', detail: failureMessage });
  } finally {
    if (failureReason) {
      await screenshot('failure-final').catch(() => undefined);
      await writeFile(join(runDir, 'console-errors.log'), `${consoleErrors.join('\n')}\n`);
    }
    await (browser as { close: () => Promise<void> }).close();
  }

  const end = new Date();
  const manifest: RunManifest = {
    seed: baseSeed,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    durationMs: end.getTime() - start.getTime(),
    baseUrl: opts.baseUrl,
    damageMode: scenario.damageMode,
    startingLifepoints: scenario.startingLifepoints,
    status: failureReason ? 'failure' : 'success',
    failureReason,
    failureMessage,
    turnCount: lastTurn < 0 ? 0 : lastTurn,
    actionCount,
    screenshotCount: shotCount,
    outcomeText,
    screenshotMode: opts.screenshotMode,
    p1: scenario.p1,
    p2: scenario.p2,
  };
  await writeFile(join(runDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  qaRun.finish({
    status: manifest.status,
    durationMs: manifest.durationMs,
    turnCount: manifest.turnCount,
    actionCount: manifest.actionCount,
    failureReason: manifest.failureReason,
    failureMessage: manifest.failureMessage,
    outcomeText: manifest.outcomeText,
  });
  return manifest;
}

/**
 * Bot-vs-Bot: pure engine loop, no browser needed.
 * Imports the engine directly and alternates computeBotAction calls.
 */
async function runBotVsBot(
  baseSeed: number,
  opts: CliOptions,
  scenario: PlaythroughScenario,
): Promise<RunManifest> {
  const { createInitialState, applyAction, computeBotAction } =
    await import('../../engine/dist/index.js');

  const start = new Date();
  const runDir = join(
    opts.outDir,
    `${tsSlug(start)}_${baseSeed}_${scenario.damageMode}_lp${scenario.startingLifepoints}_auto`,
  );
  await mkdir(runDir, { recursive: true });
  const autoMatchId = `qa-auto-${baseSeed}`;
  const qaRun = beginQaRun({
    tool: 'simulate-headless',
    runId: `headless-auto-${tsSlug(start)}-${baseSeed}`,
    baseUrl: opts.baseUrl,
    seed: baseSeed,
    damageMode: scenario.damageMode,
    startingLifepoints: scenario.startingLifepoints,
    p1: scenario.p1,
    p2: scenario.p2,
    scenarioPath: scenario.scenarioPath,
  });
  qaRun.bindMatch(autoMatchId);

  const p1Strategy = scenario.p1 === 'bot-heuristic' ? 'heuristic' : 'random';
  const p2Strategy = scenario.p2 === 'bot-heuristic' ? 'heuristic' : 'random';

  const initialState = createInitialState({
    matchId: autoMatchId,
    players: [
      { id: 'bot-p1', name: `Bot-${p1Strategy}` },
      { id: 'bot-p2', name: `Bot-${p2Strategy}` },
    ],
    rngSeed: baseSeed,
    gameOptions: {
      damageMode: scenario.damageMode,
      startingLifepoints: scenario.startingLifepoints,
      classicDeployment: true,
      quickStart: opts.quickStart,
    },
  });
  // Transition from StartTurn to first actionable phase via system:init
  let state = applyAction(initialState, {
    type: 'system:init',
    timestamp: new Date().toISOString(),
  });

  let actionCount = 0;
  let failureReason: FailureReason | undefined;
  let failureMessage: string | undefined;
  let outcomeText: string | null = null;

  try {
    while (state.phase !== 'gameOver') {
      if (state.turnNumber > opts.maxTurns) {
        failureReason = 'timeout';
        failureMessage = `max turns exceeded (${opts.maxTurns})`;
        qaRun.recordPattern(
          'timeout',
          { 'game.turn': state.turnNumber },
          SeverityNumber.WARN,
          'WARN',
        );
        break;
      }

      const activeIdx = state.activePlayerIndex as 0 | 1;
      const strategy = activeIdx === 0 ? p1Strategy : p2Strategy;
      const turnSeed = baseSeed + state.turnNumber + activeIdx;
      const action = computeBotAction(state, activeIdx, {
        strategy: strategy as 'random' | 'heuristic',
        seed: turnSeed,
      });

      const scenarioActions = scenario.fileData?.actions ?? null;
      if (scenarioActions && actionCount < scenarioActions.length) {
        const expected = scenarioActions[actionCount]!;
        if (expected.type !== action.type) {
          throw new Error(
            `Scenario divergence at action ${actionCount}: expected ${expected.type}, got ${action.type}`,
          );
        }
      }

      state = applyAction(state, action);
      actionCount++;
      qaRun.annotate('qa.action', {
        'action.type': action.type,
        'game.turn': state.turnNumber,
      });
    }

    if (state.phase === 'gameOver') {
      const outcome = state.outcome as { winnerIndex?: number; victoryType?: string } | undefined;
      outcomeText =
        outcome?.winnerIndex !== undefined
          ? `Player ${outcome.winnerIndex + 1} wins (${outcome.victoryType})`
          : 'Draw';

      const expectedHash = scenario.fileData?.finalStateHash ?? null;
      const lastTx = state.transactionLog?.at(-1) as { stateHashAfter?: string } | undefined;
      if (expectedHash && lastTx?.stateHashAfter && lastTx.stateHashAfter !== expectedHash) {
        failureReason = 'runtime_error';
        failureMessage = `Hash mismatch! expected ${expectedHash}, got ${lastTx.stateHashAfter}`;
        outcomeText = 'Hash Mismatch';
      }
    }
  } catch (err) {
    failureReason = 'runtime_error';
    failureMessage = err instanceof Error ? err.message : String(err);
    qaRun.recordPattern(
      'runtime_error',
      { 'qa.failure_message': failureMessage },
      SeverityNumber.ERROR,
      'ERROR',
    );
  }

  const end = new Date();
  const manifest: RunManifest = {
    seed: baseSeed,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    durationMs: end.getTime() - start.getTime(),
    baseUrl: opts.baseUrl,
    damageMode: scenario.damageMode,
    startingLifepoints: scenario.startingLifepoints,
    status: failureReason ? 'failure' : 'success',
    failureReason,
    failureMessage,
    turnCount: state.turnNumber,
    actionCount,
    screenshotCount: 0,
    outcomeText,
    screenshotMode: opts.screenshotMode,
    p1: scenario.p1,
    p2: scenario.p2,
  };
  await writeFile(join(runDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  qaRun.finish({
    status: manifest.status,
    durationMs: manifest.durationMs,
    turnCount: manifest.turnCount,
    actionCount: manifest.actionCount,
    failureReason: manifest.failureReason,
    failureMessage: manifest.failureMessage,
    outcomeText: manifest.outcomeText,
  });
  return manifest;
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

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts) return;

  const isAllAuto = opts.p1 !== 'human' && opts.p2 !== 'human';
  if (!isAllAuto) {
    await checkPortReachable(opts.baseUrl);
  }

  const seedStart = opts.seed ?? Math.floor(Date.now() % Number.MAX_SAFE_INTEGER);
  const scenarios: PlaythroughScenario[] = [];

  if (opts.scenarioPath) {
    const data = await loadScenario(opts.scenarioPath);
    scenarios.push({
      damageMode: data.damageMode,
      startingLifepoints: data.startingLifepoints,
      p1: data.p1,
      p2: data.p2,
      scenarioPath: opts.scenarioPath,
      fileData: data,
    });
    opts.batch = 1;
    opts.seed = data.seed;
    opts.damageModes = [data.damageMode];
    opts.startingLifepoints = [data.startingLifepoints];
  } else {
    for (const damageMode of opts.damageModes) {
      for (const startingLifepoints of opts.startingLifepoints) {
        scenarios.push({ damageMode, startingLifepoints, p1: opts.p1, p2: opts.p2 });
      }
    }
  }

  await mkdir(opts.outDir, { recursive: true });
  const manifests: RunManifest[] = [];
  let seedOffset = 0;

  for (const scenario of scenarios) {
    const modeLabel =
      scenario.p1 !== 'human' && scenario.p2 !== 'human'
        ? `auto(${scenario.p1}×${scenario.p2})`
        : scenario.p2 !== 'human'
          ? `sp(${scenario.p2})`
          : 'pvp';
    console.log(
      `Scenario start: ${modeLabel} mode=${scenario.damageMode} startingLP=${scenario.startingLifepoints} runs=${opts.batch}`,
    );
    for (let i = 0; i < opts.batch; i++) {
      const seed = seedStart + seedOffset;
      seedOffset++;
      const isAuto = scenario.p1 !== 'human' && scenario.p2 !== 'human';
      const manifest = isAuto
        ? await runBotVsBot(seed, opts, scenario)
        : await runOne(seed, opts, scenario);
      manifests.push(manifest);
      const status = manifest.status === 'success' ? 'PASS' : 'FAIL';
      console.log(
        `[${status}] ${modeLabel} mode=${manifest.damageMode} lp=${manifest.startingLifepoints} seed=${manifest.seed} turns=${manifest.turnCount} actions=${manifest.actionCount} duration=${manifest.durationMs}ms`,
      );
      if (manifest.failureReason) {
        console.log(`  reason=${manifest.failureReason} msg=${manifest.failureMessage ?? ''}`);
      }
    }
  }

  const success = manifests.filter((m) => m.status === 'success').length;
  const failedRuns = manifests
    .filter((m) => m.status === 'failure')
    .map(
      (m) => `p1=${m.p1},p2=${m.p2},mode=${m.damageMode},lp=${m.startingLifepoints},seed=${m.seed}`,
    );
  const avgTurns = manifests.length
    ? Math.round(manifests.reduce((sum, m) => sum + m.turnCount, 0) / manifests.length)
    : 0;
  const avgActions = manifests.length
    ? Math.round(manifests.reduce((sum, m) => sum + m.actionCount, 0) / manifests.length)
    : 0;
  console.log(`Summary: ${success}/${manifests.length} succeeded, avgTurns=${avgTurns}`);
  console.log(`Summary: scenarios=${scenarios.length}, avgActions=${avgActions}`);
  for (const scenario of scenarios) {
    const scenarioRuns = manifests.filter(
      (m) =>
        m.damageMode === scenario.damageMode &&
        m.startingLifepoints === scenario.startingLifepoints,
    );
    const scenarioSuccess = scenarioRuns.filter((m) => m.status === 'success').length;
    const scenarioAvgTurns = scenarioRuns.length
      ? Math.round(scenarioRuns.reduce((sum, m) => sum + m.turnCount, 0) / scenarioRuns.length)
      : 0;
    console.log(
      `Scenario summary: mode=${scenario.damageMode} lp=${scenario.startingLifepoints} success=${scenarioSuccess}/${scenarioRuns.length} avgTurns=${scenarioAvgTurns}`,
    );
  }
  if (failedRuns.length > 0) {
    console.log(`Failed runs: ${failedRuns.join(' | ')}`);
    process.exitCode = 1;
  }
}

void main();
