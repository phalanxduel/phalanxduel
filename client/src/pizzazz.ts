import type { PhalanxTurnResult, CombatLogEntry } from '@phalanxduel/shared';
import { getState } from './state';

export interface PizzazzTrigger {
  type: 'combat' | 'screenShake' | 'damagePop' | 'gameOver';
  ts: number;
  detail?: string;
}

declare global {
  interface Window {
    __pizzazz?: PizzazzEngine;
  }
}

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
  private activeAnimations = 0;
  private readonly triggerLog: PizzazzTrigger[] = [];
  private triggerSeq = 0;
  private static readonly TRIGGER_LOG_CAP = 100;

  constructor() {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.syncIdleAttribute();
    window.__pizzazz = this;
  }

  /** Returns a snapshot of recently-triggered animation events (newest last). */
  getTriggers(): readonly PizzazzTrigger[] {
    return this.triggerLog;
  }

  private recordTrigger(type: PizzazzTrigger['type'], detail?: string): void {
    const entry: PizzazzTrigger = { type, ts: Date.now(), ...(detail ? { detail } : {}) };
    this.triggerLog.push(entry);
    if (this.triggerLog.length > PizzazzEngine.TRIGGER_LOG_CAP) {
      this.triggerLog.shift();
    }
    this.triggerSeq++;
    document.body.dataset.pzLastTrigger = type;
    document.body.dataset.pzTriggerSeq = String(this.triggerSeq);
  }

  private trackAnimation(durationMs: number): void {
    this.activeAnimations++;
    this.syncIdleAttribute();
    setTimeout(() => {
      this.activeAnimations = Math.max(0, this.activeAnimations - 1);
      this.syncIdleAttribute();
    }, durationMs);
  }

  private syncIdleAttribute(): void {
    document.body.dataset.pzIdle = this.activeAnimations === 0 ? 'true' : 'false';
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
      const newEntries = postState.transactionLog?.slice(this.lastLogCount) ?? [];
      for (const entry of newEntries) {
        if (entry.details.type === 'attack') {
          this.onCombat(entry.details.combat);
        }
      }
      this.lastLogCount = currentLogCount;
    }

    // Game over detection
    if (postState.phase === 'gameOver' && preState.phase !== 'gameOver') {
      this.recordTrigger('gameOver');
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

    this.trackAnimation(1600); // 1200ms display + 400ms exit
    setTimeout(() => {
      splash.classList.add('pz-exit');
      setTimeout(() => {
        overlay.remove();
      }, 400);
    }, 1200);
  }

  // ── Combat Effects ───────────────────────────────

  private onCombat(combat: CombatLogEntry): void {
    this.recordTrigger('combat', `col=${combat.targetColumn}`);

    if (combat.totalLpDamage > 0) {
      this.triggerScreenShake();
    }

    this.showDamagePops(combat);
  }

  private triggerScreenShake(): void {
    this.recordTrigger('screenShake');
    const app = document.getElementById('app');
    if (!app) return;
    app.classList.add('pz-screen-shake');
    this.trackAnimation(400);
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
            const selector = isAttackerMine
              ? '.phx-opponent-zone, .stats-block.opponent'
              : '.phx-player-zone, .stats-block.mine';
            targetEl = document.querySelector(selector);
          } else {
            const row = step.target === 'frontCard' ? 0 : 1;
            const isAttackerMine = combat.attackerPlayerIndex === playerIndex;
            const playerTag = isAttackerMine ? 'opponent' : 'player';
            // V2 layout uses data-testid for cells
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

          this.recordTrigger('damagePop', `-${step.damage}`);
          document.body.appendChild(pop);
          pop.addEventListener('animationend', () => {
            pop.remove();
          });

          // Hit flash on target element
          targetEl.classList.add('pz-hit-flash');
          if (isLp) targetEl.classList.add('pz-lp-flash');
          setTimeout(() => {
            targetEl.classList.remove('pz-hit-flash', 'pz-lp-flash');
          }, 500);
          this.trackAnimation(idx * 300 + 500); // stagger + hit flash duration
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

    this.trackAnimation(1800 + 1600); // delay + splash duration
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
