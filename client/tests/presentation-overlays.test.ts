import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NarrationBus } from '../src/narration-bus';
import { NarrationOverlay } from '../src/narration-overlay';
import { CinematicOverlay } from '../src/cinematic-overlay';

describe('presentation overlay ownership', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document
      .querySelectorAll('.nr-overlay, .cinematic-modal')
      .forEach((element) => element.remove());
  });

  it('terminal cue synchronously clears phase and cinematic overlays', () => {
    const bus = new NarrationBus();
    const narration = new NarrationOverlay(bus);
    const cinematic = new CinematicOverlay(bus);
    narration.start();
    cinematic.start();

    bus.emit({ type: 'phase-change', phase: 'AttackPhase' });
    bus.emit({
      type: 'cinematic',
      style: 'lethal',
      message: 'LETHAL DAMAGE',
    });
    expect(document.querySelector('.nr-overlay')).not.toBeNull();
    expect(document.querySelector('.cinematic-modal')).not.toBeNull();

    bus.emit({
      type: 'terminal',
      winnerIndex: 0,
      turnNumber: 9,
      victoryType: 'lpDepletion',
    });

    expect(document.querySelector('.nr-overlay')).toBeNull();
    expect(document.querySelector('.cinematic-modal')).toBeNull();
    narration.destroy();
    cinematic.destroy();
    bus.destroy();
    vi.useRealTimers();
  });
});
