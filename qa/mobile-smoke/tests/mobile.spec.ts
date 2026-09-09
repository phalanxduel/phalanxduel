import { test, expect } from '@playwright/test';

test('mobile lobby fits and exposes primary actions', async ({ page }) => {
  await page.goto('/?qaRunId=mobile-smoke');
  await page.waitForSelector('[data-testid="lobby-layout"]');
  await expect(page.locator('[data-testid="lobby-create-btn"]')).toBeVisible();
  await expect(page.locator('[data-testid="lobby-bot-btn-easy"]')).toBeVisible();
  const overflow = await page.evaluate(() => {
    const offenders = [...document.querySelectorAll<HTMLElement>('*')]
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 5)
      .map((el) => `${el.tagName}.${el.className}`);
    return { value: document.documentElement.scrollWidth > window.innerWidth + 1, offenders };
  });
  if (overflow.value) console.log(`Mobile overflow: ${overflow.offenders.join(', ')}`);
  expect(overflow.value).toBe(false);
});
