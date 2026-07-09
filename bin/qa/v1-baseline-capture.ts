#!/usr/bin/env tsx

/**
 * V1 Baseline UI Capture Helper
 *
 * Captures key gameplay moments at two viewport sizes for UX analysis.
 * Output: artifacts/v1-baseline/README.md + screenshots
 */

import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { parseArgs } from 'node:util';

const argv = process.argv.slice(2).filter((a) => a !== '--');

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`
V1 Baseline UI Capture Helper

Captures key gameplay moments at two viewport sizes for UX analysis.

Usage:
  tsx bin/qa/v1-baseline-capture.ts [options]

Options:
  --base-url <url>   Site URL (default: http://127.0.0.1:5173)
  --out-dir <dir>    Output directory (default: artifacts/v1-baseline)
  --help, -h         Show this help
`);
  process.exit(0);
}

const { values } = parseArgs({
  args: argv,
  options: {
    'base-url': { type: 'string' },
    'out-dir': { type: 'string', default: 'artifacts/v1-baseline' },
    help: { type: 'boolean', default: false },
  },
});

const VIEWPORTS = [
  { width: 1600, height: 1440, label: 'Desktop HD' },
  { width: 390, height: 844, label: 'Mobile iPhone 15' },
];

async function captureKeyMoments() {
  const baseUrl = process.env.PHALANX_BASE_URL || 'http://127.0.0.1:5173';
  const outDir = join(process.cwd(), 'artifacts/v1-baseline');
  await mkdir(outDir, { recursive: true });

  console.log('📸 V1 Baseline Capture\n');
  console.log(`Starting from: ${baseUrl}`);
  console.log(`Output to: ${outDir}\n`);

  const browser = await chromium.launch({ headless: true });

  try {
    for (const viewport of VIEWPORTS) {
      console.log(`\n${viewport.label} (${viewport.width}×${viewport.height})`);
      console.log('-'.repeat(40));

      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: 1,
      });

      const page = await context.newPage();
      page.on('dialog', async (d) => {
        await d.accept();
      });

      // Navigate to lobby
      await page.goto(baseUrl, { timeout: 15000, waitUntil: 'domcontentloaded' }).catch(() => null);
      await page.waitForTimeout(2000);

      // Disable modals via CSS (cleaner than trying to close them)
      await page
        .addStyleTag({
          content:
            '[role="dialog"] { display: none !important; } .phx-modal-overlay { display: none !important; }',
        })
        .catch(() => null);

      await page.waitForTimeout(500);

      // Capture: Lobby
      let filepath = join(
        outDir,
        `01-lobby_${viewport.label.replace(/\s+/g, '-').toLowerCase()}.png`,
      );
      await page.screenshot({ path: filepath });
      console.log(`✓ Lobby: ${filepath.split('/').pop()}`);

      // Start game
      const nameInput = page.locator('[data-testid="lobby-name-input"]');
      if (await nameInput.isVisible()) {
        await nameInput.fill('Baseline');
      }

      const quickStartBtn = page.locator('[data-testid="lobby-quick-match-btn"]');
      if (await quickStartBtn.isVisible()) {
        await quickStartBtn.click({ force: true });
        await page.waitForTimeout(3000);

        // Close modal that appears after quick start (acknowledge button, close icon, etc)
        for (let round = 0; round < 5; round++) {
          // Try: Click Acknowledge button (common in info modals)
          await page
            .locator('button:has-text("Acknowledge"), button:has-text("acknowledge")')
            .first()
            .click()
            .catch(() => null);

          // Try: Click close icon (X button in top right)
          await page
            .locator('button[aria-label*="close"], button[aria-label*="Close"]')
            .first()
            .click()
            .catch(() => null);

          // Try: ESC key
          for (let i = 0; i < 3; i++) {
            await page.keyboard.press('Escape').catch(() => null);
            await page.waitForTimeout(100);
          }

          await page.waitForTimeout(300);
          const modalsRemaining = await page.locator('[role="dialog"]').count();
          if (modalsRemaining === 0) break;
        }
      }

      await page.waitForTimeout(1000);

      // Capture: Deployment
      filepath = join(
        outDir,
        `02-deployment_${viewport.label.replace(/\s+/g, '-').toLowerCase()}.png`,
      );
      await page.screenshot({ path: filepath });
      console.log(`✓ Deployment: ${filepath.split('/').pop()}`);

      // Wait for GameOver (game auto-plays or user must pass turns)
      let waitedMs = 0;
      const maxWaitMs = 120000;
      while (waitedMs < maxWaitMs) {
        try {
          const gameOverText = page.locator('text=Game Over').first();
          if (await gameOverText.isVisible().catch(() => false)) {
            // Found gameover, close modal blocking it
            await page
              .locator('button:has-text("Acknowledge"), button:has-text("acknowledge")')
              .first()
              .click()
              .catch(() => null);
            await page.waitForTimeout(500);

            filepath = join(
              outDir,
              `03-gameover_${viewport.label.replace(/\s+/g, '-').toLowerCase()}.png`,
            );
            await page.screenshot({ path: filepath });
            console.log(`✓ GameOver: ${filepath.split('/').pop()}`);
            break;
          }

          await page.waitForTimeout(1000);
          waitedMs += 1000;
        } catch (err) {
          console.log(
            `  [Debug] Error during wait: ${err instanceof Error ? err.message : String(err)}`,
          );
          break;
        }
      }

      await context.close();
    }

    // Generate report
    const report = `# V1 Baseline UI Capture

**Purpose:** Document v1 UI/UX layout for v2.1 reference

## Desktop (1600×1440)

Key gameplay moments:

- [Lobby](01-lobby_desktop-hd.png)
- [Deployment](02-deployment_desktop-hd.png)
- [Attack](03-attack_desktop-hd.png)

## Mobile (390×844)

Key gameplay moments:

- [Lobby](01-lobby_mobile-iphone-15.png)
- [Deployment](02-deployment_mobile-iphone-15.png)
- [Attack](03-attack_mobile-iphone-15.png)

## Layout Notes

### Desktop
- 1600×1440 represents typical monitor resolution
- Ample space for battlefield + hand cards + UI chrome
- Check: button sizes, text readability, card visibility

### Mobile
- 390×844 represents iPhone 15 viewport
- Constrained space — layout must stack/hide elements
- Check: touch targets (≥44px), text size, scrolling areas

### Responsive Breakpoint
Per \`.claude/rules/\` — breakpoint at 1200px
- **<1200px:** Mobile layout (4px padding)
- **≥1200px:** Desktop layout (16px padding)

## Next Steps

1. Review both versions side-by-side
2. Note which elements need adjustment (size, visibility, spacing)
3. Cross-reference against active React/browser client layout code
4. File issues for each UX problem found
`;

    const reportPath = join(outDir, 'README.md');
    await writeFile(reportPath, report, 'utf-8');
    console.log(`\n📄 Report: ${reportPath}`);
    console.log(`\n✅ Baseline capture complete!`);
  } finally {
    await browser.close();
  }
}

captureKeyMoments().catch((err) => {
  console.error('❌ Capture failed:', err);
  process.exit(1);
});
