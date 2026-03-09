const K_FACTOR = 32;
const BASELINE = 1000;

export interface MatchResult {
  opponentElo: number;
  win: boolean;
}

/** Expected score: probability of winning given rating gap. */
export function computeExpected(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/** New rating after a single match. */
export function computeNewRating(
  playerElo: number,
  opponentElo: number,
  win: boolean,
  k: number = K_FACTOR,
): number {
  const expected = computeExpected(playerElo, opponentElo);
  const score = win ? 1 : 0;
  return Math.round(playerElo + k * (score - expected));
}

/** Compute rolling Elo from a chronological list of match results. */
export function computeRollingElo(
  matches: MatchResult[],
  baseline: number = BASELINE,
  k: number = K_FACTOR,
): number {
  let elo = baseline;
  for (const match of matches) {
    elo = computeNewRating(elo, match.opponentElo, match.win, k);
  }
  return elo;
}

export const ELO_CONSTANTS = { K_FACTOR, BASELINE } as const;
