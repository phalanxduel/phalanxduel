import type { Suit } from '@phalanxduel/shared';
import type { NarrationBus, NarrationEvent } from './narration-bus';
import type { CardType } from './narration-bus';
import { suitColor } from './cards';

const PHASE_LABELS: Record<string, string> = {
  DeploymentPhase: 'DEPLOYMENT',
  AttackPhase: 'BATTLE',
  ReinforcementPhase: 'REINFORCEMENT',
  gameOver: 'GAME OVER',
};

const COLUMN_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

const MAX_LINES = 30;

/**
 * Left-side ticker consumer — persistent combat feed with a11y.
 * `role="log"` + `aria-live="polite"` for screen readers.
 */
export class NarrationTicker {
  private container: HTMLElement | null = null;
  private unsub: (() => void) | null = null;
  private lineCount = 0;
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
    this.container?.remove();
    this.container = null;
    this.lineCount = 0;
  }

  private onEvent(event: NarrationEvent): void {
    const text = this.formatEvent(event);
    if (!text) return;

    const container = this.ensureContainer();

    const line = document.createElement('div');
    line.className = this.getLineClass(event);

    // Apply suit color
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
      line.classList.add('nr-ticker-enter');
    }

    container.appendChild(line);
    this.lineCount++;

    // Prune old lines
    while (this.lineCount > MAX_LINES && container.firstChild) {
      container.removeChild(container.firstChild);
      this.lineCount--;
    }

    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  private formatEvent(event: NarrationEvent): string | null {
    switch (event.type) {
      case 'deploy': {
        const col = COLUMN_LABELS[event.column] ?? `${event.column + 1}th`;
        return `${event.player} deploys ${event.card} (${col})`;
      }
      case 'attack':
        return `${event.attacker} → ${event.target} (${event.damage})`;
      case 'destroyed':
        return `DESTROYED`;
      case 'overflow':
        return `↪ ${event.target} (${event.damage})`;
      case 'lp-damage':
        return `${event.damage} dmg → ${event.player}`;
      case 'pass':
        return `${event.player} passes`;
      case 'bonus':
        return event.message;
      case 'phase-change': {
        const label = PHASE_LABELS[event.phase] ?? event.phase;
        return `── ${label} ──`;
      }
    }
  }

  private getLineClass(event: NarrationEvent): string {
    const base = 'nr-ticker-line';
    if (event.type === 'destroyed') return `${base} nr-ticker-destroyed`;
    if (event.type === 'lp-damage') return `${base} nr-ticker-lp`;
    if (event.type === 'bonus') return `${base} nr-ticker-bonus`;
    if (event.type === 'phase-change') return `${base} nr-ticker-phase`;
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
      this.container.className = 'nr-ticker';
      this.container.setAttribute('role', 'log');
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-label', 'Combat narration');
      document.body.appendChild(this.container);
    }
    return this.container;
  }
}
