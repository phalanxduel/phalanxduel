import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryEventBus } from '../src/event-bus.js';
import { InMemoryLedgerStore } from '../src/db/ledger-store.js';
import { LocalMatchManager } from '../src/match.js';
import type { MatchInstance } from '../src/match.js';
import type { MatchRepository } from '../src/db/match-repo.js';

/**
 * Integration test for TASK-98: Interrupt-driven Synchronization
 *
 * Verifies that when two LocalMatchManager instances share an InMemoryLedgerStore
 * and InMemoryEventBus, an action dispatched via Manager A automatically propagates
 * to Manager B (simulating a remote node) via catchUp().
 */
describe('Interrupt-driven Synchronization', () => {
  let eventBus: InMemoryEventBus;
  let ledgerStore: InMemoryLedgerStore;
  let mockRepo: MatchRepository;

  beforeEach(() => {
    eventBus = new InMemoryEventBus();
    ledgerStore = new InMemoryLedgerStore(eventBus);

    // Shared in-memory match store (simulates Postgres row-level persistence)
    const store = new Map<string, MatchInstance>();
    mockRepo = {
      saveMatch: vi.fn(async (m) => {
        store.set(m.matchId, m);
      }),
      getMatch: vi.fn(async (id) => store.get(id) ?? null),
      verifyUserIds: vi.fn(async (p1: string, p2: string) => [p1, p2]),
      saveEventLog: vi.fn(),
      saveFinalStateHash: vi.fn(),
    } as unknown as MatchRepository;
  });

  it('notifies remote node when an action is appended and local state catches up', async () => {
    const managerA = new LocalMatchManager(mockRepo, ledgerStore, undefined, eventBus);
    const managerB = new LocalMatchManager(mockRepo, ledgerStore, undefined, eventBus);

    // Node A: create and join match to initialize game state
    const { matchId } = await managerA.createMatch('Node A Player 1', null);
    await managerA.joinMatch(matchId, 'Node A Player 2', null);

    // Wait for the match to become active on A
    const matchA = await managerA.getMatch(matchId);
    expect(matchA?.state).toBeDefined();

    // Node B: load the same match (simulating another node receiving a request for this match)
    // matchRepo.getMatch returns the same MatchInstance reference (shared store).
    const matchB = await managerB.getMatch(matchId);
    expect(matchB?.state).toBeDefined();

    const seqBefore = matchB!.state!.transactionLog!.length;

    // Node A: dispatch a valid action from the active player
    const activePlayerIdx = matchA!.state!.activePlayerIndex;
    const activePlayerId = matchA!.players[activePlayerIdx]!.playerId;
    const cardId = matchA!.state!.players[activePlayerIdx]!.hand[0]!.id;

    await managerA.handleAction(matchId, activePlayerId, {
      type: 'deploy',
      playerIndex: activePlayerIdx,
      column: 0,
      cardId,
      timestamp: new Date().toISOString(),
    });

    const seqA = matchA!.state!.transactionLog!.length;
    expect(seqA).toBeGreaterThan(seqBefore);

    // Allow the async EventBus notification and catchUp to propagate
    await vi.waitFor(
      () => {
        const seqB = matchB!.state!.transactionLog!.length;
        expect(seqB).toBe(seqA);
      },
      { timeout: 500 },
    );
  });
});
