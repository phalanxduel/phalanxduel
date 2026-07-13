import type { NarrationBus, NarrationEvent } from './narration-bus';

export class CinematicOverlay {
  private container: HTMLElement | null = null;
  private unsub: (() => void) | null = null;
  private clearTimer: ReturnType<typeof setTimeout> | null = null;
  private reducedMotion: boolean;

  constructor(private bus: NarrationBus) {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  start(): void {
    this.unsub = this.bus.subscribe((event) => {
      if (event.type === 'cinematic') {
        this.renderCinematic(event);
      } else if (event.type === 'terminal') {
        this.clearContainer();
      }
    });
  }

  destroy(): void {
    this.unsub?.();
    this.clearContainer();
  }

  private renderCinematic(event: Extract<NarrationEvent, { type: 'cinematic' }>): void {
    const container = this.ensureContainer();

    // Clear previous if any
    container.innerHTML = '';
    container.className = `cinematic-modal cinematic-${event.style}`;

    const content = document.createElement('div');
    content.className = 'cinematic-content';

    const message = document.createElement('h1');
    message.className = 'cinematic-message';
    message.textContent = event.message;

    content.appendChild(message);

    if (event.submessage) {
      const sub = document.createElement('h2');
      sub.className = 'cinematic-submessage';
      sub.textContent = event.submessage;
      content.appendChild(sub);
    }

    container.appendChild(content);

    // Trigger animation
    requestAnimationFrame(() => {
      container.classList.add('is-active');
    });

    if (this.clearTimer) clearTimeout(this.clearTimer);

    // Auto-dismiss after animation completes
    this.clearTimer = setTimeout(
      () => {
        container.classList.remove('is-active');
        setTimeout(() => {
          this.clearContainer();
        }, 500); // Wait for fade out
      },
      this.reducedMotion ? 1500 : 2500,
    );
  }

  private ensureContainer(): HTMLElement {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'cinematic-modal';
      this.container.setAttribute('aria-live', 'assertive');
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  private clearContainer(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    if (this.clearTimer) {
      clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }
  }
}
