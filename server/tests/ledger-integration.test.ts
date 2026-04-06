import { describe, it, expect, vi } from 'vitest';
import { MatchManager } from '../src/match.js';
import { InMemoryLedgerStore } from '../src/db/ledger-store.js';
import type { WebSocket } from 'ws';
import type { ServerMessage } from '@phalanxduel/shared';

function mockSocket() {
  const messages: ServerMessage[] = [];
  return {
    send: vi.fn((data: string) => messages.push(JSON.parse(data))),
    readyState: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    on: vi.fn(),
    close: vi.fn(),
    _messages: messages,
  } as unknown as WebSocket & { _messages: ServerMessage[] };
}

function lastMessage(
  socket: WebSocket & { _messages: ServerMessage[] },
): ServerMessage | undefined {
  return socket._messages[socket._messages.length - 1];
}

describe('matchActions ledger integration (TASK-197)', () => {
  it('appends action to ledger store after handleAction', async () => {
    const ledger = new InMemoryLedgerStore();
    const manager = new MatchManager(ledger);

    const socket1 = mockSocket();
    const socket2 = mockSocket();

    const { matchId } = manager.createMatch('Player 1', socket1);
    const { playerId: p2Id } = await manager.joinMatch(matchId, 'Player 2', socket2);
    manager.broadcastMatchState(matchId);
    await vi.waitFor(() => {
      expect(lastMessage(socket2)?.type).toBe('gameState');
    });

    // Seed the ledger with the match config so getMatchConfig works
    const match = await manager.getMatch(matchId);
    if (match?.config) {
      ledger.seedMatch(matchId, match.config);
    }

    const initialMsg = lastMessage(socket2) as Extract<ServerMessage, { type: 'gameState' }>;
    const cardId = initialMsg.result.postState.players[1]!.hand[0]!.id;

    await manager.handleAction(matchId, p2Id, {
      type: 'deploy',
      playerIndex: 1,
      column: 0,
      cardId,
      timestamp: '1970-01-01T00:00:00.000Z',
    });

    // Allow fire-and-forget appendAction to settle
    await vi.waitFor(async () => {
      const actions = await ledger.getActions(matchId);
      expect(actions.length).toBeGreaterThanOrEqual(1);
    });

    const actions = await ledger.getActions(matchId);
    const lastAction = actions[actions.length - 1]!;
    expect(lastAction.action.type).toBe('deploy');
    expect(lastAction.stateHashBefore).toBeTruthy();
    expect(lastAction.stateHashAfter).toBeTruthy();
    expect(lastAction.stateHashBefore).not.toBe(lastAction.stateHashAfter);
  });

  it('maintains append-only invariant across multiple actions', async () => {
    const ledger = new InMemoryLedgerStore();
    const manager = new MatchManager(ledger);

    const socket1 = mockSocket();
    const socket2 = mockSocket();

    const { matchId, playerId: p1Id } = manager.createMatch('Player 1', socket1);
    const { playerId: p2Id } = await manager.joinMatch(matchId, 'Player 2', socket2);
    manager.broadcastMatchState(matchId);
    await vi.waitFor(() => {
      expect(lastMessage(socket2)?.type).toBe('gameState');
    });

    // Deploy from P2 (playerIndex 1)
    const msg1 = lastMessage(socket2) as Extract<ServerMessage, { type: 'gameState' }>;
    const card1 = msg1.result.postState.players[1]!.hand[0]!.id;
    await manager.handleAction(matchId, p2Id, {
      type: 'deploy',
      playerIndex: 1,
      column: 0,
      cardId: card1,
      timestamp: '1970-01-01T00:00:00.000Z',
    });

    // Deploy from P1 (playerIndex 0)
    await vi.waitFor(() => {
      const m = lastMessage(socket1);
      expect(m?.type).toBe('gameState');
    });
    const msg2 = lastMessage(socket1) as Extract<ServerMessage, { type: 'gameState' }>;
    const card2 = msg2.result.postState.players[0]!.hand[0]!.id;
    await manager.handleAction(matchId, p1Id, {
      type: 'deploy',
      playerIndex: 0,
      column: 1,
      cardId: card2,
      timestamp: '1970-01-01T00:00:01.000Z',
    });

    await vi.waitFor(async () => {
      const actions = await ledger.getActions(matchId);
      expect(actions.length).toBeGreaterThanOrEqual(2);
    });

    const actions = await ledger.getActions(matchId);
    // Sequence numbers must be monotonically increasing
    for (let i = 1; i < actions.length; i++) {
      expect(actions[i]!.sequenceNumber).toBeGreaterThan(actions[i - 1]!.sequenceNumber);
    }
    // Hash chain: each action's stateHashBefore should match prior action's stateHashAfter
    for (let i = 1; i < actions.length; i++) {
      expect(actions[i]!.stateHashBefore).toBe(actions[i - 1]!.stateHashAfter);
    }
  });
});
