import type { PhalanxTurnResult, CombatLogEntry } from '@phalanxduel/shared';
import { isGameOver } from '@phalanxduel/shared';
import { getState } from './state';

export interface PizzazzTrigger {
  type:
    | 'combat'
    | 'screenShake'
    | 'damagePop'
    | 'gameOver'
    | 'attackVector'
    | 'suitPip'
    | 'deploy'
    | 'columnActive';
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

  private static readonly BONUS_SUIT: Readonly<
    Record<string, { glyph: string; cssClass: string }>
  > = {
    diamondDeathShield: { glyph: '♦', cssClass: 'pz-suit-pip--diamond' },
    diamondDoubleDefense: { glyph: '♦', cssClass: 'pz-suit-pip--diamond' },
    clubDoubleOverflow: { glyph: '♣', cssClass: 'pz-suit-pip--club' },
    spadeDoubleLp: { glyph: '♠', cssClass: 'pz-suit-pip--spade' },
    heartDeathShield: { glyph: '♥', cssClass: 'pz-suit-pip--heart' },
    aceInvulnerable: { glyph: '⊕', cssClass: 'pz-suit-pip--ace' },
    aceVsAce: { glyph: '⊕', cssClass: 'pz-suit-pip--ace' },
  };

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

    // New transaction log entries
    const currentLogCount = postState.transactionLog?.length ?? 0;
    if (currentLogCount > this.lastLogCount) {
      const newEntries = postState.transactionLog?.slice(this.lastLogCount) ?? [];
      for (const entry of newEntries) {
        if (entry.details.type === 'attack') {
          this.onCombat(entry.details.combat);
        } else if (entry.action.type === 'deploy') {
          const a = entry.action as { type: 'deploy'; playerIndex: number; column: number };
          this.recordTrigger('deploy', `player=${a.playerIndex},col=${a.column}`);
          this.showDeployEffect(a.playerIndex, a.column);
        }
      }
      this.lastLogCount = currentLogCount;
    }

    // Game over detection
    if (isGameOver(postState) && !isGameOver(preState)) {
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
    // Record all triggers unconditionally first (automation relies on these)
    this.recordTrigger('combat', `col=${combat.targetColumn}`);
    this.recordTrigger('columnActive', `col=${combat.targetColumn}`);
    this.recordTrigger('attackVector', `col=${combat.targetColumn}`);

    for (const step of combat.steps) {
      for (const bonus of step.bonuses ?? []) {
        if (PizzazzEngine.BONUS_SUIT[bonus]) {
          this.recordTrigger('suitPip', bonus);
        }
      }
    }

    if (combat.totalLpDamage > 0) {
      this.triggerScreenShake();
    }

    // DOM effects (no-op when elements are absent, e.g. jsdom / spectator pre-render)
    this.showColumnHighlight(combat.targetColumn);
    this.showAttackVector(combat);
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

  // ── Column highlight ─────────────────────────────

  private showColumnHighlight(col: number): void {
    for (const tag of ['player', 'opponent'] as const) {
      for (const row of [0, 1]) {
        const el = document.querySelector(`[data-testid="${tag}-cell-r${row}-c${col}"]`);
        if (!el) continue;
        el.classList.add('pz-column-glow');
        this.trackAnimation(700);
        setTimeout(() => {
          el.classList.remove('pz-column-glow');
        }, 700);
      }
    }
  }

  // ── Attack vector beam ───────────────────────────

  private showAttackVector(combat: CombatLogEntry): void {
    const { attackerPlayerIndex, targetColumn, steps } = combat;
    // Spectators have playerIndex=null; board renders from player-0's perspective
    const viewerIndex = getState().playerIndex ?? 0;
    const isMyAttack = attackerPlayerIndex === viewerIndex;

    const attackerTag = isMyAttack ? 'player' : 'opponent';
    const defenderTag = isMyAttack ? 'opponent' : 'player';

    const attackerEl =
      document.querySelector(`[data-testid="${attackerTag}-cell-r0-c${targetColumn}"]`) ??
      document.querySelector(`[data-testid="${attackerTag}-battlefield"]`);

    // Beam reaches the deepest point of penetration in the column
    const hasLpHit = steps.some((s) => s.target === 'playerLp' && s.damage > 0);
    const hasBackHit = steps.some((s) => s.target === 'backCard' && s.damage > 0);

    let defenderEl: Element | null = null;
    if (hasLpHit) {
      defenderEl =
        document.querySelector(`[data-testid="${defenderTag}-stats"]`) ??
        document.querySelector(isMyAttack ? '.phx-opponent-zone' : '.phx-player-zone');
    } else if (hasBackHit) {
      defenderEl = document.querySelector(
        `[data-testid="${defenderTag}-cell-r1-c${targetColumn}"]`,
      );
    }
    defenderEl ??= document.querySelector(
      `[data-testid="${defenderTag}-cell-r0-c${targetColumn}"]`,
    );

    if (!attackerEl || !defenderEl) return;

    const aRect = attackerEl.getBoundingClientRect();
    const dRect = defenderEl.getBoundingClientRect();
    const ax = aRect.left + aRect.width / 2;
    const ay = aRect.top + aRect.height / 2;
    const dx = dRect.left + dRect.width / 2;
    const dy = dRect.top + dRect.height / 2;

    const length = Math.hypot(dx - ax, dy - ay);
    const angle = Math.atan2(dy - ay, dx - ax) * (180 / Math.PI);

    const beam = this.makeEl(
      'div',
      isMyAttack ? 'pz-attack-beam' : 'pz-attack-beam pz-attack-beam--defense',
    );
    beam.style.left = `${ax}px`;
    beam.style.top = `${ay}px`;
    beam.style.width = `${length}px`;
    beam.style.transform = `rotate(${angle}deg)`;

    document.body.appendChild(beam);
    this.trackAnimation(550);
    setTimeout(() => {
      beam.remove();
    }, 550);

    // Impact flash at target end
    defenderEl.classList.add('pz-impact-flash');
    setTimeout(() => {
      defenderEl.classList.remove('pz-impact-flash');
    }, 350);
  }

  // ── Damage pops + suit pip bursts ────────────────

  private showDamagePops(combat: CombatLogEntry): void {
    // Spectators have playerIndex=null; board renders from player-0's perspective
    const viewerIndex = getState().playerIndex ?? 0;

    combat.steps
      .filter((s) => s.damage > 0)
      .forEach((step, idx) => {
        setTimeout(() => {
          const isLp = step.target === 'playerLp';
          let targetEl: Element | null = null;

          if (isLp) {
            const isAttackerMine = combat.attackerPlayerIndex === viewerIndex;
            const selector = isAttackerMine
              ? '.phx-opponent-zone, .stats-block.opponent'
              : '.phx-player-zone, .stats-block.mine';
            targetEl = document.querySelector(selector);
          } else {
            const row = step.target === 'frontCard' ? 0 : 1;
            const isAttackerMine = combat.attackerPlayerIndex === viewerIndex;
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

          this.recordTrigger('damagePop', `-${step.damage}`);
          document.body.appendChild(pop);
          pop.addEventListener('animationend', () => {
            pop.remove();
          });

          // Suit pip burst for each bonus on this step
          for (const bonus of step.bonuses ?? []) {
            this.showSuitPipAt(bonus, targetEl);
          }

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

  private showSuitPipAt(bonus: string, anchor: Element): void {
    const suitInfo = PizzazzEngine.BONUS_SUIT[bonus];
    if (!suitInfo) return;
    const rect = anchor.getBoundingClientRect();
    const pip = this.makeEl('div', `pz-suit-pip ${suitInfo.cssClass}`);
    pip.textContent = suitInfo.glyph;
    pip.style.left = `${rect.left + rect.width / 2}px`;
    pip.style.top = `${rect.top + rect.height / 2}px`;
    document.body.appendChild(pip);
    this.trackAnimation(650);
    pip.addEventListener('animationend', () => {
      pip.remove();
    });
  }

  // ── Deploy Effects ────────────────────────────────

  private showDeployEffect(deployingPlayer: number, column: number): void {
    // Spectators have playerIndex=null; board renders from player-0's perspective
    const viewerIndex = getState().playerIndex ?? 0;
    const tag = deployingPlayer === viewerIndex ? 'player' : 'opponent';

    const destEl =
      document.querySelector(`[data-testid="${tag}-cell-r0-c${column}"]`) ??
      document.querySelector(`[data-testid="${tag}-cell-r1-c${column}"]`);

    if (!destEl) return;

    destEl.classList.add('pz-deploy-flash');
    this.trackAnimation(600);
    setTimeout(() => {
      destEl.classList.remove('pz-deploy-flash');
    }, 600);

    // Floating "DEPLOY" label over the destination cell
    const dRect0 = destEl.getBoundingClientRect();
    const label = this.makeEl(
      'div',
      `pz-deploy-label${tag === 'opponent' ? ' pz-deploy-label--opponent' : ''}`,
    );
    label.textContent = 'DEPLOY';
    label.style.left = `${dRect0.left + dRect0.width / 2}px`;
    label.style.top = `${dRect0.top}px`;
    document.body.appendChild(label);
    this.trackAnimation(800);
    label.addEventListener('animationend', () => {
      label.remove();
    });

    // Fly ghost card: prefer hand, fall back to the deploying player's stats block
    const handEl =
      document.querySelector('[data-testid="hand-container"]') ??
      document.querySelector('[data-testid="hand"]') ??
      document.querySelector(`[data-testid="${tag}-stats"]`);

    if (!handEl) return;

    const hRect = handEl.getBoundingClientRect();
    const dRect = destEl.getBoundingClientRect();
    const tx = dRect.left + dRect.width / 2;
    const ty = dRect.top + dRect.height / 2;

    const fly = this.makeEl('div', 'pz-deploy-fly');
    fly.style.left = `${tx}px`;
    fly.style.top = `${ty}px`;
    fly.style.setProperty('--pz-from-x', `${hRect.left + hRect.width / 2 - tx}px`);
    fly.style.setProperty('--pz-from-y', `${hRect.top + hRect.height / 2 - ty}px`);

    document.body.appendChild(fly);
    this.trackAnimation(500);
    fly.addEventListener('animationend', () => {
      fly.remove();
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
