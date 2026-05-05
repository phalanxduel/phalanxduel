import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchConnectionTracker } from '../src/connection-tracker.js';
import type { WebSocket } from 'ws';
import type { ServerMessage } from '@phalanxduel/shared';

function mockSocket(readyState = 1): WebSocket {
  return {
    readyState,
    send: vi.fn(),
  } as unknown as WebSocket;
}

describe('MatchConnectionTracker', () => {
  let tracker: MatchConnectionTracker;

  beforeEach(() => {
    tracker = new MatchConnectionTracker();
  });

  describe('registerPlayer / getSocketInfo', () => {
    it('registers a player socket and retrieves info', () => {
      const ws = mockSocket();
      tracker.registerPlayer(ws, 'match-1', 'player-1');
      const info = tracker.getSocketInfo(ws);
      expect(info).toEqual({ matchId: 'match-1', playerId: 'player-1', isSpectator: false });
    });
  });

  describe('registerSpectator / getSocketInfo', () => {
    it('registers a spectator socket and retrieves info', () => {
      const ws = mockSocket();
      tracker.registerSpectator(ws, 'match-1', 'spectator-1');
      const info = tracker.getSocketInfo(ws);
      expect(info).toEqual({ matchId: 'match-1', spectatorId: 'spectator-1', isSpectator: true });
    });
  });

  describe('unregister', () => {
    it('removes a socket and returns its info', () => {
      const ws = mockSocket();
      tracker.registerPlayer(ws, 'match-1', 'player-1');
      const info = tracker.unregister(ws);
      expect(info).toEqual({ matchId: 'match-1', playerId: 'player-1', isSpectator: false });
      expect(tracker.getSocketInfo(ws)).toBeUndefined();
    });

    it('returns undefined for unknown socket', () => {
      const ws = mockSocket();
      expect(tracker.unregister(ws)).toBeUndefined();
    });
  });

  describe('send', () => {
    it('sends a JSON message to an open socket', () => {
      const ws = mockSocket(1);
      const msg: ServerMessage = { type: 'ping', timestamp: new Date().toISOString() };
      const sent = tracker.send(ws, msg);
      expect(sent).toBe(true);
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify(msg));
    });

    it('returns false for a closed socket', () => {
      const ws = mockSocket(3); // CLOSED
      const msg: ServerMessage = { type: 'ping', timestamp: new Date().toISOString() };
      const sent = tracker.send(ws, msg);
      expect(sent).toBe(false);
      expect(ws.send).not.toHaveBeenCalled();
    });

    it('returns false for null socket', () => {
      const msg: ServerMessage = { type: 'ping', timestamp: new Date().toISOString() };
      const sent = tracker.send(null, msg);
      expect(sent).toBe(false);
    });
  });

  describe('broadcastToMatch', () => {
    it('sends to all sockets in a match', () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      const wsOther = mockSocket();
      tracker.registerPlayer(ws1, 'match-1', 'p1');
      tracker.registerSpectator(ws2, 'match-1', 's1');
      tracker.registerPlayer(wsOther, 'match-2', 'p2');

      const msg: ServerMessage = { type: 'ping', timestamp: new Date().toISOString() };
      tracker.broadcastToMatch('match-1', msg);

      expect(ws1.send).toHaveBeenCalled();
      expect(ws2.send).toHaveBeenCalled();
      expect(wsOther.send).not.toHaveBeenCalled();
    });
  });

  describe('broadcastToAll', () => {
    it('sends to every tracked socket', () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      tracker.registerPlayer(ws1, 'match-1', 'p1');
      tracker.registerPlayer(ws2, 'match-2', 'p2');

      const msg: ServerMessage = { type: 'ping', timestamp: new Date().toISOString() };
      tracker.broadcastToAll(msg);

      expect(ws1.send).toHaveBeenCalled();
      expect(ws2.send).toHaveBeenCalled();
    });
  });

  describe('getMatchSockets', () => {
    it('returns all sockets for a match', () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      tracker.registerPlayer(ws1, 'match-1', 'p1');
      tracker.registerSpectator(ws2, 'match-1', 's1');

      const all = tracker.getMatchSockets('match-1');
      expect(all).toHaveLength(2);
    });

    it('filters by player role', () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      tracker.registerPlayer(ws1, 'match-1', 'p1');
      tracker.registerSpectator(ws2, 'match-1', 's1');

      const players = tracker.getMatchSockets('match-1', 'player');
      expect(players).toHaveLength(1);
      expect(players[0]?.info).toEqual({
        matchId: 'match-1',
        playerId: 'p1',
        isSpectator: false,
      });
    });

    it('filters by spectator role', () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      tracker.registerPlayer(ws1, 'match-1', 'p1');
      tracker.registerSpectator(ws2, 'match-1', 's1');

      const spectators = tracker.getMatchSockets('match-1', 'spectator');
      expect(spectators).toHaveLength(1);
    });
  });

  describe('connectionCount', () => {
    it('tracks total connections', () => {
      expect(tracker.connectionCount).toBe(0);
      const ws1 = mockSocket();
      tracker.registerPlayer(ws1, 'match-1', 'p1');
      expect(tracker.connectionCount).toBe(1);
      tracker.unregister(ws1);
      expect(tracker.connectionCount).toBe(0);
    });
  });

  describe('spectatorCount', () => {
    it('counts spectators for a specific match', () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      const ws3 = mockSocket();
      tracker.registerPlayer(ws1, 'match-1', 'p1');
      tracker.registerSpectator(ws2, 'match-1', 's1');
      tracker.registerSpectator(ws3, 'match-1', 's2');

      expect(tracker.spectatorCount('match-1')).toBe(2);
      expect(tracker.spectatorCount('match-2')).toBe(0);
    });
  });
});
