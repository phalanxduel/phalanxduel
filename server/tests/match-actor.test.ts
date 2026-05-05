import { describe, it, expect, vi } from 'vitest';
import { MatchActor } from '../src/match-actor.js';
import type { ILedgerStore } from '../src/db/ledger-store.js';
import type { PhalanxEvent } from '@phalanxduel/shared';

describe('MatchActor', () => {
  const mockLedgerStore = {
    appendAction: vi.fn(),
    getActions: vi.fn(),
    getActionsFrom: vi.fn(),
  } as unknown as ILedgerStore;

  describe('botPlayerIndex validation', () => {
    it('rejects invalid botPlayerIndex in constructor', () => {
      expect(() => {
        new MatchActor('test-match', mockLedgerStore, {
          state: null,
          config: null,
          botPlayerIndex: 2, // invalid
        });
      }).toThrow('botPlayerIndex must be 0 or 1');

      expect(() => {
        new MatchActor('test-match', mockLedgerStore, {
          state: null,
          config: null,
          botPlayerIndex: -1, // invalid
        });
      }).toThrow('botPlayerIndex must be 0 or 1');
    });

    it('accepts valid botPlayerIndex in constructor', () => {
      const actor0 = new MatchActor('test-match-0', mockLedgerStore, {
        state: null,
        config: null,
        botPlayerIndex: 0,
      });
      expect(actor0.botPlayerIndex).toBe(0);

      const actor1 = new MatchActor('test-match-1', mockLedgerStore, {
        state: null,
        config: null,
        botPlayerIndex: 1,
      });
      expect(actor1.botPlayerIndex).toBe(1);
    });

    it('rejects invalid botPlayerIndex in configureBotOpponent', () => {
      const actor = new MatchActor('test-match', mockLedgerStore, {
        state: null,
        config: null,
      });

      expect(() => {
        actor.configureBotOpponent({
          botConfig: { strategy: 'random', seed: 123 },
          botPlayerIndex: 2,
          botStrategy: 'random',
        });
      }).toThrow('botPlayerIndex must be 0 or 1');
    });
  });

  describe('fatal event idempotency', () => {
    it('appends fatal events idempotently based on event id', () => {
      const actor = new MatchActor('test-match', mockLedgerStore, {
        state: null,
        config: null,
      });

      const event1: PhalanxEvent = {
        id: 'evt-1',
        name: 'match.unrecoverable_error',
        type: 'functional_update',
        timestamp: '2026-05-05T00:00:00Z',
        payload: { reason: 'test error' },
        status: 'unrecoverable_error',
      };

      const event2: PhalanxEvent = {
        id: 'evt-2',
        name: 'match.unrecoverable_error',
        type: 'functional_update',
        timestamp: '2026-05-05T00:00:01Z',
        payload: { reason: 'another test error' },
        status: 'unrecoverable_error',
      };

      actor.addFatalEvent(event1);
      expect(actor.fatalEvents).toHaveLength(1);
      expect(actor.fatalEvents[0]!.id).toBe('evt-1');

      // Attempt to add the exact same event
      actor.addFatalEvent(event1);
      expect(actor.fatalEvents).toHaveLength(1); // Should still be 1

      // Add a different event
      actor.addFatalEvent(event2);
      expect(actor.fatalEvents).toHaveLength(2);
      expect(actor.fatalEvents[1]!.id).toBe('evt-2');
    });
  });

  describe('duplicate action detection', () => {
    it('detects duplicate actions and returns previous result without mutation', async () => {
      // Create actor with pre-existing state containing a transaction log entry
      const preState = {
        transactionLog: [
          {
            msgId: 'msg-123',
            action: { type: 'playCard', msgId: 'msg-123' },
            turnHash: 'hash-abc',
          },
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const actor = new MatchActor('test-match', mockLedgerStore, {
        state: preState,
        config: null,
      });

      // We need to set _lastPreState to avoid throwing the "pre-state lost" error
      // Since it's private, we'll cast to any for the test setup
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (actor as any)._lastPreState = { some: 'previousState' };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const duplicateAction = { type: 'playCard', msgId: 'msg-123' } as any;

      // Mock auth to bypass the check
      const auth = [{ playerId: 'player-1', playerIndex: 0 }];

      // Dispatch the duplicate action
      const callbacks = {
        onSuccess: vi.fn(),
        onError: vi.fn(),
      };

      const result = await actor.dispatchAction('player-1', duplicateAction, auth, callbacks);

      // Verify the result is the replayed last entry
      expect(result.action).toEqual(preState.transactionLog[0].action);
      expect(result.turnHash).toBe('hash-abc');

      // Verify onSuccess was called
      expect(callbacks.onSuccess).toHaveBeenCalledWith(result);
    });
  });
});
