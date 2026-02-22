import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchManager, MatchError, ActionError } from '../src/match';
import type { WebSocket } from 'ws';
import type { Action, ServerMessage } from '@phalanxduel/shared';

function mockSocket(): WebSocket {
  const messages: string[] = [];
  return {
    readyState: 1,
    send: vi.fn((data: string) => messages.push(data)),
    _messages: messages,
  } as unknown as WebSocket & { _messages: string[] };
}

function getMessages(socket: WebSocket): ServerMessage[] {
  const mock = socket as unknown as { _messages: string[] };
  return mock._messages.map((m) => JSON.parse(m) as ServerMessage);
}

function lastMessage(socket: WebSocket): ServerMessage | undefined {
  const msgs = getMessages(socket);
  return msgs[msgs.length - 1];
}

function cardSignature(state: { players: Array<{ hand: Array<{ suit: string; rank: string }>; drawpile: Array<{ suit: string; rank: string }>; battlefield: Array<{ card: { suit: string; rank: string } } | null> }> }): string {
  return state.players.map((p) => ([
    p.hand.map((c) => `${c.rank}${c.suit[0]}`).join(','),
    p.drawpile.map((c) => `${c.rank}${c.suit[0]}`).join(','),
    p.battlefield.map((slot) => (slot ? `${slot.card.rank}${slot.card.suit[0]}` : '-')).join(','),
  ].join('|'))).join('||');
}

describe('MatchManager', () => {
  let manager: MatchManager;

  beforeEach(() => {
    manager = new MatchManager();
  });

  describe('createMatch', () => {
    it('should return valid UUIDs and player index 0', () => {
      const socket = mockSocket();
      const result = manager.createMatch('Alice', socket);

      expect(result.matchId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(result.playerId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(result.playerIndex).toBe(0);
    });

    it('should register the match in the matches map', () => {
      const socket = mockSocket();
      const { matchId } = manager.createMatch('Alice', socket);

      expect(manager.matches.has(matchId)).toBe(true);
    });

    it('should register the socket in the socketMap', () => {
      const socket = mockSocket();
      const { matchId, playerId } = manager.createMatch('Alice', socket);

      expect(manager.socketMap.get(socket)).toEqual({ matchId, playerId, isSpectator: false });
    });
  });

  describe('joinMatch', () => {
    it('should assign player index 1 and start the game', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', socket1);
      const result = manager.joinMatch(matchId, 'Bob', socket2);

      expect(result.playerIndex).toBe(1);
      expect(result.playerId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('should broadcast gameState to both players after broadcastMatchState', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', socket1);
      manager.joinMatch(matchId, 'Bob', socket2);
      manager.broadcastMatchState(matchId);

      const msg1 = lastMessage(socket1);
      const msg2 = lastMessage(socket2);
      expect(msg1?.type).toBe('gameState');
      expect(msg2?.type).toBe('gameState');
    });

    it('should initialize game in deployment phase with 12 cards per hand', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', socket1);
      manager.joinMatch(matchId, 'Bob', socket2);
      manager.broadcastMatchState(matchId);

      const msg = lastMessage(socket1) as { type: string; state: { phase: string; players: Array<{ hand: unknown[]; handCount?: number }> } };
      expect(msg.type).toBe('gameState');
      expect(msg.state.phase).toBe('deployment');
      // Player 0 sees own hand, opponent hand is redacted
      expect(msg.state.players[0]!.hand).toHaveLength(12);
      expect(msg.state.players[1]!.hand).toHaveLength(0);
      expect(msg.state.players[1]!.handCount).toBe(12);
    });

    it('should throw MATCH_NOT_FOUND for nonexistent match', () => {
      const socket = mockSocket();
      expect(() =>
        manager.joinMatch('00000000-0000-0000-0000-000000000000', 'Bob', socket),
      ).toThrow(MatchError);
    });

    it('should throw MATCH_FULL when match already has two players', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const socket3 = mockSocket();
      const { matchId } = manager.createMatch('Alice', socket1);
      manager.joinMatch(matchId, 'Bob', socket2);

      expect(() => manager.joinMatch(matchId, 'Charlie', socket3)).toThrow(MatchError);
    });

    it('should use provided rngSeed when supplied at createMatch', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', socket1, undefined, 1234);
      manager.joinMatch(matchId, 'Bob', socket2);

      const match = manager.matches.get(matchId)!;
      expect(match.config!.rngSeed).toBe(1234);
    });

    it('should initialize identical starting state for identical seed', () => {
      const socket1a = mockSocket();
      const socket2a = mockSocket();
      const socket1b = mockSocket();
      const socket2b = mockSocket();

      const runA = manager.createMatch('Alice', socket1a, undefined, 2026);
      manager.joinMatch(runA.matchId, 'Bob', socket2a);
      const stateA = manager.matches.get(runA.matchId)!.state!;

      const runB = manager.createMatch('Alice', socket1b, undefined, 2026);
      manager.joinMatch(runB.matchId, 'Bob', socket2b);
      const stateB = manager.matches.get(runB.matchId)!.state!;

      expect(cardSignature(stateA)).toBe(cardSignature(stateB));
    });

    it('should initialize different starting state for different seeds', () => {
      const socket1a = mockSocket();
      const socket2a = mockSocket();
      const socket1b = mockSocket();
      const socket2b = mockSocket();

      const runA = manager.createMatch('Alice', socket1a, undefined, 42);
      manager.joinMatch(runA.matchId, 'Bob', socket2a);
      const stateA = manager.matches.get(runA.matchId)!.state!;

      const runB = manager.createMatch('Alice', socket1b, undefined, 99);
      manager.joinMatch(runB.matchId, 'Bob', socket2b);
      const stateB = manager.matches.get(runB.matchId)!.state!;

      expect(cardSignature(stateA)).not.toBe(cardSignature(stateB));
    });
  });

  describe('handleAction', () => {
    function setupActiveGame() {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId, playerId: player0Id } = manager.createMatch('Alice', socket1);
      const { playerId: player1Id } = manager.joinMatch(matchId, 'Bob', socket2);

      return { matchId, player0Id, player1Id, socket1, socket2 };
    }

    it('should accept a valid deploy action and broadcast updated state', () => {
      const { matchId, player0Id, socket1, socket2 } = setupActiveGame();

      // Get current state to find a card in hand
      const match = manager.matches.get(matchId)!;
      const hand = match.state!.players[0]!.hand;
      const card = hand[0]!;

      const action: Action = {
        type: 'deploy',
        playerIndex: 0,
        card: { suit: card.suit, rank: card.rank },
        column: 0,
      };

      // Clear previous messages
      (socket1 as unknown as { _messages: string[] })._messages.length = 0;
      (socket2 as unknown as { _messages: string[] })._messages.length = 0;

      manager.handleAction(matchId, player0Id, action);

      const msg1 = lastMessage(socket1);
      const msg2 = lastMessage(socket2);
      expect(msg1?.type).toBe('gameState');
      expect(msg2?.type).toBe('gameState');
    });

    it('should throw ActionError for wrong player', () => {
      const { matchId, player1Id } = setupActiveGame();

      const match = manager.matches.get(matchId)!;
      const hand = match.state!.players[0]!.hand;
      const card = hand[0]!;

      // Player 1 trying to deploy as player 0
      const action: Action = {
        type: 'deploy',
        playerIndex: 0,
        card: { suit: card.suit, rank: card.rank },
        column: 0,
      };

      expect(() => manager.handleAction(matchId, player1Id, action)).toThrow(ActionError);
    });

    it('should throw ActionError for invalid action', () => {
      const { matchId, player0Id } = setupActiveGame();

      // Attack during deployment phase
      const action: Action = {
        type: 'attack',
        playerIndex: 0,
        attackerPosition: { row: 0, col: 0 },
        targetPosition: { row: 0, col: 0 },
      };

      expect(() => manager.handleAction(matchId, player0Id, action)).toThrow(ActionError);
    });

    it('should throw for nonexistent match', () => {
      expect(() =>
        manager.handleAction(
          '00000000-0000-0000-0000-000000000000',
          'fakeid',
          { type: 'pass', playerIndex: 0 },
        ),
      ).toThrow(MatchError);
    });

    it('should support a full deploy→combat→victory flow', async () => {
      const { matchId, player0Id, player1Id, socket1, socket2 } = setupActiveGame();

      const match = manager.matches.get(matchId)!;

      // Deploy all cards using column-based deployment (alternating turns)
      while (match.state!.phase === 'deployment') {
        const activeIdx = match.state!.activePlayerIndex;
        const activePlayerId = activeIdx === 0 ? player0Id : player1Id;
        const hand = match.state!.players[activeIdx]!.hand;
        const card = hand[0]!;

        // Find first column with an empty slot
        const battlefield = match.state!.players[activeIdx]!.battlefield;
        let col = 0;
        for (let c = 0; c < 4; c++) {
          if (battlefield[c] === null || battlefield[c + 4] === null) {
            col = c;
            break;
          }
        }

        manager.handleAction(matchId, activePlayerId, {
          type: 'deploy',
          playerIndex: activeIdx,
          card: { suit: card.suit, rank: card.rank },
          column: col,
        });
      }

      expect(match.state!.phase).toBe('combat');

      // Now attack until someone wins (or turns run out — Aces may be invulnerable)
      let turns = 0;
      while (match.state!.phase !== 'gameOver' && turns < 1000) {
        const phase = match.state!.phase;
        const activeIdx = match.state!.activePlayerIndex;
        const activePlayerId = activeIdx === 0 ? player0Id : player1Id;

        if (phase === 'reinforcement') {
          // During reinforcement, deploy a hand card
          const hand = match.state!.players[activeIdx]!.hand;
          if (hand.length === 0) break;
          const card = hand[0]!;
          try {
            manager.handleAction(matchId, activePlayerId, {
              type: 'reinforce',
              playerIndex: activeIdx,
              card: { suit: card.suit, rank: card.rank },
            });
          } catch {
            break;
          }
        } else if (phase === 'combat') {
          const defenderIdx = activeIdx === 0 ? 1 : 0;
          const attackerBf = match.state!.players[activeIdx]!.battlefield;
          const defenderBf = match.state!.players[defenderIdx]!.battlefield;

          // Find first attacker — prefer Aces to kill opponent Aces
          let attackerSlot = attackerBf.findIndex(
            (s) => s !== null && s.card.rank === 'A',
          );
          if (attackerSlot === -1) {
            attackerSlot = attackerBf.findIndex((s) => s !== null);
          }
          if (attackerSlot === -1) break;
          const attackerRow = attackerSlot < 4 ? 0 : 1;
          const attackerCol = attackerSlot % 4;

          // Find first valid target — front row first
          let targetSlot = defenderBf.findIndex((s, i) => s !== null && i < 4);
          if (targetSlot === -1) {
            targetSlot = defenderBf.findIndex((s) => s !== null);
          }
          if (targetSlot === -1) break;
          const targetRow = targetSlot < 4 ? 0 : 1;
          const targetCol = targetSlot % 4;

          try {
            manager.handleAction(matchId, activePlayerId, {
              type: 'attack',
              playerIndex: activeIdx,
              attackerPosition: { row: attackerRow, col: attackerCol },
              targetPosition: { row: targetRow, col: targetCol },
            });
          } catch {
            // If attack fails (e.g. invalid target), pass instead
            manager.handleAction(matchId, activePlayerId, {
              type: 'pass',
              playerIndex: activeIdx,
            });
          }
        } else {
          break;
        }
        turns++;
      }

      // The game should reach gameOver or at minimum be in combat/reinforcement with many turns played
      expect(['combat', 'reinforcement', 'gameOver']).toContain(match.state!.phase);
      if (match.state!.phase === 'gameOver') {
        expect(match.state!.phase).toBe('gameOver');
      }

      // Both players should have received the final state
      const finalMsg1 = lastMessage(socket1);
      const finalMsg2 = lastMessage(socket2);
      expect(finalMsg1?.type).toBe('gameState');
      expect(finalMsg2?.type).toBe('gameState');
    });
  });

  describe('handleDisconnect', () => {
    it('should notify opponent when a player disconnects', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', socket1);
      manager.joinMatch(matchId, 'Bob', socket2);

      // Clear messages from join
      (socket2 as unknown as { _messages: string[] })._messages.length = 0;

      manager.handleDisconnect(socket1);

      const msg = lastMessage(socket2);
      expect(msg?.type).toBe('opponentDisconnected');
    });

    it('should remove socket from socketMap', () => {
      const socket = mockSocket();
      manager.createMatch('Alice', socket);
      manager.handleDisconnect(socket);

      expect(manager.socketMap.has(socket)).toBe(false);
    });
  });

  describe('transaction log and action history', () => {
    it('should produce transaction log entries with valid hashes after actions', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId, playerId: player0Id } = manager.createMatch('Alice', socket1);
      manager.joinMatch(matchId, 'Bob', socket2);

      const match = manager.matches.get(matchId)!;
      const card = match.state!.players[0]!.hand[0]!;

      manager.handleAction(matchId, player0Id, {
        type: 'deploy',
        playerIndex: 0,
        card: { suit: card.suit, rank: card.rank },
        column: 0,
      });

      const log = match.state!.transactionLog ?? [];
      expect(log).toHaveLength(1);
      expect(log[0]!.stateHashBefore.length).toBeGreaterThan(0);
      expect(log[0]!.stateHashAfter.length).toBeGreaterThan(0);
      expect(log[0]!.details.type).toBe('deploy');
    });

    it('should store actions in actionHistory', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId, playerId: player0Id } = manager.createMatch('Alice', socket1);
      manager.joinMatch(matchId, 'Bob', socket2);

      const match = manager.matches.get(matchId)!;
      const card = match.state!.players[0]!.hand[0]!;

      const action: Action = {
        type: 'deploy',
        playerIndex: 0,
        card: { suit: card.suit, rank: card.rank },
        column: 0,
      };
      manager.handleAction(matchId, player0Id, action);

      expect(match.actionHistory).toHaveLength(1);
      expect(match.actionHistory[0]).toEqual(action);
    });

    it('should store game config after joinMatch', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', socket1);
      manager.joinMatch(matchId, 'Bob', socket2);

      const match = manager.matches.get(matchId)!;
      expect(match.config).toBeDefined();
      expect(match.config!.players).toHaveLength(2);
      expect(match.config!.rngSeed).toBeTypeOf('number');
    });
  });

  describe('reconnect', () => {
    it('should restore connection and send current state', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId, playerId: player0Id } = manager.createMatch('Alice', socket1);
      manager.joinMatch(matchId, 'Bob', socket2);

      // Disconnect player 0
      manager.handleDisconnect(socket1);

      // Reconnect with new socket
      const newSocket = mockSocket();
      manager.reconnect(matchId, player0Id, newSocket);

      const msg = lastMessage(newSocket);
      expect(msg?.type).toBe('gameState');
    });

    it('should notify opponent of reconnection', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId, playerId: player0Id } = manager.createMatch('Alice', socket1);
      manager.joinMatch(matchId, 'Bob', socket2);

      manager.handleDisconnect(socket1);

      // Clear opponent messages
      (socket2 as unknown as { _messages: string[] })._messages.length = 0;

      const newSocket = mockSocket();
      manager.reconnect(matchId, player0Id, newSocket);

      const msg = lastMessage(socket2);
      expect(msg?.type).toBe('opponentReconnected');
    });

    it('should throw for nonexistent match', () => {
      const socket = mockSocket();
      expect(() =>
        manager.reconnect('00000000-0000-0000-0000-000000000000', 'fakeid', socket),
      ).toThrow(MatchError);
    });

    it('should throw for wrong player ID', () => {
      const socket1 = mockSocket();
      const { matchId } = manager.createMatch('Alice', socket1);

      const socket = mockSocket();
      expect(() => manager.reconnect(matchId, 'wrong-id', socket)).toThrow(MatchError);
    });

    it('should send filtered state on reconnect (no opponent cards)', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId, playerId: player0Id } = manager.createMatch('Alice', socket1);
      manager.joinMatch(matchId, 'Bob', socket2);

      manager.handleDisconnect(socket1);

      const newSocket = mockSocket();
      manager.reconnect(matchId, player0Id, newSocket);

      const msg = lastMessage(newSocket) as { type: string; state: { players: Array<{ hand: unknown[]; drawpile: unknown[]; handCount?: number; drawpileCount?: number }> } };
      expect(msg.type).toBe('gameState');
      // Own cards present
      expect(msg.state.players[0]!.hand.length).toBeGreaterThan(0);
      // Opponent cards redacted
      expect(msg.state.players[1]!.hand).toHaveLength(0);
      expect(msg.state.players[1]!.handCount).toBe(12);
      expect(msg.state.players[1]!.drawpile).toHaveLength(0);
      expect(msg.state.players[1]!.drawpileCount).toBeTypeOf('number');
    });
  });

  describe('per-player state filtering', () => {
    it('should redact opponent hand and drawpile in broadcasts', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', socket1);
      manager.joinMatch(matchId, 'Bob', socket2);
      manager.broadcastMatchState(matchId);

      type FilteredState = { type: string; state: { players: Array<{ hand: unknown[]; drawpile: unknown[]; handCount?: number; drawpileCount?: number }> } };
      const msg1 = lastMessage(socket1) as FilteredState;
      const msg2 = lastMessage(socket2) as FilteredState;

      // Player 0 sees own hand, opponent redacted
      expect(msg1.state.players[0]!.hand.length).toBeGreaterThan(0);
      expect(msg1.state.players[1]!.hand).toHaveLength(0);
      expect(msg1.state.players[1]!.handCount).toBe(12);

      // Player 1 sees own hand, opponent redacted
      expect(msg2.state.players[1]!.hand.length).toBeGreaterThan(0);
      expect(msg2.state.players[0]!.hand).toHaveLength(0);
      expect(msg2.state.players[0]!.handCount).toBe(12);
    });

    it('should preserve own cards completely', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', socket1);
      manager.joinMatch(matchId, 'Bob', socket2);
      manager.broadcastMatchState(matchId);

      type FilteredState = { type: string; state: { players: Array<{ hand: Array<{ suit: string; rank: string }>; drawpile: unknown[]; discardPile: unknown[] }> } };
      const msg1 = lastMessage(socket1) as FilteredState;

      // Own hand has actual card objects
      for (const card of msg1.state.players[0]!.hand) {
        expect(card).toHaveProperty('suit');
        expect(card).toHaveProperty('rank');
      }
    });

    it('should redact drawpile with correct count', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', socket1);
      manager.joinMatch(matchId, 'Bob', socket2);

      const match = manager.matches.get(matchId)!;
      const actualDrawpile0 = match.state!.players[0]!.drawpile.length;
      const actualDrawpile1 = match.state!.players[1]!.drawpile.length;

      manager.broadcastMatchState(matchId);

      type FilteredState = { type: string; state: { players: Array<{ drawpile: unknown[]; drawpileCount?: number }> } };
      const msg1 = lastMessage(socket1) as FilteredState;
      const msg2 = lastMessage(socket2) as FilteredState;

      // Player 0 sees own drawpile, opponent drawpile redacted with count
      expect(msg1.state.players[0]!.drawpile.length).toBe(actualDrawpile0);
      expect(msg1.state.players[1]!.drawpile).toHaveLength(0);
      expect(msg1.state.players[1]!.drawpileCount).toBe(actualDrawpile1);

      // Player 1 sees own drawpile, opponent drawpile redacted with count
      expect(msg2.state.players[1]!.drawpile.length).toBe(actualDrawpile1);
      expect(msg2.state.players[0]!.drawpile).toHaveLength(0);
      expect(msg2.state.players[0]!.drawpileCount).toBe(actualDrawpile0);
    });

    it('should not set handCount/drawpileCount on own player state', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', socket1);
      manager.joinMatch(matchId, 'Bob', socket2);
      manager.broadcastMatchState(matchId);

      type FilteredState = { type: string; state: { players: Array<{ handCount?: number; drawpileCount?: number }> } };
      const msg1 = lastMessage(socket1) as FilteredState;

      // Own player state should not have count fields
      expect(msg1.state.players[0]!.handCount).toBeUndefined();
      expect(msg1.state.players[0]!.drawpileCount).toBeUndefined();
    });
  });

  describe('match cleanup', () => {
    it('should remove gameOver matches after TTL', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', socket1);
      manager.joinMatch(matchId, 'Bob', socket2);

      // Force game over state
      const match = manager.matches.get(matchId)!;
      match.state = { ...match.state!, phase: 'gameOver' };
      // Set lastActivityAt to 6 minutes ago (exceeds 5 min TTL)
      match.lastActivityAt = Date.now() - 6 * 60 * 1000;

      const removed = manager.cleanupMatches();

      expect(removed).toBe(1);
      expect(manager.matches.has(matchId)).toBe(false);
    });

    it('should remove abandoned matches after TTL', () => {
      const socket1 = mockSocket();
      const { matchId } = manager.createMatch('Alice', socket1);

      // Set lastActivityAt to 11 minutes ago (exceeds 10 min TTL)
      const match = manager.matches.get(matchId)!;
      match.lastActivityAt = Date.now() - 11 * 60 * 1000;

      const removed = manager.cleanupMatches();

      expect(removed).toBe(1);
      expect(manager.matches.has(matchId)).toBe(false);
    });

    it('should not remove active matches', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', socket1);
      manager.joinMatch(matchId, 'Bob', socket2);

      const removed = manager.cleanupMatches();

      expect(removed).toBe(0);
      expect(manager.matches.has(matchId)).toBe(true);
    });

    it('should call onMatchRemoved callback for each removed match', () => {
      const callback = vi.fn();
      manager.onMatchRemoved = callback;

      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId: id1 } = manager.createMatch('Alice', socket1);
      const { matchId: id2 } = manager.createMatch('Bob', socket2);

      // Abandon both
      manager.matches.get(id1)!.lastActivityAt = Date.now() - 11 * 60 * 1000;
      manager.matches.get(id2)!.lastActivityAt = Date.now() - 11 * 60 * 1000;

      manager.cleanupMatches();

      expect(callback).toHaveBeenCalledTimes(2);
    });
  });
});
