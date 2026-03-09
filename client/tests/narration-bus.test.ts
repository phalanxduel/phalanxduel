import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NarrationBus, type NarrationEvent } from '../src/narration-bus';

describe('NarrationBus', () => {
  let bus: NarrationBus;

  beforeEach(() => {
    bus = new NarrationBus();
  });

  it('delivers events to subscribers', () => {
    const cb = vi.fn();
    bus.subscribe(cb);
    const event: NarrationEvent = {
      type: 'deploy',
      player: 'Mike',
      card: 'Ace♠',
      suit: 'spades',
      cardType: 'ace',
      column: 0,
      row: 0,
    };
    bus.emit(event);
    expect(cb).toHaveBeenCalledWith(event);
  });

  it('supports multiple subscribers', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    bus.subscribe(cb1);
    bus.subscribe(cb2);
    const event: NarrationEvent = { type: 'destroyed', card: 'Two♦' };
    bus.emit(event);
    expect(cb1).toHaveBeenCalledWith(event);
    expect(cb2).toHaveBeenCalledWith(event);
  });

  it('unsubscribe stops delivery', () => {
    const cb = vi.fn();
    const unsub = bus.subscribe(cb);
    unsub();
    bus.emit({
      type: 'deploy',
      player: 'Bot',
      card: 'King♥',
      suit: 'hearts',
      cardType: 'face',
      column: 0,
      row: 0,
    });
    expect(cb).not.toHaveBeenCalled();
  });

  it('drains timed queue at specified pace', async () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    bus.subscribe(cb);

    bus.enqueue([
      {
        event: {
          type: 'deploy',
          player: 'Mike',
          card: 'Ace♠',
          suit: 'spades',
          cardType: 'ace',
          column: 0,
          row: 0,
        },
        delayMs: 100,
      },
      {
        event: {
          type: 'deploy',
          player: 'Mike',
          card: 'Two♥',
          suit: 'hearts',
          cardType: 'number',
          column: 1,
          row: 0,
        },
        delayMs: 100,
      },
    ]);

    expect(cb).toHaveBeenCalledTimes(1); // First fires immediately
    await vi.advanceTimersByTimeAsync(100);
    expect(cb).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('queues new entries while draining', async () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    bus.subscribe(cb);

    bus.enqueue([
      {
        event: {
          type: 'deploy',
          player: 'Mike',
          card: 'Ace♠',
          suit: 'spades',
          cardType: 'ace',
          column: 0,
          row: 0,
        },
        delayMs: 200,
      },
      {
        event: {
          type: 'deploy',
          player: 'Mike',
          card: 'Three♣',
          suit: 'clubs',
          cardType: 'number',
          column: 1,
          row: 0,
        },
        delayMs: 100,
      },
    ]);
    expect(cb).toHaveBeenCalledTimes(1);

    // Enqueue more before first drain completes
    bus.enqueue([
      {
        event: {
          type: 'deploy',
          player: 'Mike',
          card: 'Two♥',
          suit: 'hearts',
          cardType: 'number',
          column: 2,
          row: 0,
        },
        delayMs: 100,
      },
    ]);

    await vi.advanceTimersByTimeAsync(200);
    expect(cb).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(100);
    expect(cb).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('destroy stops draining and clears queue', async () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    bus.subscribe(cb);

    bus.enqueue([
      {
        event: {
          type: 'deploy',
          player: 'A',
          card: 'X',
          suit: 'spades',
          cardType: 'number',
          column: 0,
          row: 0,
        },
        delayMs: 100,
      },
      {
        event: {
          type: 'deploy',
          player: 'B',
          card: 'Y',
          suit: 'hearts',
          cardType: 'number',
          column: 1,
          row: 0,
        },
        delayMs: 100,
      },
    ]);
    expect(cb).toHaveBeenCalledTimes(1);

    bus.destroy();
    await vi.advanceTimersByTimeAsync(200);
    expect(cb).toHaveBeenCalledTimes(1); // No more deliveries
    vi.useRealTimers();
  });
});
