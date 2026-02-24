#!/usr/bin/env tsx

import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';

type ScreenshotMode = 'turn' | 'action' | 'phase';
type FailureReason = 'timeout' | 'stalled' | 'selector_error' | 'runtime_error';

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
  status: 'success' | 'failure';
  failureReason?: FailureReason;
  failureMessage?: string;
  turnCount: number;
  actionCount: number;
  screenshotCount: number;
  outcomeText: string | null;
  screenshotMode: ScreenshotMode;
}

type PageLike = {
  goto: (url: string, opts?: unknown) => Promise<unknown>;
  locator: (selector: string) => {
    click: () => Promise<void>;
    fill: (value: string) => Promise<void>;
    count: () => Promise<number>;
    allTextContents: () => Promise<string[]>;
    textContent: () => Promise<string | null>;
    isVisible: () => Promise<boolean>;
    first: () => unknown;
    nth: (index: number) => unknown;
    waitFor: (opts?: { state?: 'attached' | 'detached' | 'visible' | 'hidden'; timeout?: number }) => Promise<void>;
  };
  waitForTimeout: (ms: number) => Promise<void>;
  screenshot: (opts: { path: string; fullPage: boolean }) => Promise<void>;
  on: (event: 'console', cb: (msg: { type: () => string; text: () => string }) => void) => void;
};

function showHelp(): void {
  console.log(`
PHALANX-QA-PLAYTHROUGH(1) - Automated Tactical Combat Simulator

NAME
    qa-playthrough - Run automated game simulations via Playwright

SYNOPSIS
    tsx scripts/qa-playthrough.ts [OPTIONS]

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

    --max-turns NUMBER
        Hard limit on turns before declaring a draw/stall (default: 140).

    --screenshot-mode turn|action|phase
        When to capture visual artifacts (default: turn).

    --out-dir PATH
        Where to save logs and screenshots (default: artifacts/playthrough).

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
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const v = argv[i + 1];
    if (a === '--base-url' && v) opts.baseUrl = v;
    if (a === '--seed' && v) opts.seed = Number(v);
    if (a === '--batch' && v) opts.batch = Math.max(1, Number(v));
    if (a === '--max-turns' && v) opts.maxTurns = Math.max(1, Number(v));
    if (a === '--max-action-retries' && v) opts.maxActionRetries = Math.max(1, Number(v));
    if (a === '--max-idle-ms' && v) opts.maxIdleMs = Math.max(1000, Number(v));
    if (a === '--screenshot-mode' && v && (v === 'turn' || v === 'action' || v === 'phase')) opts.screenshotMode = v;
    if (a === '--out-dir' && v) opts.outDir = v;
    if (a === '--headed') opts.headed = true;
  }
  return opts;
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
  if (count === 0) return false;
  const idx = pickRandomIndex(count);
  await (page.locator(selector).nth(idx) as { click: () => Promise<void> }).click();
  return true;
}

async function runOne(baseSeed: number, opts: CliOptions): Promise<RunManifest> {
  let playwright: {
    chromium: { launch: (opts: { headless: boolean }) => Promise<unknown> };
  };
  try {
    playwright = (await import('playwright')) as typeof playwright;
  } catch {
    throw new Error('Missing dependency: playwright. Install with `pnpm add -D playwright`.');
  }

  const start = new Date();
  const runDir = join(opts.outDir, `${tsSlug(start)}_${baseSeed}`);
  const shotsDir = join(runDir, 'screenshots');
  await mkdir(shotsDir, { recursive: true });

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

  const consoleErrors: string[] = [];
  for (const [actor, p] of [['A', pageA], ['B', pageB], ['S', pageS]] as const) {
    p.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[${actor}] ${msg.text()}`);
      }
    });
  }

  let shotCount = 0;
  const screenshot = async (label: string) => {
    const phaseText = await pageS.locator('[data-testid="phase-indicator"]').textContent().catch(() => null);
    const turn = parseTurn(phaseText);
    const phase = parsePhase(phaseText).replace(/\s+/g, '-').toLowerCase();
    const file = `t${String(turn).padStart(4, '0')}_${phase}_${String(++shotCount).padStart(4, '0')}_${label}.png`;
    await pageS.screenshot({ path: join(shotsDir, file), fullPage: true });
  };

  let actionCount = 0;
  let lastTurn = -1;
  let lastPhase = '';
  let lastProgressAt = Date.now();
  let failureReason: FailureReason | undefined;
  let failureMessage: string | undefined;
  let outcomeText: string | null = null;

  try {
    await logEvent({ at: new Date().toISOString(), type: 'state', detail: `start seed=${baseSeed}` });

    await pageA.goto(`${opts.baseUrl}/?seed=${baseSeed}`);
    await pageB.goto(opts.baseUrl);
    await pageA.locator('[data-testid="lobby-name-input"]').fill('Bot A');
    await pageA.locator('[data-testid="lobby-create-btn"]').click();
    await pageA.locator('[data-testid="waiting-match-id"]').waitFor({ state: 'visible', timeout: 10000 });
    const matchId = (await pageA.locator('[data-testid="waiting-match-id"]').textContent())?.trim();
    if (!matchId) {
      throw new Error('match id not found on waiting screen');
    }

    await pageB.locator('[data-testid="lobby-name-input"]').fill('Bot B');
    await pageB.locator('[data-testid="lobby-join-match-input"]').fill(matchId);
    await pageB.locator('[data-testid="lobby-join-btn"]').click();

    await pageS.goto(`${opts.baseUrl}/?watch=${matchId}`);
    await pageS.locator('[data-testid="game-layout"]').waitFor({ state: 'visible', timeout: 10000 });
    await screenshot('start');

    while (true) {
      if (await pageS.locator('[data-testid="game-over"]').isVisible().catch(() => false)) {
        outcomeText = await pageS.locator('[data-testid="game-over-result"]').textContent();
        await screenshot('game-over');
        break;
      }

      const phaseText = await pageS.locator('[data-testid="phase-indicator"]').textContent();
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
        await logEvent({ at: new Date().toISOString(), type: 'state', detail: `turn=${turn} phase=${phase}` });
        if (opts.screenshotMode === 'turn' || opts.screenshotMode === 'phase') {
          await screenshot('state-change');
        }
      } else if (Date.now() - lastProgressAt > opts.maxIdleMs) {
        failureReason = 'stalled';
        failureMessage = `no visible progress for ${opts.maxIdleMs}ms`;
        break;
      }

      const turnA = await pageA.locator('[data-testid="turn-indicator"]').textContent().catch(() => '');
      const turnB = await pageB.locator('[data-testid="turn-indicator"]').textContent().catch(() => '');
      const activePage = /your turn|reinforce your column/i.test(turnA ?? '')
        ? pageA
        : (/your turn|reinforce your column/i.test(turnB ?? '') ? pageB : null);

      if (!activePage) {
        await pageS.waitForTimeout(100);
        continue;
      }

      let success = false;
      let retries = 0;
      while (!success && retries < opts.maxActionRetries) {
        retries++;
        if (/deployment/i.test(phase)) {
          const pickedCard = await chooseRandomClickable(activePage, '[data-testid^="hand-card-"].playable');
          if (!pickedCard) break;
          success = await chooseRandomClickable(
            activePage,
            '[data-testid^="deploy-column-"]:not([disabled])',
          );
        } else if (/combat/i.test(phase)) {
          const pickedAttacker = await chooseRandomClickable(
            activePage,
            '[data-testid^="player-cell-r0-c"].occupied',
          );
          if (!pickedAttacker) {
            success = await chooseRandomClickable(activePage, '[data-testid="combat-pass-btn"]');
          } else {
            success = await chooseRandomClickable(activePage, '.bf-cell.valid-target');
            if (!success) {
              success = await chooseRandomClickable(activePage, '[data-testid="combat-pass-btn"]');
            }
          }
        } else if (/reinforce/i.test(phase)) {
          success = await chooseRandomClickable(activePage, '[data-testid^="hand-card-"].reinforce-playable');
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
      await logEvent({ at: new Date().toISOString(), type: 'action', detail: `turn=${turn} phase=${phase}` });
      if (opts.screenshotMode === 'action') {
        await screenshot('action');
      }
      await pageS.waitForTimeout(80);
    }
  } catch (err) {
    failureReason = failureReason ?? 'runtime_error';
    failureMessage = failureMessage ?? (err instanceof Error ? err.message : String(err));
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
    status: failureReason ? 'failure' : 'success',
    failureReason,
    failureMessage,
    turnCount: lastTurn < 0 ? 0 : lastTurn,
    actionCount,
    screenshotCount: shotCount,
    outcomeText,
    screenshotMode: opts.screenshotMode,
  };
  await writeFile(join(runDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts) return;
  
  const seedStart = opts.seed ?? Math.floor(Date.now() % Number.MAX_SAFE_INTEGER);

  await mkdir(opts.outDir, { recursive: true });
  const manifests: RunManifest[] = [];

  for (let i = 0; i < opts.batch; i++) {
    const seed = seedStart + i;
    const manifest = await runOne(seed, opts);
    manifests.push(manifest);
    const status = manifest.status === 'success' ? 'PASS' : 'FAIL';
    console.log(`[${status}] seed=${manifest.seed} turns=${manifest.turnCount} actions=${manifest.actionCount} duration=${manifest.durationMs}ms`);
    if (manifest.failureReason) {
      console.log(`  reason=${manifest.failureReason} msg=${manifest.failureMessage ?? ''}`);
    }
  }

  const success = manifests.filter((m) => m.status === 'success').length;
  const failedSeeds = manifests.filter((m) => m.status === 'failure').map((m) => m.seed);
  const avgTurns = manifests.length
    ? Math.round(manifests.reduce((sum, m) => sum + m.turnCount, 0) / manifests.length)
    : 0;
  console.log(`Summary: ${success}/${manifests.length} succeeded, avgTurns=${avgTurns}`);
  if (failedSeeds.length > 0) {
    console.log(`Failed seeds: ${failedSeeds.join(', ')}`);
    process.exitCode = 1;
  }
}

void main();
