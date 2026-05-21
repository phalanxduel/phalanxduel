import { computeExpected, ELO_CONSTANTS } from './elo.js';

export interface LadderSimulationPlayer {
  id: string;
  name: string;
  latentSkill: number;
  rating: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  ratingHistory: number[];
}

export interface LadderSimulatedMatch {
  index: number;
  playerA: string;
  playerB: string;
  ratingBeforeA: number;
  ratingBeforeB: number;
  ratingAfterA: number;
  ratingAfterB: number;
  outcome: 'a-win' | 'b-win' | 'draw';
  expectedA: number;
  latentWinProbabilityA: number;
}

export interface LadderSimulationConfig {
  seed: number;
  players: number;
  matches: number;
  topN: number;
  kFactor: number;
}

export interface LadderSimulationReport {
  generatedAt: string;
  config: LadderSimulationConfig;
  metrics: {
    ratingSkillSpearman: number;
    topNOverlap: number;
    averageGames: number;
    minGames: number;
    maxGames: number;
    averageRecentVolatility: number;
    largestRatingGain: number;
    largestRatingLoss: number;
  };
  standings: Array<{
    rank: number;
    skillRank: number;
    id: string;
    name: string;
    latentSkill: number;
    rating: number;
    games: number;
    wins: number;
    losses: number;
    draws: number;
  }>;
  matches: LadderSimulatedMatch[];
}

export const DEFAULT_LADDER_SIMULATION_CONFIG: LadderSimulationConfig = {
  seed: 20260521,
  players: 24,
  matches: 240,
  topN: 3,
  kFactor: ELO_CONSTANTS.K_FACTOR,
};

export function roundSimulationMetric(value: number, decimals = 2): number {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulateLadderSeason(
  config: LadderSimulationConfig = DEFAULT_LADDER_SIMULATION_CONFIG,
): LadderSimulationReport {
  const rng = createSeededRng(config.seed);
  const players = buildPopulation(config, rng);
  const matches: LadderSimulatedMatch[] = [];

  for (let index = 0; index < config.matches; index += 1) {
    const [indexA, indexB] = chooseDistinctPair(rng, players.length);
    const playerA = players[indexA]!;
    const playerB = players[indexB]!;
    const ratingBeforeA = playerA.rating;
    const ratingBeforeB = playerB.rating;
    const expectedA = computeExpected(ratingBeforeA, ratingBeforeB);
    const latentProbabilityA = latentWinProbability(playerA, playerB);
    const roll = rng();
    const drawRoll = rng();
    const drawChance = 0.04;
    const outcome = drawRoll < drawChance ? 'draw' : roll < latentProbabilityA ? 'a-win' : 'b-win';
    const { ratingAfterA, ratingAfterB } = applyResult(playerA, playerB, outcome, config.kFactor);

    matches.push({
      index: index + 1,
      playerA: playerA.id,
      playerB: playerB.id,
      ratingBeforeA,
      ratingBeforeB,
      ratingAfterA,
      ratingAfterB,
      outcome,
      expectedA: roundSimulationMetric(expectedA, 4),
      latentWinProbabilityA: roundSimulationMetric(latentProbabilityA, 4),
    });
  }

  return buildReport(config, players, matches);
}

function chooseDistinctPair(rng: () => number, count: number): [number, number] {
  const first = Math.floor(rng() * count);
  let second = Math.floor(rng() * (count - 1));
  if (second >= first) second += 1;
  return [first, second];
}

function latentWinProbability(
  playerA: Pick<LadderSimulationPlayer, 'latentSkill'>,
  playerB: Pick<LadderSimulationPlayer, 'latentSkill'>,
): number {
  return 1 / (1 + 10 ** ((playerB.latentSkill - playerA.latentSkill) / 400));
}

function nextRating(current: number, opponent: number, score: number, kFactor: number): number {
  const expected = computeExpected(current, opponent);
  return Math.round(current + kFactor * (score - expected));
}

function buildPopulation(
  config: LadderSimulationConfig,
  rng: () => number,
): LadderSimulationPlayer[] {
  return Array.from({ length: config.players }, (_, index) => {
    const centralLimitNoise = Array.from({ length: 6 }, () => rng()).reduce(
      (sum, value) => sum + value,
      0,
    );
    const latentSkill = Math.round(1000 + (centralLimitNoise - 3) * 180);
    return {
      id: `ladder-player-${String(index + 1).padStart(3, '0')}`,
      name: `Ladder Player ${String(index + 1).padStart(2, '0')}`,
      latentSkill,
      rating: ELO_CONSTANTS.BASELINE,
      games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      ratingHistory: [ELO_CONSTANTS.BASELINE],
    };
  });
}

function applyResult(
  playerA: LadderSimulationPlayer,
  playerB: LadderSimulationPlayer,
  outcome: LadderSimulatedMatch['outcome'],
  kFactor: number,
): Pick<LadderSimulatedMatch, 'ratingAfterA' | 'ratingAfterB'> {
  const scoreA = outcome === 'a-win' ? 1 : outcome === 'draw' ? 0.5 : 0;
  const scoreB = 1 - scoreA;
  const ratingAfterA = nextRating(playerA.rating, playerB.rating, scoreA, kFactor);
  const ratingAfterB = nextRating(playerB.rating, playerA.rating, scoreB, kFactor);

  playerA.rating = ratingAfterA;
  playerB.rating = ratingAfterB;
  playerA.games += 1;
  playerB.games += 1;
  playerA.wins += outcome === 'a-win' ? 1 : 0;
  playerA.losses += outcome === 'b-win' ? 1 : 0;
  playerA.draws += outcome === 'draw' ? 1 : 0;
  playerB.wins += outcome === 'b-win' ? 1 : 0;
  playerB.losses += outcome === 'a-win' ? 1 : 0;
  playerB.draws += outcome === 'draw' ? 1 : 0;
  playerA.ratingHistory.push(ratingAfterA);
  playerB.ratingHistory.push(ratingAfterB);

  return { ratingAfterA, ratingAfterB };
}

function rankBy<T>(items: T[], value: (item: T) => number, descending = true): Map<T, number> {
  const sorted = [...items].sort((left, right) =>
    descending ? value(right) - value(left) : value(left) - value(right),
  );
  return new Map(sorted.map((item, index) => [item, index + 1]));
}

function pearson(xs: number[], ys: number[]): number {
  const count = xs.length;
  const meanX = average(xs);
  const meanY = average(ys);
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  for (let index = 0; index < count; index += 1) {
    const dx = xs[index]! - meanX;
    const dy = ys[index]! - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  const denominator = Math.sqrt(denomX * denomY);
  return denominator === 0 ? 0 : numerator / denominator;
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function recentVolatility(player: LadderSimulationPlayer): number {
  const history = player.ratingHistory.slice(-11);
  const deltas: number[] = [];
  for (let index = 1; index < history.length; index += 1) {
    deltas.push(Math.abs(history[index]! - history[index - 1]!));
  }
  return average(deltas);
}

function buildReport(
  config: LadderSimulationConfig,
  players: LadderSimulationPlayer[],
  matches: LadderSimulatedMatch[],
): LadderSimulationReport {
  const skillRanks = rankBy(players, (player) => player.latentSkill);
  const ratingRanks = rankBy(players, (player) => player.rating);
  const ratingRankValues = players.map((player) => ratingRanks.get(player)!);
  const skillRankValues = players.map((player) => skillRanks.get(player)!);
  const topByRating = new Set(
    [...players]
      .sort((left, right) => right.rating - left.rating)
      .slice(0, config.topN)
      .map((player) => player.id),
  );
  const topBySkill = new Set(
    [...players]
      .sort((left, right) => right.latentSkill - left.latentSkill)
      .slice(0, config.topN)
      .map((player) => player.id),
  );
  const topNOverlap =
    [...topByRating].filter((playerId) => topBySkill.has(playerId)).length / config.topN;
  const gains = players.map((player) => player.rating - ELO_CONSTANTS.BASELINE);

  return {
    generatedAt: new Date(0).toISOString(),
    config,
    metrics: {
      ratingSkillSpearman: roundSimulationMetric(pearson(ratingRankValues, skillRankValues), 4),
      topNOverlap: roundSimulationMetric(topNOverlap, 4),
      averageGames: roundSimulationMetric(average(players.map((player) => player.games)), 2),
      minGames: Math.min(...players.map((player) => player.games)),
      maxGames: Math.max(...players.map((player) => player.games)),
      averageRecentVolatility: roundSimulationMetric(average(players.map(recentVolatility)), 2),
      largestRatingGain: Math.max(...gains),
      largestRatingLoss: Math.min(...gains),
    },
    standings: [...players]
      .sort((left, right) => right.rating - left.rating)
      .map((player, index) => ({
        rank: index + 1,
        skillRank: skillRanks.get(player)!,
        id: player.id,
        name: player.name,
        latentSkill: player.latentSkill,
        rating: player.rating,
        games: player.games,
        wins: player.wins,
        losses: player.losses,
        draws: player.draws,
      })),
    matches,
  };
}
