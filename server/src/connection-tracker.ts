/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import type { WebSocket } from 'ws';
import type { ServerMessage } from '@phalanxduel/shared';
import { ServerMessageSchema } from '@phalanxduel/shared';
import type { SocketInfo } from './match-types.js';

/**
 * MatchConnectionTracker isolates all WebSocket-specific transport concerns
 * from the domain layer (MatchActor, MatchInstance).
 *
 * It owns:
 * - The socket → identity mapping (socketMap)
 * - Sending messages to specific sockets
 * - Broadcasting to all participants of a match
 * - Tracking which sockets belong to which match/player/spectator
 *
 * This creates a clean seam between the transport layer and the game domain,
 * so that MatchActor and MatchInstance never need to import 'ws'.
 */
export class MatchConnectionTracker {
  private socketMap = new Map<WebSocket, SocketInfo>();

  /**
   * Register a socket for a player in a match.
   */
  registerPlayer(socket: WebSocket, matchId: string, playerId: string): void {
    this.socketMap.set(socket, { matchId, playerId, isSpectator: false });
  }

  /**
   * Register a socket for a spectator in a match.
   */
  registerSpectator(socket: WebSocket, matchId: string, spectatorId: string): void {
    this.socketMap.set(socket, { matchId, spectatorId, isSpectator: true });
  }

  /**
   * Remove a socket from tracking.
   * Returns the SocketInfo that was associated with it, or undefined.
   */
  unregister(socket: WebSocket): SocketInfo | undefined {
    const info = this.socketMap.get(socket);
    this.socketMap.delete(socket);
    return info;
  }

  /**
   * Look up the identity behind a socket.
   */
  getSocketInfo(socket: WebSocket): SocketInfo | undefined {
    return this.socketMap.get(socket);
  }

  /**
   * Send a message to a single socket, with schema validation.
   * Returns true if the message was sent, false if the socket was unavailable.
   */
  send(socket: WebSocket | null, message: ServerMessage): boolean {
    if (!socket || socket.readyState !== 1) return false;

    const result = ServerMessageSchema.safeParse(message);
    if (!result.success) {
      console.error('[MatchConnectionTracker.send] Outbound message failed schema validation', {
        type: (message as { type?: string }).type,
        issues: result.error.issues,
      });
    }
    socket.send(JSON.stringify(message));
    return true;
  }

  /**
   * Send a message to all sockets registered to a given match.
   */
  broadcastToMatch(matchId: string, message: ServerMessage): void {
    for (const [socket, info] of this.socketMap) {
      if (info.matchId === matchId) {
        this.send(socket, message);
      }
    }
  }

  /**
   * Send a message to all tracked sockets, regardless of match.
   */
  broadcastToAll(message: ServerMessage): void {
    for (const [socket] of this.socketMap) {
      this.send(socket, message);
    }
  }

  /**
   * Get all sockets registered for a match, optionally filtered by role.
   */
  getMatchSockets(
    matchId: string,
    role?: 'player' | 'spectator',
  ): { socket: WebSocket; info: SocketInfo }[] {
    const result: { socket: WebSocket; info: SocketInfo }[] = [];
    for (const [socket, info] of this.socketMap) {
      if (info.matchId !== matchId) continue;
      if (role === 'player' && info.isSpectator) continue;
      if (role === 'spectator' && !info.isSpectator) continue;
      result.push({ socket, info });
    }
    return result;
  }

  /**
   * Count all tracked connections.
   */
  get connectionCount(): number {
    return this.socketMap.size;
  }

  /**
   * Count spectators for a match.
   */
  spectatorCount(matchId: string): number {
    let count = 0;
    for (const info of this.socketMap.values()) {
      if (info.matchId === matchId && info.isSpectator) count++;
    }
    return count;
  }
}
