import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NarrationBus } from '../src/narration-bus';
import { NarrationOverlay } from '../src/narration-overlay';
import { CinematicOverlay } from '../src/cinematic-overlay';
import { PRESENTATION_TIMING } from '../src/presentation-timing';

describe('presentation overlay ownership', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document
      .querySelectorAll('.nr-overlay, .cinematic-modal')
      .forEach((element) => element.remove());
  });

  it('reserves the focal layer until a cinematic has fully exited', () => {
    expect(PRESENTATION_TIMING.cue.cinematic).toBeGreaterThanOrEqual(
      PRESENTATION_TIMING.cinematic.hold + PRESENTATION_TIMING.cinematic.exit,
    );
  });

  it('crossfades resolved narration into a single phase owner', async () => {
    const bus = new NarrationBus();
    const narration = new NarrationOverlay(bus);
    narration.start();

    bus.emit({
      type: 'attack',
      attacker: 'K♥',
      target: '4♠',
      damage: 7,
      suit: 'hearts',
      cardType: 'face',
    });
    bus.emit({
      type: 'calculation',
      sequence: 1,
      ruleId: 'PD-RULE-064',
      equation: '11 − 4 = 7',
      spoken: 'Eleven minus four equals seven.',
    });
    bus.emit({ type: 'phase-change', phase: 'ReinforcementPhase' });

    expect(document.querySelectorAll('.nr-overlay')).toHaveLength(1);
    expect(document.querySelector('.nr-overlay')?.getAttribute('data-presentation-state')).toBe(
      'exiting',
    );
    expect(document.querySelector('.nr-phase-announce')).toBeNull();

    await vi.advanceTimersByTimeAsync(PRESENTATION_TIMING.overlay.exit);

    expect(document.querySelectorAll('.nr-overlay')).toHaveLength(1);
    expect(document.querySelector('.nr-phase-announce')?.textContent).toBe('REINFORCEMENT');
    narration.destroy();
    bus.destroy();
  });

  it('terminal cancellation prevents a pending phase from remounting', async () => {
    const bus = new NarrationBus();
    const narration = new NarrationOverlay(bus);
    narration.start();

    bus.emit({ type: 'phase-change', phase: 'AttackPhase' });
    bus.emit({ type: 'phase-change', phase: 'ReinforcementPhase' });
    bus.emit({
      type: 'terminal',
      winnerIndex: 0,
      turnNumber: 4,
      victoryType: 'lpDepletion',
    });
    await vi.advanceTimersByTimeAsync(PRESENTATION_TIMING.overlay.exit);

    expect(document.querySelector('.nr-overlay')).toBeNull();
    narration.destroy();
    bus.destroy();
  });

  it('preserves cue order without decorative movement in reduced motion', async () => {
    vi.mocked(window.matchMedia).mockReturnValueOnce({ matches: true } as MediaQueryList);
    const bus = new NarrationBus();
    const narration = new NarrationOverlay(bus);
    narration.start();

    bus.emit({ type: 'pass', player: 'Operative', phase: 'AttackPhase' });
    expect(document.querySelector('.nr-line-enter')).toBeNull();
    bus.emit({ type: 'phase-change', phase: 'ReinforcementPhase' });
    await vi.advanceTimersByTimeAsync(0);

    expect(document.querySelector('.nr-phase-announce')?.textContent).toBe('REINFORCEMENT');
    expect(document.querySelector('.nr-line-enter')).toBeNull();
    narration.destroy();
    bus.destroy();
  });

  it('crossfades cinematic replacements instead of stacking focal overlays', async () => {
    const bus = new NarrationBus();
    const cinematic = new CinematicOverlay(bus);
    cinematic.start();

    bus.emit({ type: 'cinematic', style: 'clash', message: 'CLASH' });
    bus.emit({ type: 'cinematic', style: 'lethal', message: 'LETHAL DAMAGE' });

    expect(document.querySelectorAll('.cinematic-modal')).toHaveLength(1);
    expect(
      document.querySelector('.cinematic-modal')?.getAttribute('data-presentation-state'),
    ).toBe('exiting');
    await vi.advanceTimersByTimeAsync(PRESENTATION_TIMING.cinematic.exit);

    expect(document.querySelectorAll('.cinematic-modal')).toHaveLength(1);
    expect(document.querySelector('.cinematic-message')?.textContent).toBe('LETHAL DAMAGE');
    cinematic.destroy();
    bus.destroy();
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
