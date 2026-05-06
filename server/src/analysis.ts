import type { MatchInstance } from './match-types.js';
import { db } from './db/index.js';
import { matchEmbeddings } from './db/schema.js';
import { traceDbQuery } from './db/observability.js';

export class MatchAnalysisService {
  async analyzeMatch(match: MatchInstance): Promise<void> {
    if (!db || !match.state) return;

    try {
      const summary = this.generateSummary(match);
      const metadata = this.extractMetadata(match);

      // In a real implementation, we would call OpenAI here to get the embedding.
      // For now, we store the summary and metadata, leaving the embedding null
      // until a provider is configured.
      await traceDbQuery(
        'db.match_embeddings.insert',
        { operation: 'INSERT', table: 'match_embeddings' },
        () =>
          db!
            .insert(matchEmbeddings)
            .values({
              matchId: match.matchId,
              summary,
              metadata,
              version: 1,
            })
            .onConflictDoUpdate({
              target: matchEmbeddings.matchId,
              set: { summary, metadata, createdAt: new Date() },
            }),
      );
    } catch (err) {
      console.error('[analysis] Failed to analyze match', { matchId: match.matchId, err });
    }
  }

  private generateSummary(match: MatchInstance): string {
    const state = match.state!;
    const outcome = state.outcome;
    const p1 = match.players[0]?.playerName ?? 'Player 1';
    const p2 = match.players[1]?.playerName ?? 'Player 2';
    const winnerName = outcome?.winnerIndex === 0 ? p1 : outcome?.winnerIndex === 1 ? p2 : 'None';

    let summary = `Match ${match.matchId} between ${p1} and ${p2}. `;
    summary += `Duration: ${state.turnNumber} turns. Winner: ${winnerName} (${outcome?.victoryType ?? 'N/A'}). `;

    // Simple tactical summary based on suits
    const suits = match.players.map((_, i) => {
      const hand = state.players[i]?.hand ?? [];
      const counts: Record<string, number> = {};
      for (const c of hand) {
        counts[c.suit] = (counts[c.suit] || 0) + 1;
      }
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([s]) => s)[0];
    });

    summary += `Tactical focus: ${p1} favored ${suits[0] || 'mixed'} suits, ${p2} favored ${suits[1] || 'mixed'} suits.`;

    return summary;
  }

  private extractMetadata(match: MatchInstance): MatchAnalysisMetadata {
    const state = match.state!;
    const outcome = state.outcome;
    return {
      winnerIndex: outcome?.winnerIndex ?? null,
      victoryType: outcome?.victoryType ?? null,
      turnCount: state.turnNumber,
      finalLp: [state.players[0]?.lifepoints ?? 0, state.players[1]?.lifepoints ?? 0],
      player1Suit: state.players[0]?.hand?.[0]?.suit ?? null,
      player2Suit: state.players[1]?.hand?.[0]?.suit ?? null,
    };
  }
}

interface MatchAnalysisMetadata {
  winnerIndex: number | null;
  victoryType: string | null;
  turnCount: number;
  finalLp: [number, number];
  player1Suit: string | null;
  player2Suit: string | null;
}
