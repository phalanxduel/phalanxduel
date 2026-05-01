import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalMatchManager } from '../src/match.js';
import { InMemoryLedgerStore } from '../src/db/ledger-store.js';
import type { ServerMessage, GameState } from '@phalanxduel/shared';
import type { MatchInstance } from '../src/match.js';
import type { MatchRepository } from '../src/db/match-repo.js';
import type { WebSocket } from 'ws';
import { mockSocket } from './helpers/socket.js';

function parseSentMessages(socket: WebSocket): ServerMessage[] {
  return (socket.send as ReturnType<typeof vi.fn>).mock.calls.map(
    ([raw]: [string]) => JSON.parse(raw) as ServerMessage,
  );
}

describe('preState broadcast correctness', () => {
  let manager: LocalMatchManager;

  beforeEach(() => {
    const store = new Map<string, MatchInstance>();
    const mockRepo = {
      saveMatch: vi.fn(async (m) => {
        store.set(m.matchId, m);
      }),
      getMatch: vi.fn(async (id) => store.get(id) || null),
      verifyUserIds: vi.fn(async (p1, p2) => [p1, p2]),
      saveEventLog: vi.fn(),
      saveFinalStateHash: vi.fn(),
    } as unknown as MatchRepository;
    manager = new LocalMatchManager(mockRepo, new InMemoryLedgerStore());
  });

  it('preState reflects the state BEFORE the action was applied', async () => {
    const ws1 = mockSocket();
    const ws2 = mockSocket();

    const { matchId } = await manager.createMatch('Alice', ws1);
    await manager.joinMatch(matchId, 'Bob', ws2);

    // Snapshot hand sizes before the action
    const match = await manager.getMatch(matchId);
    const handSizeBefore = match!.state!.players[1]!.hand.length;
    const battlefieldBefore = match!.state!.players[1]!.battlefield.filter(
      (c) => c !== null,
    ).length;

    // Clear mocks to isolate action broadcast
    (ws1.send as ReturnType<typeof vi.fn>).mockClear();
    (ws2.send as ReturnType<typeof vi.fn>).mockClear();

    // P2 (Bob, playerIndex 1) deploys first per initiative rules
    const cardId = match!.state!.players[1]!.hand[0]!.id;
    const p2 = match!.players[1]!;
    await manager.handleAction(matchId, p2.playerId, {
      type: 'deploy',
      playerIndex: 1,
      column: 0,
      cardId,
      timestamp: new Date().toISOString(),
    });

    // Check Bob's (ws2) broadcast — his own state is unredacted in postState
    const bobMessages = parseSentMessages(ws2);
    const gameStateMsg = bobMessages.find(
      (m): m is Extract<ServerMessage, { type: 'gameState' }> => m.type === 'gameState',
    );
    expect(gameStateMsg).toBeDefined();

    const preState = gameStateMsg!.result.preState as GameState;
    const postState = gameStateMsg!.result.postState as GameState;

    // postState should show the deploy: one fewer card in hand, one more on battlefield
    const postHandSize = postState.players[1]!.hand.length;
    const postBattlefield = postState.players[1]!.battlefield.filter((c) => c !== null).length;
    expect(postHandSize).toBe(handSizeBefore - 1);
    expect(postBattlefield).toBe(battlefieldBefore + 1);

    // THE KEY ASSERTION: preState must reflect the state BEFORE the deploy.
    // Bug: broadcastState sends match.state (post-action) as preState, so
    // preState.players[1].hand.length === handSizeBefore - 1 (wrong).
    // Fix: preState.players[1].hand.length === handSizeBefore (correct).
    const preHandSize = preState.players[1]!.hand.length;
    expect(preHandSize).toBe(handSizeBefore);
  });
});
