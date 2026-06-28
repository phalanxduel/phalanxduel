import type { Page, Locator } from '@playwright/test';

export class GameAutomator {
  constructor(private page: Page) {}

  async isLoggedIn(): Promise<boolean> {
    const disconnectBtn = this.page
      .locator(
        'button:has-text("DISCONNECT"), [data-testid="lobby-create-btn"]:has-text("DISCONNECT")',
      )
      .first();
    return await disconnectBtn.isVisible().catch(() => false);
  }

  async openAuthPanel(): Promise<void> {
    const authButton = this.page.locator('[data-testid="userbar-authorize-btn"]');
    if (await authButton.isVisible().catch(() => false)) {
      await authButton.click();
      await this.page.waitForSelector('[data-component="AuthView"]', { timeout: 5000 });
    }
  }

  async waitForAuthPanelClose(): Promise<void> {
    await this.page
      .waitForSelector('[data-component="AuthView"]', {
        state: 'hidden',
        timeout: 15_000,
      })
      .catch(async () => {
        // Fallback just in case
        await this.page
          .locator('[data-testid="userbar-authorize-btn"]')
          .waitFor({ state: 'hidden', timeout: 15_000 })
          .catch(() => {});
      });
  }

  async getAuthError(): Promise<string | null> {
    const authError = this.page.locator('.auth-error');
    if (await authError.isVisible().catch(() => false)) {
      return (await authError.textContent())?.trim() || null;
    }
    return null;
  }

  async authLogin(email: string, pass: string): Promise<void> {
    await this.page.waitForSelector('[data-component="AuthView"]');
    // Ensure we are in login mode
    const submitBtn = this.page.locator('[data-component="AuthView"] [data-action="login"]');
    if (!(await submitBtn.isVisible().catch(() => false))) {
      await this.page.click('[data-testid="auth-toggle-mode-btn"]');
      await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
    }
    await this.page.fill('[data-component="AuthView"] [data-input="email"]', email);
    await this.page.fill('[data-component="AuthView"] [data-input="password"]', pass);
    await submitBtn.click();
  }

  async authRegister(gamertag: string, email: string, pass: string): Promise<void> {
    await this.page.waitForSelector('[data-component="AuthView"]');
    // Ensure we are in register mode
    const submitBtn = this.page.locator('[data-component="AuthView"] [data-action="register"]');
    if (!(await submitBtn.isVisible().catch(() => false))) {
      await this.page.click('[data-testid="auth-toggle-mode-btn"]');
      await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
    }
    await this.page.fill('[data-component="AuthView"] [data-input="gamertag"]', gamertag);
    await this.page.fill('[data-component="AuthView"] [data-input="email"]', email);
    await this.page.fill('[data-component="AuthView"] [data-input="password"]', pass);
    await submitBtn.click();
  }

  async createLobbyMatch(startingLp?: number, mode?: 'cumulative' | 'classic'): Promise<void> {
    await this.page.waitForSelector('[data-component="LobbyView"]');
    const advancedToggle = this.page.locator('[data-testid="advanced-options-toggle"]');
    if (await advancedToggle.isVisible().catch(() => false)) {
      await advancedToggle.click();
    }
    if (mode) {
      const modeSelect = this.page.locator('[data-testid="lobby-damage-mode"]');
      if (await modeSelect.isVisible().catch(() => false)) {
        await modeSelect.selectOption(mode);
      }
    }
    if (startingLp) {
      const lpInput = this.page.locator('[data-testid="lobby-starting-lp"]');
      if (await lpInput.isVisible().catch(() => false)) {
        await lpInput.fill(startingLp.toString());
        await lpInput.dispatchEvent('change');
      }
    }
    await this.page.click('[data-component="LobbyView"] [data-action="create-match"]');
  }

  async enterGuestOperativeId(id: string): Promise<void> {
    const idInput = this.page.locator('[data-testid="lobby-name-input"]');
    if (await idInput.isVisible()) {
      await idInput.fill(id);
    }
  }

  async joinLobbyMatch(matchId: string): Promise<void> {
    await this.page.waitForSelector('[data-component="LobbyView"]');
    await this.page.click(
      `[data-component="LobbyView"] [data-action="join-match"][data-match="${matchId}"]`,
    );
  }

  async selectBotOpponent(opponent: 'bot-random' | 'bot-heuristic'): Promise<void> {
    const testId = opponent === 'bot-heuristic' ? 'lobby-bot-btn-med' : 'lobby-bot-btn-easy';
    await this.page.click(`[data-testid="${testId}"]`);
  }

  async getWaitingMatchId(): Promise<string> {
    await this.page.waitForSelector('[data-testid="waiting-match-id"]');
    const rawMatchId = await this.page.textContent('[data-testid="waiting-match-id"]');
    const matchId = rawMatchId?.trim() ?? '';
    if (!matchId) {
      throw new Error(`Failed to read waiting match ID`);
    }
    return matchId;
  }

  async joinMatch(matchId: string): Promise<void> {
    await this.page.fill('[data-testid="lobby-join-input"]', matchId);
    await this.page.click('[data-testid="lobby-join-btn"]');
  }

  async deployCard(cardId: string, col: number): Promise<void> {
    await this.page.click(`[data-component="CardView"][data-location="hand"][data-id="${cardId}"]`);
    await this.page.click(
      `[data-component="CardView"][data-owner="p1"][data-col="${col}"][data-state="targetable"]`,
    );
    await this.page.click('[data-component="ActionPromptView"][data-action="deploy"]');
  }

  async attack(col: number): Promise<void> {
    await this.page.click(
      `[data-component="CardView"][data-owner="p1"][data-col="${col}"][data-state="selectable"]`,
    );
    await this.page.click(
      `[data-component="CardView"][data-owner="p2"][data-col="${col}"][data-state="targetable"]`,
    );
    await this.page.click('[data-component="ActionPromptView"][data-action="attack"]');
  }

  async reinforce(cardId: string, col: number): Promise<void> {
    await this.page.click(`[data-component="CardView"][data-location="hand"][data-id="${cardId}"]`);
    await this.page.click(
      `[data-component="CardView"][data-owner="p1"][data-col="${col}"][data-state="targetable"]`,
    );
    await this.page.click('[data-component="ActionPromptView"][data-action="reinforce"]');
  }
}
