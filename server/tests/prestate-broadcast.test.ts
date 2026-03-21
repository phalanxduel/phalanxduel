import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchManager } from '../src/match.js';
import { InMemoryStateStore, EventEmitterBus } from '../src/db/in-memory-store.js';
import type { ServerMessage, GameState } from '@phalanxduel/shared';
import type { WebSocket } from 'ws';

function mockSocket(): WebSocket {
  return {
    send: vi.fn(),
    readyState: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    on: vi.fn(),
    close: vi.fn(),
  } as unknown as WebSocket;
}

function parseSentMessages(socket: WebSocket): ServerMessage[] {
  return (socket.send as ReturnType<typeof vi.fn>).mock.calls.map(
    ([raw]: [string]) => JSON.parse(raw) as ServerMessage,
  );
}

describe('preState broadcast correctness', () => {
  let manager: MatchManager;

  beforeEach(async () => {
    manager = new MatchManager(new InMemoryStateStore(), new EventEmitterBus());
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

    await vi.waitFor(() => {
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
      const preHandSize = preState.players[1]!.hand.length;
      expect(preHandSize).toBe(handSizeBefore);
    });
  });
});
