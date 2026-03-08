import type { NarrationBus, NarrationEvent } from './narration-bus';

/**
 * Center overlay consumer — dramatic, fading combat narration.
 * Builds text line-by-line, then fades the whole block out.
 */
export class NarrationOverlay {
  private container: HTMLElement | null = null;
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;
  private unsub: (() => void) | null = null;
  private reducedMotion: boolean;

  constructor(private bus: NarrationBus) {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  start(): void {
    this.unsub = this.bus.subscribe((event) => this.onEvent(event));
  }

  destroy(): void {
    this.unsub?.();
    this.clearContainer();
  }

  private onEvent(event: NarrationEvent): void {
    const text = this.formatEvent(event);
    if (!text) return;

    const container = this.ensureContainer();
    this.resetFadeTimer();

    const line = document.createElement('div');
    line.className = this.getLineClass(event);
    line.textContent = text;

    if (!this.reducedMotion) {
      line.classList.add('nr-line-enter');
    }

    container.appendChild(line);

    // Auto-fade after last event
    this.fadeTimer = setTimeout(() => {
      container.classList.add('nr-fade-out');
      setTimeout(() => this.clearContainer(), 600);
    }, 1200);
  }

  private formatEvent(event: NarrationEvent): string | null {
    switch (event.type) {
      case 'deploy':
        return `${event.player} deploys ${event.card}`;
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
        return null; // Handled by Pizzazz phase splash
    }
  }

  private getLineClass(event: NarrationEvent): string {
    const base = 'nr-overlay-line';
    if (event.type === 'destroyed') return `${base} nr-destroyed`;
    if (event.type === 'lp-damage') return `${base} nr-lp-hit`;
    if (event.type === 'bonus') return `${base} nr-bonus`;
    return base;
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

  private clearContainer(): void {
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
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
