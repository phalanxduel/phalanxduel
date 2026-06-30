import { test, expect } from '@playwright/test';

test.describe('Visual Regression - UI Integrity', () => {
  test('Lobby visual check', async ({ page }) => {
    await page.goto('/?qaRunId=visual&seed=42');
    await page.addStyleTag({
      content: 'canvas { display: none !important; } * { caret-color: transparent !important; }',
    });
    await page.waitForSelector('[data-testid="lobby-layout"]');

    // Wait for the dynamic panels to settle
    await page.waitForSelector('[data-testid="public-open-matches-panel"]');

    // Remove focus from inputs to hide blinking cursor
    await page.locator('body').click({ position: { x: 0, y: 0 } });

    // Capture the entire lobby, masking dynamic content like open matches
    await expect(page).toHaveScreenshot('lobby-main.png', {
      mask: [
        page.locator('[data-testid="public-open-matches-panel"]'),
        page.locator('[data-testid="active-match-panel"]'),
      ],
    });

    // Open advanced options
    await page.locator('[data-testid="advanced-options-toggle"]').click();
    await expect(page.locator('[data-testid="advanced-options-panel"]')).toBeVisible();
    await expect(page).toHaveScreenshot('lobby-advanced-open.png', {
      mask: [
        page.locator('[data-testid="public-open-matches-panel"]'),
        page.locator('[data-testid="active-match-panel"]'),
      ],
    });
  });

  test('Game board and Tactical Glows', async ({ page }) => {
    // 1. Setup a bot match deterministically (normal mode, no quickstart as it might be broken with bots)
    await page.goto('/?qaRunId=visual&seed=42');
    await page.addStyleTag({
      content: 'canvas { display: none !important; } * { caret-color: transparent !important; }',
    });
    await page.waitForSelector('[data-testid="lobby-name-input"]');
    await page.locator('[data-testid="lobby-name-input"]').fill('VisualQA');
    // Click easy bot explicitly so we don't rely on random matchmaking queues
    await page.locator('[data-testid="lobby-bot-btn-easy"]').click();

    // Wait for game to load
    await page.waitForSelector('[data-testid="game-layout"]', { timeout: 30000 });

    // 2. Wait for it to be our turn and for animations to settle
    await expect(page.locator('[data-testid="turn-indicator"]')).toContainText('YOUR_TURN', {
      timeout: 10000,
    });
    // Wait for bot deployment animations to settle (timer is masked anyway)
    await page.waitForTimeout(2500);

    // Remove focus from any buttons so we don't capture hover states
    await page.locator('body').click({ position: { x: 0, y: 0 } });

    // Capture initial board, masking the turn indicator (timer) and event log
    await expect(page).toHaveScreenshot('game-initial-board.png', {
      mask: [
        page.locator('[data-testid="turn-indicator"]'),
        page.locator('[data-component="NarrationView"]'), // The event ticker
      ],
    });

    // 3. Trigger tactical glows
    const phase = await page.getAttribute('[data-testid="game-layout"]', 'data-phase');

    if (phase === 'deployment') {
      // Deploy a card to trigger deploy flash (though it's an animation, a snapshot should capture it)
      const handCard = page.locator('[data-testid^="hand-card-"]').first();
      const firstCol = page.locator('[data-testid="player-grid-col-0"]');
      await handCard.click();
      await firstCol.click();

      // Wait a tiny bit for the land effect
      await page.waitForTimeout(100);
      await expect(page).toHaveScreenshot('game-deployment-land.png', {
        mask: [
          page.locator('[data-testid="turn-indicator"]'),
          page.locator('[data-component="NarrationView"]'),
        ],
      });
    }
  });

  test('Component Library - Cards', async ({ page }) => {
    // Navigate to a debug page or just check them in the lobby if they appear
    await page.goto('/?qaRunId=visual&seed=42');
  });
});
