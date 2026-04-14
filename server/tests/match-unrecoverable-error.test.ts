import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import { PhalanxEventSchema, type ServerMessage } from '@phalanxduel/shared';
import { InMemoryLedgerStore } from '../src/db/ledger-store.js';
import type { MatchInstance } from '../src/match.js';
import type { MatchRepository } from '../src/db/match-repo.js';

const { mockApplyAction } = vi.hoisted(() => ({
  mockApplyAction: vi.fn(),
}));

vi.mock('@phalanxduel/engine', async () => {
  const actual = await vi.importActual<typeof import('@phalanxduel/engine')>('@phalanxduel/engine');
  return {
    ...actual,
    applyAction: (...args: Parameters<typeof actual.applyAction>) => {
      const implementation = mockApplyAction.getMockImplementation();
      return implementation ? implementation(...args) : actual.applyAction(...args);
    },
  };
});

import { ActionError, LocalMatchManager, buildMatchEventLog } from '../src/match.js';

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

describe('LocalMatchManager unrecoverable action failures', () => {
  let manager: LocalMatchManager;

  beforeEach(() => {
    mockApplyAction.mockReset();
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

  it('records a deterministic system_error event when a validated action hits an invariant failure', async () => {
    const socket1 = mockSocket();
    const socket2 = mockSocket();

    const { matchId } = await manager.createMatch('Player 1', socket1);
    const { playerId: p2Id } = await manager.joinMatch(matchId, 'Player 2', socket2);
    manager.broadcastMatchState(matchId);
    await vi.waitFor(() => {
      expect(lastMessage(socket2)?.type).toBe('gameState');
    });

    const initialMsg = lastMessage(socket2) as Extract<ServerMessage, { type: 'gameState' }>;
    const cardId = initialMsg.result.postState.players[1]!.hand[0]!.id;

    mockApplyAction.mockImplementation(() => {
      throw new Error('Expected front step in combat log');
    });

    await expect(
      manager.handleAction(matchId, p2Id, {
        type: 'deploy',
        playerIndex: 1,
        column: 0,
        cardId,
        timestamp: '2026-04-02T20:34:00.000Z',
      }),
    ).rejects.toMatchObject<ActionError>({
      code: 'MATCH_UNRECOVERABLE_ERROR',
      message: 'Expected front step in combat log',
    });

    const match = await manager.getMatch(matchId);
    expect(match?.fatalEvents).toHaveLength(1);

    const fatalEvent = match?.fatalEvents?.[0];
    expect(fatalEvent).toBeDefined();
    const parseResult = PhalanxEventSchema.safeParse(fatalEvent);
    expect(
      parseResult.success,
      parseResult.success ? '' : JSON.stringify(parseResult.error.issues),
    ).toBe(true);
    expect(fatalEvent).toMatchObject({
      id: `${matchId}:seq1:fatal`,
      parentId: `${matchId}:seq1:turn`,
      type: 'system_error',
      name: 'game.system_error',
      status: 'unrecoverable_error',
      timestamp: expect.any(String),
      payload: {
        actionType: 'deploy',
        error: 'Expected front step in combat log',
        sequenceNumber: 1,
      },
    });

    const log = buildMatchEventLog(match!);
    expect(log.events.at(-1)).toEqual(fatalEvent);
    expect(log.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it('blocks later actions once an unrecoverable error has been recorded', async () => {
    const socket1 = mockSocket();
    const socket2 = mockSocket();

    const { matchId } = await manager.createMatch('Player 1', socket1);
    const { playerId: p2Id } = await manager.joinMatch(matchId, 'Player 2', socket2);
    manager.broadcastMatchState(matchId);
    await vi.waitFor(() => {
      expect(lastMessage(socket2)?.type).toBe('gameState');
    });

    const initialMsg = lastMessage(socket2) as Extract<ServerMessage, { type: 'gameState' }>;
    const firstCardId = initialMsg.result.postState.players[1]!.hand[0]!.id;
    const secondCardId = initialMsg.result.postState.players[1]!.hand[1]!.id;

    mockApplyAction.mockImplementationOnce(() => {
      throw new Error('Expected front step in combat log');
    });

    await expect(
      manager.handleAction(matchId, p2Id, {
        type: 'deploy',
        playerIndex: 1,
        column: 0,
        cardId: firstCardId,
        timestamp: '2026-04-02T20:34:00.000Z',
      }),
    ).rejects.toMatchObject<ActionError>({
      code: 'MATCH_UNRECOVERABLE_ERROR',
    });

    await expect(
      manager.handleAction(matchId, p2Id, {
        type: 'deploy',
        playerIndex: 1,
        column: 1,
        cardId: secondCardId,
        timestamp: '2026-04-02T20:35:00.000Z',
      }),
    ).rejects.toMatchObject<ActionError>({
      code: 'MATCH_UNRECOVERABLE_ERROR',
      message: 'Match halted after an unrecoverable engine error',
    });
  });
});
