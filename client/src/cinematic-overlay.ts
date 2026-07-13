import type { NarrationBus, NarrationEvent } from './narration-bus';
import { PRESENTATION_TIMING, type PresentationState } from './presentation-timing';

export class CinematicOverlay {
  private container: HTMLElement | null = null;
  private unsub: (() => void) | null = null;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private exitTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly reducedMotion: boolean;

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
    if (this.container) {
      this.beginExit(() => this.mountCinematic(event));
      return;
    }
    this.mountCinematic(event);
  }

  private mountCinematic(event: Extract<NarrationEvent, { type: 'cinematic' }>): void {
    const container = this.ensureContainer();

    container.innerHTML = '';
    container.className = `cinematic-modal cinematic-${event.style}`;
    container.dataset.presentationKind = event.style;
    this.setPresentationState('entering');

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
      this.setPresentationState('holding');
    });

    this.holdTimer = setTimeout(
      () => this.beginExit(),
      this.reducedMotion
        ? PRESENTATION_TIMING.cinematic.reducedHold
        : PRESENTATION_TIMING.cinematic.hold,
    );
  }

  private ensureContainer(): HTMLElement {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'cinematic-modal';
      this.container.setAttribute('aria-live', 'assertive');
      this.container.dataset.component = 'NarrationView';
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  private clearContainer(): void {
    this.clearLifecycleTimers();
    this.container?.remove();
    this.container = null;
  }

  private beginExit(afterExit?: () => void): void {
    if (!this.container) {
      afterExit?.();
      return;
    }
    if (this.holdTimer) clearTimeout(this.holdTimer);
    this.holdTimer = null;
    this.container.classList.remove('is-active');
    this.setPresentationState('exiting');
    const exitMs = this.reducedMotion ? 0 : PRESENTATION_TIMING.cinematic.exit;
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
