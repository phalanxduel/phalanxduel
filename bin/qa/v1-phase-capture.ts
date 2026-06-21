#!/usr/bin/env tsx

/**
 * V1 Phase Capture
 *
 * Runs v1 (Playwright) with seeded scenario, capturing screenshots at each game phase.
 * Outputs to artifacts/phase-comparison/v1/
 *
 * Usage: pnpm qa:v1-phase-capture
 */

import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const SEED = 12345;
const VIEWPORT = { width: 1600, height: 1440 };

async function captureV1Phases() {
  const baseUrl = process.env.PHALANX_BASE_URL || 'http://127.0.0.1:5173';
  const outDir = join(process.cwd(), 'artifacts/phase-comparison/v1');
  await mkdir(outDir, { recursive: true });

  console.log(`📸 V1 Phase Capture (seed=${SEED})`);
  console.log(`Viewport: ${VIEWPORT.width}×${VIEWPORT.height}`);
  console.log(`Output: ${outDir}\n`);

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();
    page.on('dialog', async (d) => {
      await d.accept();
    });

    // Load lobby
    const lobbyUrl = `${baseUrl}?seed=${SEED}`;
    console.log(`Loading: ${lobbyUrl}`);
    await page.goto(lobbyUrl);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    console.log('✓ Lobby loaded\n');

    // Click quick start
    console.log('Starting quick match...');
    const quickStartBtn = page.locator('[data-testid="lobby-quick-match-btn"]');
    await quickStartBtn.click();
    await page.waitForTimeout(3000);
    console.log('✓ Match started\n');

    // Wait for game layout to be ready
    await page.waitForSelector('[data-testid="game-layout"]', { timeout: 10000 });
    console.log('Capturing at phase transitions...\n');

    const getPhase = async (): Promise<string> => {
      try {
        return (
          (await page.getAttribute('[data-testid="phase-indicator"]', 'data-phase')) || 'unknown'
        );
      } catch {
        return 'unknown';
      }
    };

    let captureCount = 0;
    let lastPhase = '';
    let unchangedLoops = 0;

    // Capture up to 20 phases
    for (let i = 0; i < 200 && captureCount < 20; i++) {
      const phase = await getPhase();

      if (phase !== lastPhase && phase !== 'unknown') {
        lastPhase = phase;
        unchangedLoops = 0;

        const filename = `${String(captureCount + 1).padStart(2, '0')}-${phase.toLowerCase()}.png`;
        const filepath = join(outDir, filename);
        await page.screenshot({ path: filepath });
        console.log(`✓ ${filename}`);
        captureCount++;
      } else {
        unchangedLoops++;
      }

      // Auto-pass if stuck
      if (unchangedLoops > 10) {
        const passBtn = page.locator('[data-testid="combat-pass-btn"]');
        if (await passBtn.isVisible()) {
          await passBtn.click();
          await page.waitForTimeout(800);
          unchangedLoops = 0;
        }
      }

      await page.waitForTimeout(200);
    }

    console.log(`\n✅ Captured ${captureCount} phases`);
    await context.close();
  } finally {
    await browser.close();
  }
}

captureV1Phases().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
