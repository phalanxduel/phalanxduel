import { and, desc, eq, count } from 'drizzle-orm';
import { db } from './db/index.js';
import { matchResults, matches, playerRatings, users, userFollows } from './db/schema.js';
import { traceDbQuery } from './db/observability.js';
import { ELO_CONSTANTS } from './elo.js';

export type RatingMode = 'pvp' | 'sp-random' | 'sp-heuristic';

export type PublicConfidenceLabel = 'Provisional' | 'Calibrating' | 'Established' | 'Inactive';

export interface PublicMatchEntry {
  matchId: string;
  result: 'win' | 'loss' | 'draw';
  mode: RatingMode;
  opponentName: string | null;
  completedAt: string;
  turnNumber: number | null;
}

export interface PublicChallengeEntry {
  matchId: string;
  createdAt: string;
  createdAtIso: string;
  creatorName: string;
  creatorElo: number;
  creatorRecord: {
    wins: number;
    losses: number;
    draws: number;
    gamesPlayed: number;
    provisional: boolean;
    confidenceLabel: PublicConfidenceLabel;
  };
  requirements: {
    minPublicRating: number | null;
    maxPublicRating: number | null;
    minGamesPlayed: number | null;
    requiresEstablishedRating: boolean;
  };
}

export interface PublicProfile {
  userId: string;
  gamertag: string;
  displayName: string;
  elo: number;
  record: {
    wins: number;
    losses: number;
    draws: number;
    gamesPlayed: number;
  };
  streak: number;
  confidenceLabel: PublicConfidenceLabel;
  recentMatches: PublicMatchEntry[];
  openChallenges: PublicChallengeEntry[];
  followStats?: {
    followers: number;
    following: number;
  };
  isFollowing?: boolean;
}

interface RatingRow {
  eloRating: number;
  glickoRating: number;
  glickoRatingDeviation: number;
  glickoVolatility: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  abandons: number;
  provisional: boolean;
}

interface MatchOutcome {
  winnerIndex?: number | null;
  turnNumber?: number | null;
}

function modeFromBotStrategy(botStrategy: string | null | undefined): RatingMode {
  if (!botStrategy) return 'pvp';
  return `sp-${botStrategy}` as RatingMode;
}

function confidenceLabel(row: RatingRow | null, lastRatedAt: Date | null): PublicConfidenceLabel {
  if (!row) return 'Provisional';
  if (row.provisional) return 'Provisional';
  if (row.gamesPlayed < 10 || row.glickoRatingDeviation >= 220) return 'Calibrating';
  if (lastRatedAt && Date.now() - lastRatedAt.getTime() > 30 * 24 * 60 * 60 * 1000) {
    return 'Inactive';
  }
  return 'Established';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function ratingDelta(currentElo: number, opponentElo: number, score: number): number {
  const expected = 1 / (1 + 10 ** ((opponentElo - currentElo) / 400));
  return Math.round(ELO_CONSTANTS.K_FACTOR * (score - expected));
}

function resultFromOutcome(
  winnerIndex: number | null | undefined,
  playerIndex: 0 | 1,
): 'win' | 'loss' | 'draw' {
  if (winnerIndex === null || winnerIndex === undefined || winnerIndex < 0) return 'draw';
  return winnerIndex === playerIndex ? 'win' : 'loss';
}

function scoreFromResult(result: 'win' | 'loss' | 'draw'): number {
  if (result === 'win') return 1;
  if (result === 'draw') return 0.5;
  return 0;
}

function buildDisplayName(gamertag: string, suffix: number | null): string {
  return suffix ? `${gamertag}#${suffix}` : gamertag;
}

export class PlayerRatingsService {
  private readonly database = db;

  async recordMatchComplete(match: {
    matchId: string;
    player1Id: string | null;
    player2Id: string | null;
    botStrategy: string | null | undefined;
    outcome: MatchOutcome | null;
    abandonPlayerIndex?: 0 | 1 | null;
  }): Promise<void> {
    const database = this.database;
    if (!database) return;

    const mode = modeFromBotStrategy(match.botStrategy);
    const participants: { userId: string; playerIndex: 0 | 1; opponentId: string | null }[] = [];
    if (match.player1Id)
      participants.push({ userId: match.player1Id, playerIndex: 0, opponentId: match.player2Id });
    if (match.player2Id)
      participants.push({ userId: match.player2Id, playerIndex: 1, opponentId: match.player1Id });
    if (participants.length === 0) return;

    await traceDbQuery('db.match_results.record', { operation: 'TX', table: 'match_results' }, () =>
      database.transaction(async (tx) => {
        for (const participant of participants) {
          const existing = await tx
            .select({ userId: matchResults.userId })
            .from(matchResults)
            .where(
              and(
                eq(matchResults.matchId, match.matchId),
                eq(matchResults.userId, participant.userId),
              ),
            )
            .limit(1);
          if (existing.length > 0) continue;

          const [currentRating] = await tx
            .select()
            .from(playerRatings)
            .where(and(eq(playerRatings.userId, participant.userId), eq(playerRatings.mode, mode)))
            .limit(1);

          const [userRow] = await tx
            .select({ id: users.id, elo: users.elo })
            .from(users)
            .where(eq(users.id, participant.userId))
            .limit(1);

          if (!userRow) {
            continue;
          }

          const [opponentRow] = participant.opponentId
            ? await tx
                .select({ id: users.id, elo: users.elo })
                .from(users)
                .where(eq(users.id, participant.opponentId))
                .limit(1)
            : [undefined];

          const row: RatingRow = currentRating
            ? {
                eloRating: currentRating.eloRating,
                glickoRating: currentRating.glickoRating,
                glickoRatingDeviation: currentRating.glickoRatingDeviation,
                glickoVolatility: currentRating.glickoVolatility,
                gamesPlayed: currentRating.gamesPlayed,
                wins: currentRating.wins,
                losses: currentRating.losses,
                draws: currentRating.draws,
                abandons: currentRating.abandons,
                provisional: currentRating.provisional,
              }
            : {
                eloRating: userRow?.elo ?? 1000,
                glickoRating: 1500,
                glickoRatingDeviation: 350,
                glickoVolatility: 0.06,
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                abandons: 0,
                provisional: true,
              };

          const result = resultFromOutcome(match.outcome?.winnerIndex, participant.playerIndex);
          const score = scoreFromResult(result);
          const opponentRating = opponentRow?.elo ?? row.eloRating;
          const eloDelta = ratingDelta(row.eloRating, opponentRating, score);
          const glickoDelta = Math.round(eloDelta * 1.5);
          const nextRow = {
            eloRating: row.eloRating + eloDelta,
            glickoRating: row.glickoRating + glickoDelta,
            glickoRatingDeviation: Math.max(80, Math.round(row.glickoRatingDeviation * 0.92)),
            glickoVolatility: clamp(
              row.glickoVolatility + (score === 1 ? -0.002 : score === 0 ? 0.002 : 0),
              0.03,
              0.12,
            ),
            gamesPlayed: row.gamesPlayed + 1,
            wins: row.wins + (result === 'win' ? 1 : 0),
            losses: row.losses + (result === 'loss' ? 1 : 0),
            draws: row.draws + (result === 'draw' ? 1 : 0),
            abandons: row.abandons + (match.abandonPlayerIndex === participant.playerIndex ? 1 : 0),
            provisional:
              row.gamesPlayed + 1 < 10 ||
              Math.max(80, Math.round(row.glickoRatingDeviation * 0.92)) >= 220,
          };

          await tx.insert(matchResults).values({
            matchId: match.matchId,
            userId: participant.userId,
            opponentId: participant.opponentId,
            mode,
            result,
            eloBefore: row.eloRating,
            eloAfter: nextRow.eloRating,
            eloDelta,
            glickoBefore: row.glickoRating,
            glickoAfter: nextRow.glickoRating,
            glickoRdBefore: row.glickoRatingDeviation,
            glickoRdAfter: nextRow.glickoRatingDeviation,
          });

          await tx
            .insert(playerRatings)
            .values({
              userId: participant.userId,
              mode,
              eloRating: nextRow.eloRating,
              glickoRating: nextRow.glickoRating,
              glickoRatingDeviation: nextRow.glickoRatingDeviation,
              glickoVolatility: nextRow.glickoVolatility,
              gamesPlayed: nextRow.gamesPlayed,
              wins: nextRow.wins,
              losses: nextRow.losses,
              draws: nextRow.draws,
              abandons: nextRow.abandons,
              provisional: nextRow.provisional,
              lastRatedAt: new Date(),
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [playerRatings.userId, playerRatings.mode],
              set: {
                eloRating: nextRow.eloRating,
                glickoRating: nextRow.glickoRating,
                glickoRatingDeviation: nextRow.glickoRatingDeviation,
                glickoVolatility: nextRow.glickoVolatility,
                gamesPlayed: nextRow.gamesPlayed,
                wins: nextRow.wins,
                losses: nextRow.losses,
                draws: nextRow.draws,
                abandons: nextRow.abandons,
                provisional: nextRow.provisional,
                lastRatedAt: new Date(),
                updatedAt: new Date(),
              },
            });

          await tx
            .update(users)
            .set({
              elo: nextRow.eloRating,
              updatedAt: new Date(),
            })
            .where(eq(users.id, participant.userId));
        }
      }),
    );
  }

  async getCreatorStats(userId: string): Promise<{
    eloRating: number;
    glickoRating: number;
    glickoRD: number;
    wins: number;
    losses: number;
    abandons: number;
    gamesPlayed: number;
    matchesCreated: number;
    successfulStarts: number;
  } | null> {
    const database = this.database;
    if (!database) return null;
    const [userRow] = await traceDbQuery(
      'db.users.select_creator_stats',
      { operation: 'SELECT', table: 'users' },
      () =>
        database
          .select({
            elo: users.elo,
            matchesCreated: users.matchesCreated,
            successfulStarts: users.successfulStarts,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1),
    );
    if (!userRow) return null;
    const [ratingRow] = await traceDbQuery(
      'db.player_ratings.select_creator_stats',
      { operation: 'SELECT', table: 'player_ratings' },
      () =>
        database
          .select()
          .from(playerRatings)
          .where(and(eq(playerRatings.userId, userId), eq(playerRatings.mode, 'pvp')))
          .limit(1),
    );
    return {
      eloRating: ratingRow?.eloRating ?? userRow.elo,
      glickoRating: ratingRow?.glickoRating ?? 1500,
      glickoRD: ratingRow?.glickoRatingDeviation ?? 350,
      wins: ratingRow?.wins ?? 0,
      losses: ratingRow?.losses ?? 0,
      abandons: ratingRow?.abandons ?? 0,
      gamesPlayed: ratingRow?.gamesPlayed ?? 0,
      matchesCreated: userRow.matchesCreated,
      successfulStarts: userRow.successfulStarts,
    };
  }

  private async getFollowData(database: { select: Function }, userId: string, viewerId?: string) {
    const db = database as any;
    const [followersCount, followingCount, followRecord] = await Promise.all([
      db.select({ count: count() }).from(userFollows).where(eq(userFollows.followingId, userId)),
      db.select({ count: count() }).from(userFollows).where(eq(userFollows.followerId, userId)),
      viewerId
        ? db
            .select({ count: count() })
            .from(userFollows)
            .where(and(eq(userFollows.followerId, viewerId), eq(userFollows.followingId, userId)))
        : Promise.resolve([{ count: 0 }]),
    ]);

    return {
      stats: {
        followers: followersCount[0]?.count ?? 0,
        following: followingCount[0]?.count ?? 0,
      },
      isFollowing: (followRecord[0]?.count ?? 0) > 0,
    };
  }

  async getPublicProfile(userId: string, viewerId?: string): Promise<PublicProfile | null> {
    const database = this.database;
    if (!database) return null;

    const [userRow] = await traceDbQuery(
      'db.users.select_public_profile',
      { operation: 'SELECT', table: 'users' },
      () =>
        database
          .select({
            id: users.id,
            gamertag: users.gamertag,
            suffix: users.suffix,
            elo: users.elo,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1),
    );
    if (!userRow) return null;

    const [ratingRow, followData] = await Promise.all([
      traceDbQuery('db.player_ratings.select_public_profile', { operation: 'SELECT', table: 'player_ratings' }, () =>
        database
          .select()
          .from(playerRatings)
          .where(and(eq(playerRatings.userId, userId), eq(playerRatings.mode, 'pvp')))
          .limit(1),
      ).then((rows) => rows[0]),
      this.getFollowData(database, userId, viewerId),
    ]);

    const recentResults = await traceDbQuery(
      'db.match_results.select_recent',
      { operation: 'SELECT', table: 'match_results' },
      () =>
        database
          .select({
            matchId: matchResults.matchId,
            result: matchResults.result,
            mode: matchResults.mode,
            completedAt: matchResults.createdAt,
            outcome: matches.outcome,
            player1Id: matches.player1Id,
            player2Id: matches.player2Id,
            player1Name: matches.player1Name,
            player2Name: matches.player2Name,
          })
          .from(matchResults)
          .leftJoin(matches, eq(matches.id, matchResults.matchId))
          .where(eq(matchResults.userId, userId))
          .orderBy(desc(matchResults.createdAt))
          .limit(8),
    );

    const openChallenges = await traceDbQuery(
      'db.matches.select_open_challenges',
      { operation: 'SELECT', table: 'matches' },
      () =>
        database
          .select({
            id: matches.id,
            createdAt: matches.createdAt,
            player1Id: matches.player1Id,
            player1Name: matches.player1Name,
            minPublicRating: matches.minPublicRating,
            maxPublicRating: matches.maxPublicRating,
            minGamesPlayed: matches.minGamesPlayed,
            requiresEstablishedRating: matches.requiresEstablishedRating,
          })
          .from(matches)
          .where(
            and(
              eq(matches.visibility, 'public_open'),
              eq(matches.publicStatus, 'open'),
              eq(matches.player1Id, userId),
            ),
          )
          .orderBy(desc(matches.createdAt)),
    );

    const row = ratingRow
      ? {
          eloRating: ratingRow.eloRating,
          glickoRating: ratingRow.glickoRating,
          glickoRatingDeviation: ratingRow.glickoRatingDeviation,
          glickoVolatility: ratingRow.glickoVolatility,
          gamesPlayed: ratingRow.gamesPlayed,
          wins: ratingRow.wins,
          losses: ratingRow.losses,
          draws: ratingRow.draws,
          abandons: ratingRow.abandons,
          provisional: ratingRow.provisional,
        }
      : null;
    const confidence = confidenceLabel(row, ratingRow?.lastRatedAt ?? null);

    const recentMatches: PublicMatchEntry[] = recentResults.map((entry) => {
      const outcome = entry.outcome as MatchOutcome | null;
      const opponentName =
        entry.player1Id === userId ? (entry.player2Name ?? null) : (entry.player1Name ?? null);
      return {
        matchId: entry.matchId,
        result: entry.result,
        mode: entry.mode as RatingMode,
        opponentName,
        completedAt: entry.completedAt.toISOString(),
        turnNumber: outcome?.turnNumber ?? null,
      };
    });

    const challenges: PublicChallengeEntry[] = openChallenges.map((challenge) => ({
      matchId: challenge.id,
      createdAt: challenge.createdAt.toISOString(),
      createdAtIso: challenge.createdAt.toISOString(),
      creatorName: challenge.player1Name ?? buildDisplayName(userRow.gamertag, userRow.suffix),
      creatorElo: userRow.elo,
      creatorRecord: {
        wins: row?.wins ?? 0,
        losses: row?.losses ?? 0,
        draws: row?.draws ?? 0,
        gamesPlayed: row?.gamesPlayed ?? 0,
        provisional: row?.provisional ?? true,
        confidenceLabel: confidence,
      },
      requirements: {
        minPublicRating: challenge.minPublicRating,
        maxPublicRating: challenge.maxPublicRating,
        minGamesPlayed: challenge.minGamesPlayed,
        requiresEstablishedRating: challenge.requiresEstablishedRating,
      },
    }));

    let streak = 0;
    for (const entry of recentMatches) {
      if (entry.result === 'draw') break;
      const sign = entry.result === 'win' ? 1 : -1;
      if (streak === 0 || Math.sign(streak) === sign) {
        streak += sign;
      } else {
        break;
      }
    }

    return {
      userId: userRow.id,
      gamertag: userRow.gamertag,
      displayName: buildDisplayName(userRow.gamertag, userRow.suffix),
      elo: userRow.elo,
      record: {
        wins: row?.wins ?? 0,
        losses: row?.losses ?? 0,
        draws: row?.draws ?? 0,
        gamesPlayed: row?.gamesPlayed ?? 0,
      },
      streak,
      confidenceLabel: confidence,
      recentMatches,
      openChallenges: challenges,
      followStats: followData.stats,
      isFollowing: followData.isFollowing,
    };
  }
}
