import type { GameState } from '@phalanxduel/shared';

// Strip control characters and newlines from user-supplied strings before
// they enter embedding summaries or analysis prompts.
const CONTROL_CHARS = new RegExp('[\\x00-\\x1f\\x7f]', 'g'); // eslint-disable-line no-control-regex

function sanitizeName(name: string | null): string | null {
  if (name === null) return null;
  return name.replace(CONTROL_CHARS, ' ').trim().slice(0, 64);
}

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
  const p1 = sanitizeName(player1Name);
  const p2 = sanitizeName(player2Name);
  const p2Label = p2 ?? (botStrategy ? `Bot(${botStrategy})` : 'Player 2');
  return [
    `Match between ${p1 ?? 'Player 1'} and ${p2Label}.`,
    outcomeStr(outcome, p1, p2, actionCount),
    ...stateStr(gs),
  ]
    .filter(Boolean)
    .join(' ');
}
