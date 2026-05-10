import type { GameState } from '@phalanxduel/shared';

export type MatchOutcome = {
  winnerIndex?: number | null;
  victoryType?: string | null;
  turnNumber?: number | null;
} | null;

export interface MatchSummaryInput {
  player1Name: string | null;
  player2Name: string | null;
  botStrategy: string | null;
  outcome: MatchOutcome;
  actionCount: number;
  gs: GameState | null;
}

function outcomeStr(
  outcome: MatchOutcome,
  p1Name: string | null,
  p2Name: string | null,
  actionCount: number,
): string {
  if (outcome?.winnerIndex == null) return 'Match did not complete.';
  const winner = outcome.winnerIndex === 0 ? p1Name : outcome.winnerIndex === 1 ? p2Name : null;
  return `Winner: ${winner ?? 'unknown'} via ${outcome.victoryType ?? 'unknown'} in ${outcome.turnNumber ?? actionCount} turns.`;
}

function stateStr(gs: GameState | null): string[] {
  if (!gs) return [];
  const p0 = gs.players[0];
  const p1 = gs.players[1];
  return [
    `Final LP: P1=${p0?.lifepoints ?? 0}, P2=${p1?.lifepoints ?? 0}.`,
    `Cards remaining: P1 hand=${p0?.hand.length ?? 0}, P2 hand=${p1?.hand.length ?? 0}.`,
  ];
}

export function buildMatchSummary(input: MatchSummaryInput): string {
  const { player1Name, player2Name, botStrategy, outcome, actionCount, gs } = input;
  const p2Label = player2Name ?? (botStrategy ? `Bot(${botStrategy})` : 'Player 2');
  return [
    `Match between ${player1Name ?? 'Player 1'} and ${p2Label}.`,
    outcomeStr(outcome, player1Name, player2Name, actionCount),
    ...stateStr(gs),
  ]
    .filter(Boolean)
    .join(' ');
}
