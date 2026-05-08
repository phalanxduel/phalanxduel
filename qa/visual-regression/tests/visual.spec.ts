import { test, expect } from '@playwright/test';

test.describe('Visual Regression - UI Integrity', () => {
  test('Lobby visual check', async ({ page }) => {
    await page.goto('/?qaRunId=visual');
    await page.waitForSelector('[data-testid="lobby-layout"]');
    
    // Capture the entire lobby
    await expect(page).toHaveScreenshot('lobby-main.png');
    
    // Open advanced options
    await page.locator('[data-testid="advanced-options-toggle"]').click();
    await expect(page.locator('[data-testid="advanced-options-panel"]')).toBeVisible();
    await expect(page).toHaveScreenshot('lobby-advanced-open.png');
  });

  test('Game board and Tactical Glows', async ({ page }) => {
    // 1. Setup a bot match
    await page.goto('/?qaRunId=visual'); 
    await page.waitForSelector('[data-testid="lobby-name-input"]');
    await page.locator('[data-testid="lobby-name-input"]').fill('VisualQA');
    await page.locator('[data-testid="lobby-quick-match-btn"]').click();
    
    // Wait for game to load
    await page.waitForSelector('[data-testid="game-layout"]', { timeout: 30000 });
    
    // 2. Capture initial board
    await expect(page).toHaveScreenshot('game-initial-board.png');
    
    // 3. Trigger tactical glows
    // We need to wait for it to be our turn
    await expect(page.locator('[data-testid="turn-indicator"]')).toContainText('YOUR_TURN', { timeout: 10000 });
    
    const phase = await page.getAttribute('[data-testid="game-layout"]', 'data-phase');
    
    if (phase === 'deployment') {
      // Deploy a card to trigger deploy flash (though it's an animation, a snapshot should capture it)
      const handCard = page.locator('[data-testid^="hand-card-"]').first();
      const firstCol = page.locator('[data-testid="player-grid-col-0"]');
      await handCard.click();
      await firstCol.click();
      
      // Wait a tiny bit for the land effect
      await page.waitForTimeout(100);
      await expect(page).toHaveScreenshot('game-deployment-land.png');
    }
    
    // Skip to battle phase if needed (this depends on the bot's speed)
    // For a robust visual test, we should probably mock the state or use a controlled scenario.
    // But for now, let's try to catch the combat highlights.
  });

  test('Component Library - Cards', async ({ page }) => {
    // Navigate to a debug page or just check them in the lobby if they appear
    await page.goto('/?qaRunId=visual');
    // Check if there are any promotional cards or similar
    // Alternatively, we could create a dedicated component-gallery page in dev mode
  });
});
