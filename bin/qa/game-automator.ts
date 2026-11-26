import { expect as playwrightExpect, type Locator, type Page } from '@playwright/test';

const expect = playwrightExpect.configure({ timeout: 20_000 });

export interface GameAutomatorOptions {
  /** Optional hover pause before clicks for human-readable video recordings. */
  hoverDelayMs?: number;
}

export type BrowserPhase =
  | 'StartTurn'
  | 'DeploymentPhase'
  | 'AttackPhase'
  | 'AttackResolution'
  | 'CleanupPhase'
  | 'ReinforcementPhase'
  | 'DrawPhase'
  | 'EndTurn'
  | 'gameOver'
  | 'unknown';

export type QuickDeployStrategy = 'defensive' | 'aggressive' | 'random';

export class GameAutomator {
  private readonly hoverDelayMs: number;

  constructor(
    private page: Page,
    options: GameAutomatorOptions = {},
  ) {
    this.hoverDelayMs = options.hoverDelayMs ?? 0;
  }

  async clickTarget(target: Locator): Promise<void> {
    if (this.hoverDelayMs > 0) {
      await target.hover();
      await this.page.waitForTimeout(this.hoverDelayMs);
    }
    await target.click();
  }

  async readPhase(): Promise<BrowserPhase> {
    if (
      await this.page
        .locator('[data-testid="game-over"]')
        .isVisible()
        .catch(() => false)
    ) {
      return 'gameOver';
    }
    const phase = await this.page
      .locator('[data-testid="phase-indicator"]')
      .getAttribute('data-phase')
      .catch(() => null);
    return (
      phase &&
      [
        'StartTurn',
        'DeploymentPhase',
        'AttackPhase',
        'AttackResolution',
        'CleanupPhase',
        'ReinforcementPhase',
        'DrawPhase',
        'EndTurn',
        'gameOver',
      ].includes(phase)
        ? phase
        : 'unknown'
    ) as BrowserPhase;
  }

  async waitForPhase(expected: BrowserPhase | BrowserPhase[], timeout = 15_000): Promise<void> {
    const phases = Array.isArray(expected) ? expected : [expected];
    await this.page.waitForFunction(
      (allowed) => {
        const gameOver = document.querySelector('[data-testid="game-over"]');
        if (allowed.includes('gameOver') && gameOver) return true;
        const phase = document
          .querySelector('[data-testid="phase-indicator"]')
          ?.getAttribute('data-phase');
        return phase ? allowed.includes(phase as BrowserPhase) : false;
      },
      phases,
      { timeout },
    );
  }

  async waitForTerminal(timeout = 15_000): Promise<void> {
    await this.page.waitForSelector('[data-testid="game-over"]', { state: 'visible', timeout });
  }

  async isMyTurn(): Promise<boolean> {
    const turnIndicator = this.page.locator('[data-testid="turn-indicator"]');
    return (await turnIndicator.textContent().catch(() => null))?.trim() === 'YOUR_TURN';
  }

  async waitForOutcome(timeout = 15_000): Promise<void> {
    await this.page.waitForSelector('[data-testid="game-over-result"]', {
      state: 'visible',
      timeout,
    });
  }

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

  async createLobbyMatch(
    startingLp?: number,
    mode?: 'cumulative' | 'classic',
    botOpponent?: 'bot-random' | 'bot-heuristic',
  ): Promise<void> {
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
    if (botOpponent) {
      await this.selectBotOpponent(botOpponent);
      return;
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

  async quickDeploy(strategy: QuickDeployStrategy): Promise<void> {
    const control = this.page.locator(`[data-testid="quick-deploy-${strategy}"]`);
    await control.waitFor({ state: 'visible', timeout: 10_000 });
    await control.click();
  }

  async pass(): Promise<void> {
    const button = this.page.locator('[data-testid="combat-pass-btn"]');
    await button.waitFor({ state: 'visible', timeout: 10_000 });
    await button.click();
  }

  async skipReinforcement(): Promise<void> {
    const button = this.page.locator('[data-testid="combat-skip-reinforce-btn"]');
    await button.waitFor({ state: 'visible', timeout: 10_000 });
    await button.click();
  }

  async forfeit(): Promise<void> {
    const button = this.page.locator('[data-testid="combat-forfeit-btn"]');
    await button.waitFor({ state: 'visible', timeout: 10_000 });
    await button.click({ force: true });
  }

  async startMatch(
    options: {
      playerName?: string;
      mode?: string;
      startingLp?: number;
      startTestId?: string;
    } = {},
  ): Promise<void> {
    if (options.playerName) {
      const name = this.page.getByTestId('lobby-name-input');
      if ((await name.count()) > 0 && (await name.isEditable())) {
        await name.fill(options.playerName);
      }
    }
    if (options.mode || options.startingLp !== undefined) {
      if (!(await this.page.getByTestId('advanced-options-panel').isVisible())) {
        await this.clickTarget(this.page.getByTestId('advanced-options-toggle'));
      }
      if (options.mode) {
        await this.page.getByTestId('lobby-damage-mode').selectOption(options.mode);
      }
      if (options.startingLp !== undefined) {
        await this.page.getByTestId('lobby-starting-lp').fill(String(options.startingLp));
      }
    }
    await this.clickTarget(this.page.getByTestId(options.startTestId ?? 'lobby-quick-match-btn'));
    await expect(this.page.locator('[data-testid="game-layout"]')).toBeVisible();
  }

  async playCard(sourceSelector: string, destSelector: string): Promise<void> {
    const board = this.page.locator('[data-testid="game-layout"]');
    const actionCount = await board.getAttribute('data-action-count');
    await this.clickTarget(this.page.locator(sourceSelector).first());
    await this.clickTarget(this.page.locator(destSelector).first());
    await expect
      .poll(async () => {
        if (await this.page.getByTestId('game-over').isVisible()) return true;
        const nextCount = await board.getAttribute('data-action-count');
        return nextCount !== null && nextCount !== actionCount;
      })
      .toBe(true);
  }

  async deployFirstCard(): Promise<void> {
    await this.playCard(
      '[data-testid^="hand-card-"].playable',
      '[data-testid="player-battlefield"] .valid-target',
    );
  }

  async attackFirst(
    sourceSelector = '[data-testid="player-battlefield"] .attack-playable',
    destSelector = '[data-testid="opponent-battlefield"] .valid-target',
  ): Promise<void> {
    await this.playCard(sourceSelector, destSelector);
  }

  async reinforceFirst(): Promise<void> {
    await this.playCard(
      '[data-testid^="hand-card-"].reinforce-playable',
      '.reinforce-col.valid-target',
    );
  }

  async selectAttackWithForecast(targetSelector: string): Promise<void> {
    const sources = this.page.locator('[data-testid="player-battlefield"] .attack-playable');
    await expect(sources.first()).toBeVisible();
    for (const source of await sources.all()) {
      await this.clickTarget(source);
      if (await this.page.locator(targetSelector).first().isVisible()) return;
    }
    throw new Error(`No legal attack with the requested forecast: ${targetSelector}`);
  }

  async playUntil(stopSelector: string, maxTurns = 100): Promise<void> {
    const end = this.page.getByTestId('game-over');
    const stop = this.page.locator(stopSelector).first();
    for (let turn = 0; turn < maxTurns; turn++) {
      if (await stop.isVisible()) return;
      if (await end.isVisible()) throw new Error('Match ended before the requested game position');
      const attack = this.page
        .locator('[data-testid="player-battlefield"] .attack-playable')
        .first();
      const reinforce = this.page.locator('[data-testid^="hand-card-"].reinforce-playable').first();
      const pass = this.page.getByTestId('combat-pass-btn');
      const skip = this.page.getByTestId('combat-skip-reinforce-btn');
      await expect(stop.or(attack).or(reinforce).or(pass).or(skip).or(end).first()).toBeAttached();
      if (await stop.isVisible()) return;
      if (await end.isVisible()) throw new Error('Match ended before the requested game position');
      if (await attack.isVisible()) {
        await this.attackFirst();
      } else if (await reinforce.isVisible()) {
        await this.reinforceFirst();
      } else {
        await this.clickTarget(this.page.getByTestId('command-drawer-handle'));
        await this.clickTarget((await skip.count()) ? skip : pass);
      }
      await this.page.waitForTimeout(500);
    }
    throw new Error(`Requested game position did not appear within ${maxTurns} player actions`);
  }
}
