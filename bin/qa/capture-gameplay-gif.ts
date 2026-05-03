#!/usr/bin/env tsx

import '../../scripts/instrument-cli.js';
import { chromium, type Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { mkdir, rename, rm, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);

const BASE_URL = process.env.PHALANX_BASE_URL ?? 'http://127.0.0.1:5173';
const OUT_DIR = join(process.cwd(), 'artifacts/marketing');
const VIDEO_TMP = join(OUT_DIR, '.video-tmp');

async function openCommandDrawer(page: Page): Promise<void> {
  const drawer = page.locator('.phx-command-drawer').first();
  if (!(await drawer.isVisible().catch(() => false))) return;
  const isOpen = await drawer.evaluate((el) => el.classList.contains('is-open')).catch(() => true);
  if (!isOpen) {
    await page
      .locator('.phx-drawer-handle')
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(200);
  }
}

async function clickCommandBtn(page: Page, testId: string, label: string): Promise<boolean> {
  await openCommandDrawer(page);
  return page
    .locator(`[data-testid="${testId}"], .phx-drawer-content button:has-text("${label}")`)
    .first()
    .click()
    .then(() => true)
    .catch(() => false);
}

async function playTurn(page: Page, idx: number): Promise<string> {
  const phaseText = await page
    .locator('[data-testid="phase-indicator"]')
    .textContent({ timeout: 4000 })
    .catch(() => null);
  if (!phaseText) return 'no-phase';

  const lp = phaseText.toLowerCase();
  console.log(`Turn ${idx}: ${phaseText.trim()}`);

  if (lp.includes('deploy')) {
    const cards = page.locator('.hand-card.playable');
    if ((await cards.count()) > 0) {
      await cards.first().click();
      await page.waitForTimeout(500);
      const targets = page.locator('[data-testid^="player-cell-"].bf-cell.valid-target');
      if ((await targets.count()) > 0) {
        await targets.first().click();
        await page.waitForTimeout(1200);
        return 'deployed';
      }
    }
    return 'deploy-skipped';
  }

  if (lp.includes('reinforce')) {
    await clickCommandBtn(page, 'combat-skip-reinforce-btn', 'SKIP');
    await page.waitForTimeout(600);
    return 'reinforce-skipped';
  }

  if (lp.includes('attack') || lp.includes('combat')) {
    const attackers = page.locator(
      '[data-qa-attackable="true"], [data-testid^="player-cell-r0-c"].bf-cell.attack-playable',
    );
    if ((await attackers.count()) > 0) {
      await attackers.first().click();
      await page.waitForTimeout(600);
      const targets = page
        .locator('[data-testid^="opponent-cell-r0-c"].bf-cell.valid-target')
        .first();
      if ((await targets.count()) > 0) {
        await targets.click();
        await page.waitForTimeout(2000);
        return 'attacked';
      }
    }
    await clickCommandBtn(page, 'combat-pass-btn', 'PASS');
    await page.waitForTimeout(800);
    return 'passed';
  }

  return `no-op:${phaseText.trim()}`;
}

async function main(): Promise<void> {
  await rm(VIDEO_TMP, { recursive: true, force: true });
  await mkdir(VIDEO_TMP, { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: VIDEO_TMP, size: { width: 1280, height: 800 } },
  });

  await context.addInitScript(() => {
    localStorage.setItem('phx_onboarding_deploy_seen', '1');
    localStorage.setItem('phx_onboarding_combat_seen', '1');
  });

  const page = await context.newPage();
  page.on('dialog', async (d) => d.accept());

  let videoPath: string | undefined;

  try {
    console.log('Opening lobby...');
    await page.goto(BASE_URL);

    const nameInput = page.locator('[data-testid="lobby-name-input"]');
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill('DemoPlayer');
    }

    await page.waitForSelector('[data-testid="lobby-bot-btn-easy"]', { timeout: 10000 });
    await page.waitForTimeout(1500);

    const advToggle = page.locator('[data-testid="advanced-options-toggle"]');
    if (await advToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await advToggle.click();
      await page.waitForTimeout(500);
      const lpInput = page.locator('[data-testid="lobby-starting-lp"]');
      if (await lpInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await lpInput.fill('8');
        await page.waitForTimeout(400);
      }
    }

    console.log('Starting PvB match...');
    await page.click('[data-testid="lobby-bot-btn-easy"]');
    await page.waitForSelector('[data-testid="game-layout"]', { timeout: 15000 });
    await page.waitForTimeout(1500);

    for (let i = 0; i < 40; i++) {
      const gameOver = await page
        .locator('[data-testid="game-over"], [data-phase="GameOver"]')
        .isVisible()
        .catch(() => false);
      if (gameOver) {
        await page.waitForTimeout(2500);
        break;
      }
      const result = await playTurn(page, i);
      if (result === 'no-phase') break;
    }

    videoPath = await page.video()?.path();
  } finally {
    await context.close();
    await browser.close();
  }

  if (!videoPath) {
    console.error('No video was recorded');
    process.exit(1);
  }

  const webmPath = join(OUT_DIR, 'gameplay.webm');
  await rename(videoPath, webmPath);
  console.log(`WebM: ${webmPath}`);

  const gifPath = join(OUT_DIR, 'gameplay.gif');
  const palettePath = join(VIDEO_TMP, 'palette.png');

  console.log('Generating palette...');
  await exec('ffmpeg', [
    '-y',
    '-i',
    webmPath,
    '-vf',
    'fps=10,scale=960:-1:flags=lanczos,palettegen',
    palettePath,
  ]);

  console.log('Encoding GIF...');
  await exec('ffmpeg', [
    '-y',
    '-i',
    webmPath,
    '-i',
    palettePath,
    '-filter_complex',
    'fps=10,scale=960:-1:flags=lanczos[x];[x][1:v]paletteuse',
    gifPath,
  ]);

  await unlink(palettePath).catch(() => {});
  console.log(`GIF: ${gifPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
