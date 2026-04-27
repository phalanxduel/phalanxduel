import { chromium, type Page, type Browser, type BrowserContext } from '@playwright/test';
import { mkdir, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
const OUTPUT_DIR = resolve(repoRoot, 'client/public/tutorials');

async function ensureDir(path: string) {
  await mkdir(path, { recursive: true });
}

async function captureScenario(
  browser: Browser,
  name: string,
  scenario: (page: Page) => Promise<void>,
  width = 1280,
  height = 800,
) {
  console.log(`[tutorial] CAPTURING_SCENARIO: ${name}`);
  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width, height },
    },
  });
  const page = await context.newPage();

  // Handle dialogs (pass, forfeit)
  page.on('dialog', async (dialog) => {
    console.log(`[tutorial] DIALOG: ${dialog.message()}`);
    await dialog.accept();
  });

  try {
    await scenario(page);
    await page.waitForTimeout(1000); // Buffer at end
  } finally {
    await context.close();
    const video = await page.video();
    if (video) {
      const path = await video.path();
      const target = resolve(OUTPUT_DIR, `${name}.webm`);
      await rename(path, target);
      console.log(`[tutorial] VIDEO_SAVED: ${target}`);
    }
  }
}

async function main() {
  await ensureDir(OUTPUT_DIR);
  const browser = await chromium.launch({ headless: true });

  try {
    /*
    // Scenario 1: Lobby & Quick Start
    await captureScenario(browser, 'lobby_quickstart', async (page) => {
      await page.goto('http://127.0.0.1:5173');
      await page.waitForSelector('#phx-lobby-name-input');
      await page.fill('#phx-lobby-name-input', 'TutorialBot');
      await page.waitForTimeout(500);
      await page.click('#phx-lobby-quick-start-btn');
      await page.waitForSelector('#phx-phase-indicator');
    });

    // Scenario 2: Deployment Basics
    await captureScenario(browser, 'deployment_basics', async (page) => {
      await page.goto('http://127.0.0.1:5173');
      await page.fill('#phx-lobby-name-input', 'TutorialBot');
      await page.click('#phx-lobby-quick-start-btn');
      await page.waitForSelector('#phx-phase-indicator');
      
      // Deploy first card to (0,0)
      const handCard = page.locator('[id^="phx-card-hand-"]').first();
      await handCard.waitFor({ state: 'visible', timeout: 10000 });
      const targetCell = page.locator('#phx-cell-0-0');
      await targetCell.waitFor({ state: 'visible', timeout: 10000 });
      await handCard.click();
      await targetCell.click();
      await page.waitForTimeout(1000);
    });
    */

    // Scenario 4: Cascade Mechanics
    await captureScenario(browser, 'combat_cascade', async (page) => {
      await page.goto('http://127.0.0.1:5173');
      await page.fill('#phx-lobby-name-input', 'TutorialCas');
      await page.click('#phx-lobby-quick-start-btn');

      await page.waitForSelector('[data-testid="game-layout"]', { timeout: 20000 });

      // Deploy cards
      for (let i = 0; i < 2; i++) {
        const handCard = page.locator('[id^="phx-card-hand-"]').first();
        if (await handCard.isVisible({ timeout: 5000 })) {
          await handCard.click();
          await page.locator(`#phx-cell-0-${i}`).click();
          await page.waitForTimeout(800);
        }
      }

      await page.locator('#phx-command-pass').click();

      // Wait for AttackPhase
      await page.waitForSelector('[data-phase="AttackPhase"]', { timeout: 20000 });

      // Perform an attack and wait for the cascade animation
      console.log('[tutorial] CASCADE_SCENARIO: Monitoring attack resolution...');
      await page.waitForTimeout(5000);
    });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
