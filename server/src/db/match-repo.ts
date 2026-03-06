import { db } from './index.js';
import { matches } from './schema.js';
import { eq } from 'drizzle-orm';
import type { MatchInstance } from '../match.js';
import type { GameState, Action } from '@phalanxduel/shared';
import type { GameConfig } from '@phalanxduel/engine';

export class MatchRepository {
  async saveMatch(match: MatchInstance): Promise<void> {
    if (!db) return;

    const payload = {
      id: match.matchId,
      player1Id: match.players[0]?.userId ?? null,
      player2Id: match.players[1]?.userId ?? null,
      player1Name: match.players[0]?.playerName ?? 'Unknown',
      player2Name: match.players[1]?.playerName ?? 'Unknown',
      config: match.config,
      state: match.state,
      actionHistory: match.actionHistory,
      transactionLog: match.state?.transactionLog ?? [],
      outcome: match.state?.outcome ?? null,
      status: (match.state?.phase === 'gameOver' ? 'completed' : 'active') as
        | 'pending'
        | 'active'
        | 'completed'
        | 'cancelled',
      updatedAt: new Date(),
    };

    try {
      await db
        .insert(matches)
        .values({
          ...payload,
          createdAt: new Date(match.createdAt),
        })
        .onConflictDoUpdate({
          target: matches.id,
          set: payload,
        });
    } catch (err) {
      console.error('Failed to save match to database:', err);
    }
  }

  async getMatch(matchId: string): Promise<MatchInstance | null> {
    if (!db) return null;

    try {
      const result = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
      if (result.length === 0) return null;

      const row = result[0]!;
      // Reconstituting MatchInstance from DB row
      // Note: sockets cannot be recovered from DB
      return {
        matchId: row.id,
        players: [
          row.player1Name
            ? {
                playerId: 'recovered-p1',
                playerName: row.player1Name,
                playerIndex: 0,
                userId: row.player1Id || undefined,
                socket: null,
              }
            : null,
          row.player2Name
            ? {
                playerId: 'recovered-p2',
                playerName: row.player2Name,
                playerIndex: 1,
                userId: row.player2Id || undefined,
                socket: null,
              }
            : null,
        ],
        spectators: [],
        state: row.state as GameState,
        config: row.config as unknown as GameConfig,
        actionHistory: row.actionHistory as Action[],
        createdAt: row.createdAt.getTime(),
        lastActivityAt: row.updatedAt.getTime(),
      };
    } catch (err) {
      console.error('Failed to get match from database:', err);
      return null;
    }
  }
}
