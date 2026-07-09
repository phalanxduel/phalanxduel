#!/usr/bin/env tsx

/**
 * Design Baseline Capture
 *
 * Captures every distinct screen state and game phase in the v1 client
 * at multiple viewport sizes. Produces a directory of labeled PNGs
 * organized by screen → variant, ready for the flow catalog generator.
 *
 * Output: artifacts/design-baseline/<label>/
 *   <screen>--<variant>--<viewport>.png
 *
 * Usage:
 *   pnpm qa:design-baseline
 *   pnpm qa:design-baseline -- --label "before-redesign"
 *   pnpm qa:design-baseline -- --desktop-only
 */

import { chromium, type Page, type BrowserContext, type Browser } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

// --- Config ---

interface Viewport {
  width: number;
  height: number;
  tag: string;
}

const VIEWPORTS: Viewport[] = [
  { width: 1280, height: 900, tag: 'desktop' },
  { width: 390, height: 844, tag: 'mobile' },
];

const SEED = 12345;

// --- CLI ---

const rawArgv = process.argv.slice(2);
const argv = rawArgv[0] === '--' ? rawArgv.slice(1) : rawArgv;

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`
Design Baseline Capture

Usage:
  pnpm qa:design-baseline
  pnpm qa:design-baseline -- --label "before-redesign"
  pnpm qa:design-baseline -- --desktop-only

Options:
  --label <label>    Subdirectory label in artifacts (default: "current")
  --desktop-only     Skip mobile viewports
  --base-url <url>   Site URL (default: http://127.0.0.1:5173)
  --help, -h         Show this help
`);
  process.exit(0);
}

const { values: opts } = parseArgs({
  args: argv,
  options: {
    label: { type: 'string', default: 'current' },
    'desktop-only': { type: 'boolean', default: false },
    'base-url': { type: 'string', default: '' },
    help: { type: 'boolean', default: false },
  },
});

const BASE_URL = opts['base-url'] || process.env.PHALANX_BASE_URL || 'http://127.0.0.1:5173';
const LABEL = opts.label!;
const viewportsToCapture = opts['desktop-only'] ? [VIEWPORTS[0]] : VIEWPORTS;

// --- Helpers ---

interface CaptureResult {
  screen: string;
  variant: string;
  viewport: string;
  path: string;
}

async function snap(
  page: Page,
  outDir: string,
  screen: string,
  variant: string,
  vpTag: string,
): Promise<CaptureResult> {
  const filename = `${screen}--${variant}--${vpTag}.png`;
  const filepath = join(outDir, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  return { screen, variant, viewport: vpTag, path: filename };
}

async function dismissModals(page: Page): Promise<void> {
  // Suppress modals via CSS — more reliable than clicking
  await page
    .addStyleTag({
      content: `
        [role="dialog"], .phx-modal-overlay, .phx-onboarding-overlay,
        .phx-briefing-overlay { display: none !important; }
      `,
    })
    .catch(() => null);
  await page.waitForTimeout(300);
}

async function navigateToScreen(page: Page, screen: string): Promise<void> {
  const url = new URL(BASE_URL);
  if (screen !== 'lobby') {
    url.searchParams.set('screen', screen);
  }
  await page.goto(url.toString(), { timeout: 15000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await dismissModals(page);
}

// --- Screen Capture Groups ---

async function captureLobbyScreens(
  page: Page,
  outDir: string,
  vpTag: string,
): Promise<CaptureResult[]> {
  const results: CaptureResult[] = [];

  // 1. Lobby — empty state (initial load)
  await navigateToScreen(page, 'lobby');
  results.push(await snap(page, outDir, 'lobby', 'initial', vpTag));

  // 2. Lobby — with name entered
  const nameInput = page.locator('[data-testid="lobby-name-input"]');
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill('Operative_Kira');
    await page.waitForTimeout(300);
    results.push(await snap(page, outDir, 'lobby', 'name-entered', vpTag));
  }

  // 3. Lobby — advanced options expanded
  const advToggle = page.locator('[data-testid="advanced-options-toggle"]');
  if (await advToggle.isVisible().catch(() => false)) {
    await advToggle.click();
    await page.waitForTimeout(500);
    results.push(await snap(page, outDir, 'lobby', 'advanced-options', vpTag));
    // Close it back
    await advToggle.click().catch(() => null);
    await page.waitForTimeout(300);
  }

  return results;
}

async function captureStaticScreens(
  page: Page,
  outDir: string,
  vpTag: string,
): Promise<CaptureResult[]> {
  const results: CaptureResult[] = [];

  // Auth screen
  await navigateToScreen(page, 'auth');
  results.push(await snap(page, outDir, 'auth', 'login-form', vpTag));

  // Settings screen
  await navigateToScreen(page, 'settings');
  results.push(await snap(page, outDir, 'settings', 'default', vpTag));

  // Ladder / Leaderboard screen
  await navigateToScreen(page, 'ladder');
  results.push(await snap(page, outDir, 'ladder', 'default', vpTag));

  // Public lobby
  await navigateToScreen(page, 'public_lobby');
  results.push(await snap(page, outDir, 'public-lobby', 'default', vpTag));

  // Spectator lobby
  await navigateToScreen(page, 'spectator_lobby');
  results.push(await snap(page, outDir, 'spectator-lobby', 'default', vpTag));

  return results;
}

async function captureGameplayScreens(
  page: Page,
  outDir: string,
  vpTag: string,
): Promise<CaptureResult[]> {
  const results: CaptureResult[] = [];

  // Start a seeded quick match (bot vs bot)
  await navigateToScreen(page, 'lobby');
  const nameInput = page.locator('[data-testid="lobby-name-input"]');
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill('DesignCapture');
  }

  // Quick match starts a PvB game
  const quickBtn = page.locator('[data-testid="lobby-quick-match-btn"]');
  if (await quickBtn.isVisible().catch(() => false)) {
    await quickBtn.click({ force: true });
  }

  // Wait for game layout to appear
  await page.waitForSelector('[data-testid="game-layout"]', { timeout: 20000 }).catch(() => null);
  await page.waitForTimeout(2000);
  await dismissModals(page);

  // Helper to get current phase
  const getPhase = async (): Promise<string> => {
    try {
      return (
        (await page.getAttribute('[data-testid="phase-indicator"]', 'data-phase')) || 'unknown'
      );
    } catch {
      return 'unknown';
    }
  };

  // Capture deployment phase
  let phase = await getPhase();
  if (phase === 'DeploymentPhase') {
    results.push(await snap(page, outDir, 'game-deploy', 'initial', vpTag));

    // Deploy one card to show selection state
    const card = page.locator('[data-testid="hand-card-0"]');
    if (await card.isVisible().catch(() => false)) {
      await card.click();
      await page.waitForTimeout(500);
      results.push(await snap(page, outDir, 'game-deploy', 'card-selected', vpTag));
    }

    // Deploy all cards to advance through deployment
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const handCard = page.locator('[data-testid="hand-card-0"]');
        const slot = page.locator(`[data-testid="player-cell-r${r}-c${c}"]`);
        if (
          (await handCard.isVisible().catch(() => false)) &&
          (await slot.isVisible().catch(() => false))
        ) {
          await handCard.click();
          await page.waitForTimeout(200);
          await slot.click();
          await page.waitForTimeout(800);
        }
      }
    }
    await page.waitForTimeout(1500);

    // Capture post-deployment (battlefield filled)
    results.push(await snap(page, outDir, 'game-deploy', 'filled', vpTag));
  }

  // Wait for attack phase and play through capturing each distinct phase
  const capturedPhases = new Set<string>();
  let loops = 0;
  const maxLoops = 200;

  while (loops < maxLoops) {
    phase = await getPhase();

    // Capture each phase once
    if (phase !== 'unknown' && !capturedPhases.has(phase)) {
      capturedPhases.add(phase);

      const screenName =
        phase === 'AttackPhase'
          ? 'game-attack'
          : phase === 'AttackResolution'
            ? 'game-resolution'
            : phase === 'CleanupPhase'
              ? 'game-cleanup'
              : phase === 'ReinforcementPhase'
                ? 'game-reinforce'
                : phase === 'DrawPhase'
                  ? 'game-draw'
                  : phase === 'EndTurn'
                    ? 'game-endturn'
                    : phase === 'StartTurn'
                      ? 'game-startturn'
                      : `game-${phase.toLowerCase()}`;

      results.push(await snap(page, outDir, screenName, 'default', vpTag));

      // For AttackPhase, also capture with a card selected (attack preview)
      if (phase === 'AttackPhase') {
        const attacker = page.locator('[data-testid^="player-cell-"]').first();
        if (await attacker.isVisible().catch(() => false)) {
          await attacker.click();
          await page.waitForTimeout(600);
          results.push(await snap(page, outDir, 'game-attack', 'card-selected', vpTag));

          // Select a target to show attack preview
          const target = page.locator('[data-testid^="opponent-cell-"]').first();
          if (await target.isVisible().catch(() => false)) {
            await target.click();
            await page.waitForTimeout(600);
            results.push(await snap(page, outDir, 'game-attack', 'target-selected', vpTag));
          }
        }
      }
    }

    // Check for game over
    const gameOverEl = page.locator('[data-testid="game-over"]');
    if (await gameOverEl.isVisible().catch(() => false)) {
      results.push(await snap(page, outDir, 'game-over', 'default', vpTag));
      break;
    }

    // Auto-pass to advance the game
    const passBtn = page.locator(
      '[data-testid="combat-pass-btn"], [data-testid="combat-skip-reinforce-btn"]',
    );
    if (
      await passBtn
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await passBtn.first().click();
      await page.waitForTimeout(1000);
    } else {
      await page.waitForTimeout(500);
    }

    loops++;
  }

  return results;
}

// --- Main ---

async function main() {
  const outDir = join(process.cwd(), 'artifacts/design-baseline', LABEL);
  await mkdir(outDir, { recursive: true });

  console.log(`🎨 Design Baseline Capture`);
  console.log(`   Label: ${LABEL}`);
  console.log(`   URL:   ${BASE_URL}`);
  console.log(`   Output: ${outDir}\n`);

  const allResults: CaptureResult[] = [];
  const browser = await chromium.launch({ headless: true });

  try {
    for (const vp of viewportsToCapture) {
      console.log(`\n📐 Viewport: ${vp.tag} (${vp.width}×${vp.height})`);
      console.log('─'.repeat(50));

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
      });

      const page = await context.newPage();
      page.on('dialog', async (d) => {
        await d.accept();
      });

      // Capture lobby variants
      console.log('  Lobby screens...');
      const lobbyResults = await captureLobbyScreens(page, outDir, vp.tag);
      allResults.push(...lobbyResults);
      console.log(`  ✓ ${lobbyResults.length} captures`);

      // Capture static screens
      console.log('  Static screens...');
      const staticResults = await captureStaticScreens(page, outDir, vp.tag);
      allResults.push(...staticResults);
      console.log(`  ✓ ${staticResults.length} captures`);

      // Capture gameplay phases
      console.log('  Gameplay phases...');
      const gameResults = await captureGameplayScreens(page, outDir, vp.tag);
      allResults.push(...gameResults);
      console.log(`  ✓ ${gameResults.length} captures`);

      await context.close();
    }

    // Write manifest for the catalog generator
    const manifest = {
      label: LABEL,
      capturedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      viewports: viewportsToCapture,
      captures: allResults,
    };
    await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    console.log(`\n✅ Captured ${allResults.length} screenshots`);
    console.log(`   Manifest: ${join(outDir, 'manifest.json')}`);
    console.log(`\n   Next: pnpm qa:design-catalog`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('❌ Capture failed:', err);
  process.exit(1);
});
