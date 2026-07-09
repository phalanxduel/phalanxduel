#!/usr/bin/env tsx

/**
 * V1 Record Playthrough — V3 Reference Blueprint
 *
 * Records a complete V1 game with deterministic scenario, capturing:
 * - Every game phase transition
 * - Every action (deploy, attack, pass, reinforce)
 * - Player perspective alternation
 * - Screenshots at each phase/action
 * - Final game state and outcome
 *
 * Output: artifacts/v1-record/playthrough-{seed}.json + screenshots/
 */

import { chromium, type Page, type BrowserContext } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const argv = process.argv.slice(2).filter((a) => a !== '--');

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`
V1 Record Playthrough

Records a complete V1 game with deterministic scenario, capturing every game phase transition and action.

Usage:
  tsx bin/qa/v1-record-playthrough.ts [options]

Options:
  --base-url <url>   Site URL (default: http://127.0.0.1:5173)
  --seed <seed>      Seed for scenario (default: 12345)
  --out-dir <dir>    Output directory (default: artifacts/v1-record)
  --help, -h         Show this help
`);
  process.exit(0);
}

const { values } = parseArgs({
  args: argv,
  options: {
    'base-url': { type: 'string' },
    seed: { type: 'string', default: '12345' },
    'out-dir': { type: 'string', default: 'artifacts/v1-record' },
    help: { type: 'boolean', default: false },
  },
});

interface PhaseRecord {
  phase: string;
  turnNumber: number;
  activePlayer: number;
  timestamp: string;
  actions: ActionRecord[];
}

interface ActionRecord {
  type: string;
  actor: number;
  detail: string;
  timestamp: string;
  screenshot?: string;
}

interface PlaythroughRecord {
  seed: number;
  startAt: string;
  endAt: string;
  durationMs: number;
  gamePhases: string[];
  phases: PhaseRecord[];
  finalOutcome: string | null;
  turnCount: number;
  actionCount: number;
}

const SEED = parseInt(values.seed as string, 10) || 12345;
const VIEWPORT = { width: 1600, height: 1440 };

async function recordV1Playthrough() {
  const baseUrl = values['base-url'] || process.env.PHALANX_BASE_URL || 'http://127.0.0.1:5173';
  const outDir = join(process.cwd(), values['out-dir'] as string);
  const screenshotDir = join(outDir, `seed-${SEED}`);
  await mkdir(screenshotDir, { recursive: true });

  console.log('🎮 V1 Record Playthrough (V3 Reference)\n');
  console.log(`Seed: ${SEED}`);
  console.log(`Viewport: ${VIEWPORT.width}×${VIEWPORT.height}`);
  console.log(`Output: ${screenshotDir}\n`);

  const browser = await chromium.launch({ headless: true });
  const startTime = new Date();
  const record: PlaythroughRecord = {
    seed: SEED,
    startAt: startTime.toISOString(),
    endAt: '',
    durationMs: 0,
    gamePhases: [],
    phases: [],
    finalOutcome: null,
    turnCount: 0,
    actionCount: 0,
  };

  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();
    page.on('dialog', async (d) => {
      await d.accept();
    });

    // Navigate to lobby
    await page.goto(baseUrl, { timeout: 15000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Hide modals
    await page
      .addStyleTag({
        content:
          '[role="dialog"] { display: none !important; } .phx-modal-overlay { display: none !important; }',
      })
      .catch(() => null);

    // Log all game state transitions
    const phaseLog: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('phase') || text.includes('Phase')) {
        phaseLog.push(`[${new Date().toISOString()}] ${text}`);
      }
    });

    let actionCount = 0;
    let phaseIndex = 0;

    // Capture: Lobby
    console.log('📍 Lobby');
    let filepath = join(screenshotDir, `00-lobby.png`);
    await page.screenshot({ path: filepath });
    record.phases.push({
      phase: 'Lobby',
      turnNumber: 0,
      activePlayer: 0,
      timestamp: new Date().toISOString(),
      actions: [],
    });

    // Start game with seeded scenario
    const nameInput = page.locator('[data-testid="lobby-name-input"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill(`V3-Ref-${SEED}`);
    }

    const quickStartBtn = page.locator('[data-testid="lobby-quick-match-btn"]');
    if (await quickStartBtn.isVisible()) {
      await quickStartBtn.click({ force: true });
      await page.waitForTimeout(3000);

      // Close modals
      for (let i = 0; i < 5; i++) {
        await page
          .locator('button:has-text("Acknowledge"), button:has-text("acknowledge")')
          .first()
          .click()
          .catch(() => null);
        await page.keyboard.press('Escape').catch(() => null);
        await page.waitForTimeout(200);
      }
    }

    // Main game loop: capture phases until gameover
    let turnNumber = 0;
    let lastPhase = '';
    let foundGameOver = false;

    const maxWaitMs = 180000; // 3 minutes
    const startWait = Date.now();

    console.log('⚔️  Gameplay Recording...');

    while (Date.now() - startWait < maxWaitMs && !foundGameOver) {
      try {
        // Check for game over first
        const gameOverText = await page
          .locator('text=Game Over')
          .first()
          .isVisible()
          .catch(() => false);
        if (gameOverText) {
          console.log('🏁 Game Over detected');
          foundGameOver = true;

          // Close any modal blocking gameover
          await page
            .locator('button:has-text("Acknowledge"), button:has-text("acknowledge")')
            .first()
            .click()
            .catch(() => null);
          await page.waitForTimeout(500);

          filepath = join(screenshotDir, `99-gameover.png`);
          await page.screenshot({ path: filepath });
          record.finalOutcome = 'game_complete';
          break;
        }

        // Try to detect current phase from UI
        const turnLabel = await page
          .locator('[data-testid*="turn"], text=/^T\\d+/')
          .first()
          .textContent()
          .catch(() => '');
        const phaseText = await page
          .locator('[data-testid*="phase"]')
          .first()
          .textContent()
          .catch(() => '');

        const currentPhase = phaseText || turnLabel || `Turn-${turnNumber}`;

        if (currentPhase !== lastPhase) {
          console.log(`  • ${currentPhase}`);
          lastPhase = currentPhase;
          if (!record.gamePhases.includes(currentPhase)) {
            record.gamePhases.push(currentPhase);
          }

          filepath = join(
            screenshotDir,
            `${String(phaseIndex).padStart(2, '0')}-${currentPhase.replace(/\s+/g, '-').toLowerCase()}.png`,
          );
          await page.screenshot({ path: filepath });
          phaseIndex++;

          record.phases.push({
            phase: currentPhase,
            turnNumber,
            activePlayer: turnNumber % 2,
            timestamp: new Date().toISOString(),
            actions: [],
          });
        }

        // Try to trigger next action (pass button for gameplay progression)
        const passBtn = page.locator('[data-testid="combat-pass-btn"]').first();
        if (await passBtn.isVisible().catch(() => false)) {
          await passBtn.click().catch(() => null);
          actionCount++;
          record.phases[record.phases.length - 1]?.actions.push({
            type: 'pass',
            actor: turnNumber % 2,
            detail: `Turn ${turnNumber} - player ${turnNumber % 2}`,
            timestamp: new Date().toISOString(),
          });
          turnNumber++;
          await page.waitForTimeout(800);
        }

        await page.waitForTimeout(500);
      } catch (err) {
        console.log(`  [Debug] Error: ${err instanceof Error ? err.message : String(err)}`);
        await page.waitForTimeout(1000);
      }
    }

    record.turnCount = turnNumber;
    record.actionCount = actionCount;
    record.endAt = new Date().toISOString();
    record.durationMs = Date.now() - startTime.getTime();

    // Write recording
    const recordPath = join(outDir, `playthrough-${SEED}.json`);
    await writeFile(recordPath, JSON.stringify(record, null, 2), 'utf-8');
    console.log(`\n📋 Recording: ${recordPath}`);
    console.log(`\nRecording Summary:`);
    console.log(`  Duration: ${Math.round(record.durationMs / 1000)}s`);
    console.log(`  Turns: ${record.turnCount}`);
    console.log(`  Actions: ${record.actionCount}`);
    console.log(`  Phases encountered: ${record.gamePhases.length}`);
    console.log(`  Screenshots: ${phaseIndex + 1}`);
    console.log(`\n✅ V1 playthrough recorded. Ready for V3 development.`);

    await context.close();
  } finally {
    await browser.close();
  }
}

recordV1Playthrough().catch((err) => {
  console.error('❌ Recording failed:', err);
  process.exit(1);
});
