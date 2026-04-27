#!/usr/bin/env tsx

import '../../scripts/instrument-cli.js';
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Capture Gallery Script
 *
 * Automatically captures key gameplay moments for documentation and marketing.
 */

async function main() {
  const baseUrl = process.env.PHALANX_BASE_URL || 'http://127.0.0.1:5173';
  const outDir = join(process.cwd(), 'artifacts/gallery');
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headed: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });

  try {
    const page = await context.newPage();

    // Auto-accept confirmation dialogs (forfeit, pass)
    page.on('dialog', async (dialog) => {
      console.log(`  [DIALOG] ${dialog.type()}: ${dialog.message()}`);
      await dialog.accept();
    });

    // 1. Initial State / Lobby
    console.log('📸 Capturing Lobby...');
    await page.goto(baseUrl);

    // Enter name if we are a guest
    const nameInput = page.locator('[data-testid="lobby-name-input"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('TacticalBot');
    }

    await page.waitForSelector('[data-testid="lobby-create-btn"]', { timeout: 10000 });
    await page.screenshot({ path: join(outDir, 'lobby.png') });

    // 2. Deployment Phase
    console.log('📸 Capturing Deployment Phase...');
    await page.click('[data-testid="lobby-quick-match-btn"]');
    await page.waitForSelector('[data-testid="game-layout"]', { timeout: 15000 });
    await page.waitForTimeout(2000); // Wait for state to settle
    await page.waitForSelector('text=DEPLOYMENT');

    // Deploy cards to all slots to finish DeploymentPhase
    console.log('  Deploying all cards to finish DeploymentPhase...');
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        console.log(`    Deploying card to r${r}c${c}...`);
        const card = page.locator('[data-testid="hand-card-0"]');
        const slot = page.locator(`[data-testid="player-cell-r${r}-c${c}"]`);

        await card.waitFor({ state: 'visible' });
        await card.click();
        await page.waitForTimeout(200);
        await slot.click();
        await page.waitForTimeout(1000); // Wait for deployment to complete
      }
    }

    await page.screenshot({ path: join(outDir, 'deployment-with-hand.png') });

    await page.screenshot({ path: join(outDir, 'deployment-with-hand.png') });

    // 3. Attack Phase
    console.log('📸 Capturing Attack Phase...');

    // Finish deployment by passing until ATTACK
    let safety = 0;
    while (safety < 30) {
      const phase = await page.getAttribute('[data-testid="phase-indicator"]', 'data-phase');
      console.log(`  [Loop ${safety}] Current Phase: ${phase}`);
      if (phase === 'AttackPhase') break;

      const drawer = page.locator('.phx-command-drawer');
      const isOpen = await drawer
        .evaluate((el) => el.classList.contains('is-open'))
        .catch(() => false);

      if (!isOpen) {
        console.log('  Opening Command Drawer...');
        await page.click('#phx-command-drawer-handle');
        await page.waitForTimeout(500);
      }

      const passBtn = page.locator('[data-testid="combat-pass-btn"]');
      if (await passBtn.isVisible()) {
        console.log('  Clicking PASS...');
        await passBtn.click();
        await page.waitForTimeout(2000);
      } else {
        console.log('  Waiting for turn/actions...');
        await page.waitForTimeout(2000);
      }
      safety++;
    }

    await page.screenshot({ path: join(outDir, 'attack-with-hand.png') });

    // 4. Reinforce Phase
    console.log('📸 Capturing Reinforce Phase...');

    // Select an attacker to enable Attack
    console.log('  Selecting attacker...');
    const attacker = page.locator('[data-testid="player-cell-r0-c1"]');
    await attacker.click();
    await page.waitForTimeout(1000);

    console.log('  Selecting target...');
    const target = page.locator('[data-testid^="opponent-cell-"]').first();
    if (await target.isVisible()) {
      await target.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: join(outDir, 'reinforce-phase.png') });

    console.log(`✅ Gallery captured to ${outDir}`);
  } catch (error) {
    console.error('❌ Capture failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
