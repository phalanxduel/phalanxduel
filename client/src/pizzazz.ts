import type { PhalanxTurnResult, CombatLogEntry } from '@phalanxduel/shared';
import { getState } from './state';

/**
 * PizzazzEngine — event-driven animation overlay system.
 *
 * Reacts to game state diffs (phase changes, combat, victories) and renders
 * fixed-position overlays on document.body, outside #app, so they survive
 * the full-DOM-replacement render cycle.
 */
export class PizzazzEngine {
  private lastPhase: string | null = null;
  private lastLogCount = 0;
  private initialized = false;
  private reducedMotion: boolean;

  constructor() {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Main entry: receives the full PhalanxTurnResult from dispatch. */
  onTurnResult(result: PhalanxTurnResult): void {
    const { preState, postState } = result;

    // Seed tracking counters on first arrival to avoid replaying history
    if (!this.initialized) {
      this.lastPhase = postState.phase;
      this.lastLogCount = postState.transactionLog?.length ?? 0;
      this.initialized = true;
      return;
    }

    if (this.reducedMotion) return;

    // Phase tracking (phase splash now handled by NarrationOverlay)
    if (postState.phase !== this.lastPhase) {
      this.lastPhase = postState.phase;
    }

    // New combat log entries
    const currentLogCount = postState.transactionLog?.length ?? 0;
    if (currentLogCount > this.lastLogCount) {
      const newEntries = postState.transactionLog!.slice(this.lastLogCount);
      for (const entry of newEntries) {
        if (entry.details.type === 'attack') {
          this.onCombat(entry.details.combat);
        }
      }
      this.lastLogCount = currentLogCount;
    }

    // Game over detection
    if (postState.phase === 'gameOver' && preState.phase !== 'gameOver') {
      this.onGameOver();
    }
  }

  // ── Splash (used for game over VICTORY/DEFEAT only) ──

  private showSplash(text: string, variant?: string): void {
    const overlay = this.makeEl('div', 'pz-splash-overlay');
    const splash = this.makeEl('div', 'pz-splash-text');
    if (variant) splash.classList.add(`pz-splash-${variant}`);
    splash.textContent = text;
    overlay.appendChild(splash);
    document.body.appendChild(overlay);

    setTimeout(() => {
      splash.classList.add('pz-exit');
      setTimeout(() => {
        overlay.remove();
      }, 400);
    }, 1200);
  }

  // ── Combat Effects ───────────────────────────────

  private onCombat(combat: CombatLogEntry): void {
    // Combat announcer replaced by NarrationOverlay

    if (combat.totalLpDamage > 0) {
      this.triggerScreenShake();
    }

    this.showDamagePops(combat);
  }

  private triggerScreenShake(): void {
    const app = document.getElementById('app');
    if (!app) return;
    app.classList.add('pz-screen-shake');
    setTimeout(() => {
      app.classList.remove('pz-screen-shake');
    }, 400);
  }

  private showDamagePops(combat: CombatLogEntry): void {
    const playerIndex = getState().playerIndex;

    combat.steps
      .filter((s) => s.damage > 0)
      .forEach((step, idx) => {
        setTimeout(() => {
          const isLp = step.target === 'playerLp';
          let targetEl: Element | null = null;

          if (isLp) {
            const isAttackerMine = combat.attackerPlayerIndex === playerIndex;
            const selector = isAttackerMine ? '.stats-block.opponent' : '.stats-block.mine';
            targetEl = document.querySelector(selector);
          } else {
            const row = step.target === 'frontCard' ? 0 : 1;
            const isAttackerMine = combat.attackerPlayerIndex === playerIndex;
            const playerTag = isAttackerMine ? 'opponent' : 'player';
            targetEl = document.querySelector(
              `[data-testid="${playerTag}-cell-r${row}-c${combat.targetColumn}"]`,
            );
          }

          if (!targetEl) return;

          const rect = targetEl.getBoundingClientRect();
          const pop = this.makeEl('div', 'pz-damage-pop');
          if (step.bonuses?.length) pop.classList.add('pz-crit');
          pop.textContent = `-${step.damage}`;
          pop.style.left = `${rect.left + rect.width / 2}px`;
          pop.style.top = `${rect.top + rect.height / 2}px`;

          document.body.appendChild(pop);
          pop.addEventListener('animationend', () => {
            pop.remove();
          });

          // Hit flash on target element
          targetEl.classList.add('pz-hit-flash');
          if (isLp) targetEl.classList.add('pz-lp-flash');
          setTimeout(() => {
            targetEl?.classList.remove('pz-hit-flash', 'pz-lp-flash');
          }, 500);
        }, idx * 300); // Stagger steps
      });
  }

  // ── Game Over ────────────────────────────────────

  private onGameOver(): void {
    const gs = getState().gameState;
    const outcome = gs?.outcome;
    if (!outcome) return;

    const playerIndex = getState().playerIndex;
    const isWin = playerIndex !== null && outcome.winnerIndex === playerIndex;
    const text = isWin ? 'VICTORY' : 'DEFEAT';
    const variant = isWin ? 'victory' : 'defeat';

    // Delay so it follows the phase splash
    setTimeout(() => {
      this.showSplash(text, variant);
    }, 1800);
  }

  // ── Helpers ──────────────────────────────────────

  private makeEl(tag: string, className: string): HTMLElement {
    const element = document.createElement(tag);
    element.className = className;
    return element;
  }
}
