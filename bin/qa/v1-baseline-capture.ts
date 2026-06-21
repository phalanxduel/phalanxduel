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

      // Close ALL modals (help, info, initialization - multiple layers)
      for (let round = 0; round < 5; round++) {
        // Press ESC multiple times to close nested modals
        for (let i = 0; i < 3; i++) {
          await page.keyboard.press('Escape').catch(() => null);
          await page.waitForTimeout(100);
        }

        // Click any visible close buttons (all of them)
        const closeButtons = await page
          .locator('button:has-text("Close"), button[aria-label*="close"]')
          .all();
        for (const btn of closeButtons) {
          await btn.click().catch(() => null);
        }

        // Click outside modals to dismiss
        await page.click('body', { position: { x: 100, y: 100 }, force: true }).catch(() => null);

        await page.waitForTimeout(200);

        const modalsRemaining = await page
          .locator('[role="dialog"], .phx-modal-overlay, .modal')
          .count();
        if (modalsRemaining === 0) break;
      }

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
        await page.waitForTimeout(2000);
      }

      // Capture: Deployment
      filepath = join(
        outDir,
        `02-deployment_${viewport.label.replace(/\s+/g, '-').toLowerCase()}.png`,
      );
      await page.screenshot({ path: filepath });
      console.log(`✓ Deployment: ${filepath.split('/').pop()}`);

      // Advance through a few turns by passing
      for (let i = 0; i < 3; i++) {
        const passBtn = page.locator('[data-testid="combat-pass-btn"]');
        if (await passBtn.isVisible()) {
          await passBtn.click();
          await page.waitForTimeout(1000);
        } else {
          break;
        }
      }

      // Capture: Attack
      filepath = join(outDir, `03-attack_${viewport.label.replace(/\s+/g, '-').toLowerCase()}.png`);
      await page.screenshot({ path: filepath });
      console.log(`✓ Attack: ${filepath.split('/').pop()}`);

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
3. Cross-reference against godot/client/ v2 implementation
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
