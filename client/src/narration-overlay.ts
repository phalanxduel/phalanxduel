import type { Suit } from '@phalanxduel/shared';
import type { NarrationBus, NarrationEvent } from './narration-bus';
import type { CardType } from './narration-bus';
import { suitColor } from './cards';
import { PHASE_DISPLAY } from './constants';
import { PRESENTATION_TIMING, type PresentationState } from './presentation-timing';

const ROW_LABELS = ['Front Row', 'Back Row'];
const COLUMN_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

/**
 * Center overlay consumer — dramatic combat narration + phase announcements.
 * Builds text line-by-line, then fades the whole block out.
 * Phase announcements clear the current block and render as a large header.
 */
export class NarrationOverlay {
  private container: HTMLElement | null = null;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private exitTimer: ReturnType<typeof setTimeout> | null = null;
  private unsub: (() => void) | null = null;
  private readonly reducedMotion: boolean;

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
    if (event.type === 'terminal') {
      this.clearContainer();
      return;
    }

    // Phase changes clear existing narration and show as a standalone header
    if (event.type === 'phase-change') {
      const label = PHASE_DISPLAY[event.phase];
      if (label) {
        this.showPhaseAnnouncement(label.toUpperCase());
      }
      return;
    }

    const text = this.formatEvent(event);
    if (!text) return;

    if (this.container?.dataset.presentationState === 'exiting') {
      this.clearContainer();
    }
    const container = this.ensureContainer();
    this.clearLifecycleTimers();
    this.setPresentationState('holding');

    const existingLines = [...container.querySelectorAll<HTMLElement>('.nr-overlay-line')];
    for (const existingLine of existingLines) existingLine.classList.add('nr-line-prior');
    for (const staleLine of existingLines.slice(0, -2)) staleLine.remove();

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
    this.scheduleExit(
      this.reducedMotion
        ? PRESENTATION_TIMING.overlay.reducedHold
        : PRESENTATION_TIMING.overlay.narrationHold,
    );
  }

  private showPhaseAnnouncement(label: string): void {
    if (this.container) {
      this.beginExit(() => this.renderPhaseAnnouncement(label));
      return;
    }
    this.renderPhaseAnnouncement(label);
  }

  private renderPhaseAnnouncement(label: string): void {
    const container = this.ensureContainer();
    this.setPresentationState('holding');
    container.dataset.presentationKind = 'phase';

    const line = document.createElement('div');
    line.className = 'nr-overlay-line nr-phase-announce';
    line.textContent = label;

    if (!this.reducedMotion) {
      line.classList.add('nr-line-enter');
    }

    container.appendChild(line);
    this.scheduleExit(
      this.reducedMotion
        ? PRESENTATION_TIMING.overlay.reducedHold
        : PRESENTATION_TIMING.overlay.phaseHold,
    );
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
      case 'calculation':
        return event.equation;
      case 'terminal':
        return null;
      case 'phase-change':
        return null; // Handled by showPhaseAnnouncement
      case 'combo':
        return `${event.count}-HIT COMBO!`;
      case 'cinematic':
        return null; // Handled by CinematicOverlay
    }
  }

  private getLineClass(event: NarrationEvent): string {
    const base = 'nr-overlay-line';
    if (event.type === 'destroyed') return `${base} nr-destroyed`;
    if (event.type === 'lp-damage') return `${base} nr-lp-hit`;
    if (event.type === 'bonus') return `${base} nr-bonus`;
    if (event.type === 'combo') return `${base} nr-overlay-combo`;
    if (event.type === 'calculation') return `${base} nr-overlay-calculation`;
    if (event.type === 'phase-change') return `${base} nr-overlay-phase`;
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
      this.container.dataset.component = 'NarrationView';
      this.container.dataset.presentationKind = 'event';
      this.setPresentationState('entering');
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  private clearContainer(): void {
    this.clearLifecycleTimers();
    this.container?.remove();
    this.container = null;
  }

  private scheduleExit(holdMs: number): void {
    this.holdTimer = setTimeout(() => this.beginExit(), holdMs);
  }

  private beginExit(afterExit?: () => void): void {
    if (!this.container) {
      afterExit?.();
      return;
    }
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
    this.setPresentationState('exiting');
    const exitMs = this.reducedMotion ? 0 : PRESENTATION_TIMING.overlay.exit;
    this.exitTimer = setTimeout(() => {
      this.exitTimer = null;
      this.container?.remove();
      this.container = null;
      afterExit?.();
    }, exitMs);
  }

  private setPresentationState(state: PresentationState): void {
    if (this.container) this.container.dataset.presentationState = state;
  }

  private clearLifecycleTimers(): void {
    if (this.holdTimer) clearTimeout(this.holdTimer);
    if (this.exitTimer) clearTimeout(this.exitTimer);
    this.holdTimer = null;
    this.exitTimer = null;
  }
}
