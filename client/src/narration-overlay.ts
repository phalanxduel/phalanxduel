import type { Suit } from '@phalanxduel/shared';
import type { NarrationBus, NarrationEvent } from './narration-bus';
import type { CardType } from './narration-bus';
import { suitColor } from './cards';

const ROW_LABELS = ['Front Row', 'Back Row'];
const COLUMN_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

const PHASE_LABELS: Record<string, string> = {
  DeploymentPhase: 'DEPLOYMENT',
  AttackPhase: 'BATTLE START',
  ReinforcementPhase: 'REINFORCEMENT',
  gameOver: 'FINISH',
};

/**
 * Center overlay consumer — dramatic combat narration + phase announcements.
 * Builds text line-by-line, then fades the whole block out.
 * Phase announcements clear the current block and render as a large header.
 */
export class NarrationOverlay {
  private container: HTMLElement | null = null;
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;
  private gameOverTimer: ReturnType<typeof setTimeout> | null = null;
  private unsub: (() => void) | null = null;
  private reducedMotion: boolean;

  constructor(private bus: NarrationBus) {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  start(): void {
    this.unsub = this.bus.subscribe((event) => {
      this.onEvent(event);
    });
  }

  destroy(): void {
    this.unsub?.();
    this.clearContainer();
  }

  private onEvent(event: NarrationEvent): void {
    // On game over, set a hard deadline to clear before the Pizzazz splash (1800ms)
    if (event.type === 'phase-change' && event.phase === 'gameOver') {
      this.scheduleGameOverClear();
    }

    // Phase changes clear existing narration and show as a standalone header
    if (event.type === 'phase-change') {
      const label = PHASE_LABELS[event.phase];
      if (label) {
        this.showPhaseAnnouncement(label);
      }
      return;
    }

    const text = this.formatEvent(event);
    if (!text) return;

    const container = this.ensureContainer();
    this.resetFadeTimer();

    const line = document.createElement('div');
    line.className = this.getLineClass(event);

    // Apply suit color as inline style
    const suit = this.getEventSuit(event);
    if (suit) {
      line.style.color = suitColor(suit);
    }

    // Apply card type effects
    const cardType = this.getEventCardType(event);
    if (cardType === 'ace') line.classList.add('nr-card-ace');
    if (cardType === 'face') line.classList.add('nr-card-face');

    line.textContent = text;

    if (!this.reducedMotion) {
      line.classList.add('nr-line-enter');
    }

    container.appendChild(line);

    // Auto-fade after last event
    this.fadeTimer = setTimeout(() => {
      container.classList.add('nr-fade-out');
      setTimeout(() => {
        this.clearContainer();
      }, 600);
    }, 1200);
  }

  private showPhaseAnnouncement(label: string): void {
    // Clear any existing narration to make room for the phase header
    this.clearContainer();

    const container = this.ensureContainer();

    const line = document.createElement('div');
    line.className = 'nr-overlay-line nr-phase-announce';
    line.textContent = label;

    if (!this.reducedMotion) {
      line.classList.add('nr-line-enter');
    }

    container.appendChild(line);

    // Phase announcements hold for 1.5s then fade
    this.fadeTimer = setTimeout(() => {
      container.classList.add('nr-fade-out');
      setTimeout(() => {
        this.clearContainer();
      }, 500);
    }, 1500);
  }

  private formatEvent(event: NarrationEvent): string | null {
    switch (event.type) {
      case 'deploy': {
        const col = COLUMN_LABELS[event.column] ?? `${event.column + 1}th`;
        const row = ROW_LABELS[event.row] ?? `Row ${event.row + 1}`;
        return `${event.player} deploys ${event.card} to ${col} Column, ${row}`;
      }
      case 'attack':
        return `${event.attacker} attacks ${event.target} for ${event.damage} damage`;
      case 'destroyed':
        return 'DESTROYED';
      case 'overflow':
        return `${event.damage} damage carries to ${event.target}`;
      case 'lp-damage':
        return `${event.damage} damage to ${event.player}`;
      case 'pass':
        return `${event.player} passes`;
      case 'bonus':
        return event.message;
      case 'phase-change':
        return null; // Handled by showPhaseAnnouncement
    }
  }

  private getLineClass(event: NarrationEvent): string {
    const base = 'nr-overlay-line';
    if (event.type === 'destroyed') return `${base} nr-destroyed`;
    if (event.type === 'lp-damage') return `${base} nr-lp-hit`;
    if (event.type === 'bonus') return `${base} nr-bonus`;
    return base;
  }

  private getEventSuit(event: NarrationEvent): Suit | undefined {
    if ('suit' in event) return event.suit;
    return undefined;
  }

  private getEventCardType(event: NarrationEvent): CardType | undefined {
    if ('cardType' in event) return event.cardType;
    return undefined;
  }

  private ensureContainer(): HTMLElement {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'nr-overlay';
      this.container.setAttribute('aria-hidden', 'true');
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  private scheduleGameOverClear(): void {
    if (this.gameOverTimer) return;
    // Fade out at 1200ms, fully cleared by 1500ms — before Pizzazz splash at 1800ms
    this.gameOverTimer = setTimeout(() => {
      if (this.container) {
        this.container.classList.add('nr-fade-out');
        setTimeout(() => {
          this.clearContainer();
        }, 300);
      }
    }, 1200);
  }

  private clearContainer(): void {
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
    if (this.gameOverTimer) {
      clearTimeout(this.gameOverTimer);
      this.gameOverTimer = null;
    }
    this.container?.remove();
    this.container = null;
  }

  private resetFadeTimer(): void {
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
    // Remove fade-out class if present (new events arrived)
    this.container?.classList.remove('nr-fade-out');
  }
}
