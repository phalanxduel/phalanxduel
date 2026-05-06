import type { WebSocket } from 'ws';
import type { IMatchManager } from './match-types.js';

const ELO_BAND = 200;
const MAX_WAIT_MS = 5 * 60 * 1000;

interface QueueEntry {
  userId: string;
  elo: number;
  playerName: string;
  socket: WebSocket;
  joinedAt: number;
}

type SendFn = (socket: WebSocket, payload: Record<string, unknown>) => void;

export class MatchmakingQueueService {
  private readonly entries = new Map<string, QueueEntry>();
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(
    private readonly matchManager: IMatchManager,
    private readonly send: SendFn,
    private readonly log: { info: (obj: object, msg: string) => void },
  ) {
    this.cleanupTimer = setInterval(() => {
      this.purgeStale();
    }, 60_000);
  }

  get size(): number {
    return this.entries.size;
  }

  async join(userId: string, elo: number, playerName: string, socket: WebSocket): Promise<void> {
    if (await this.matchManager.getActiveMatchForUser(userId)) {
      this.send(socket, {
        type: 'matchError',
        error: 'You already have an active match in progress',
        code: 'ALREADY_IN_MATCH',
      });
      return;
    }

    if (this.entries.has(userId)) {
      this.entries.delete(userId);
    }
    this.entries.set(userId, { userId, elo, playerName, socket, joinedAt: Date.now() });
    this.log.info(
      { event: 'queue_joined', userId, elo, queueSize: this.entries.size },
      'queue:join',
    );
    this.tryMatch(userId);
  }

  leave(userId: string): boolean {
    const removed = this.entries.delete(userId);
    if (removed) {
      this.log.info({ event: 'queue_left', userId, reason: 'cancelled' }, 'queue:leave');
    }
    return removed;
  }

  removeBySocket(socket: WebSocket): string | null {
    for (const [userId, entry] of this.entries) {
      if (entry.socket === socket) {
        this.entries.delete(userId);
        this.log.info({ event: 'queue_left', userId, reason: 'disconnect' }, 'queue:disconnect');
        return userId;
      }
    }
    return null;
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.entries.clear();
  }

  private tryMatch(newUserId: string): void {
    const entrant = this.entries.get(newUserId);
    if (!entrant) return;

    for (const [userId, candidate] of this.entries) {
      if (userId === newUserId) continue;
      if (Math.abs(candidate.elo - entrant.elo) <= ELO_BAND) {
        this.entries.delete(newUserId);
        this.entries.delete(userId);
        void this.createPairedMatch(entrant, candidate);
        return;
      }
    }
  }

  private async createPairedMatch(p0: QueueEntry, p1: QueueEntry): Promise<void> {
    try {
      const { matchId, playerId: p0PlayerId } = await this.matchManager.createMatch(
        p0.playerName,
        p0.socket,
        { userId: p0.userId },
      );
      const { playerId: p1PlayerId, playerIndex: p1Index } = await this.matchManager.joinMatch(
        matchId,
        p1.playerName,
        p1.socket,
        p1.userId,
      );

      this.log.info(
        { event: 'queue_match_found', matchId, p0UserId: p0.userId, p1UserId: p1.userId },
        'queue:matched',
      );

      this.send(p0.socket, {
        type: 'queueMatchFound',
        matchId,
        playerId: p0PlayerId,
        playerIndex: 0,
      });
      this.send(p1.socket, {
        type: 'queueMatchFound',
        matchId,
        playerId: p1PlayerId,
        playerIndex: p1Index,
      });

      this.matchManager.broadcastMatchState(matchId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.info({ event: 'queue_match_error', error: msg }, 'queue:match_failed');
      // Re-queue both players if possible (their sockets may still be open)
      if (p0.socket.readyState === 1) {
        this.send(p0.socket, {
          type: 'matchError',
          error: 'Matchmaking failed',
          code: 'QUEUE_MATCH_FAILED',
        });
      }
      if (p1.socket.readyState === 1) {
        this.send(p1.socket, {
          type: 'matchError',
          error: 'Matchmaking failed',
          code: 'QUEUE_MATCH_FAILED',
        });
      }
    }
  }

  private purgeStale(): void {
    const now = Date.now();
    for (const [userId, entry] of this.entries) {
      if (now - entry.joinedAt > MAX_WAIT_MS) {
        this.entries.delete(userId);
        this.log.info({ event: 'queue_left', userId, reason: 'timeout' }, 'queue:timeout');
        if (entry.socket.readyState === 1) {
          this.send(entry.socket, { type: 'queueLeft', reason: 'timeout' });
        }
      }
    }
  }
}
