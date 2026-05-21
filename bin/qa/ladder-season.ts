#!/usr/bin/env tsx
/**
 * Deterministic ladder season simulator.
 *
 * This is a fast, offline exercise for ranking depth. It does not mutate the
 * product database; it generates a synthetic population with latent skill,
 * plays a fixed-seed season, updates Elo with the server rating constants, and
 * writes evidence artifacts for review.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { computeExpected, ELO_CONSTANTS } from '../../server/src/elo.ts';

interface PlayerState {
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

interface SimulatedMatch {
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

interface SimulationConfig {
  seed: number;
  players: number;
  matches: number;
  topN: number;
  kFactor: number;
}

interface SimulationReport {
  generatedAt: string;
  config: SimulationConfig;
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
  matches: SimulatedMatch[];
}

const DEFAULT_SEED = 20260521;
const DEFAULT_PLAYERS = 24;
const DEFAULT_MATCHES = 240;
const DEFAULT_OUT_DIR = 'artifacts/ladder';
const DEFAULT_REPORT_NAME = 'ladder-season';
const DEFAULT_MIN_CORRELATION = 0.72;
const DEFAULT_MIN_TOP_N_OVERLAP = 0.5;

function usage(): void {
  console.log(`Usage: tsx bin/qa/ladder-season.ts [OPTIONS]

Options:
  --seed NUMBER                 Deterministic RNG seed (default: ${DEFAULT_SEED})
  --players NUMBER              Synthetic player count, minimum 4 (default: ${DEFAULT_PLAYERS})
  --matches NUMBER              Season match count (default: ${DEFAULT_MATCHES})
  --top-n NUMBER                Top-N overlap size (default: top decile, minimum 3)
  --out-dir PATH                Artifact directory (default: ${DEFAULT_OUT_DIR})
  --report-name NAME            Report basename (default: ${DEFAULT_REPORT_NAME})
  --verify                      Fail when baseline quality thresholds are missed
  --min-correlation NUMBER      Spearman threshold for --verify (default: ${DEFAULT_MIN_CORRELATION})
  --min-top-n-overlap NUMBER    Top-N overlap threshold for --verify (default: ${DEFAULT_MIN_TOP_N_OVERLAP})
  --help                        Show this help
`);
}

function toInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toFloat(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function chooseDistinctPair(rng: () => number, count: number): [number, number] {
  const first = Math.floor(rng() * count);
  let second = Math.floor(rng() * (count - 1));
  if (second >= first) second += 1;
  return [first, second];
}

function latentWinProbability(playerA: PlayerState, playerB: PlayerState): number {
  return 1 / (1 + 10 ** ((playerB.latentSkill - playerA.latentSkill) / 400));
}

function nextRating(current: number, opponent: number, score: number, kFactor: number): number {
  const expected = computeExpected(current, opponent);
  return Math.round(current + kFactor * (score - expected));
}

function buildPopulation(config: SimulationConfig, rng: () => number): PlayerState[] {
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
  playerA: PlayerState,
  playerB: PlayerState,
  outcome: SimulatedMatch['outcome'],
  kFactor: number,
): Pick<SimulatedMatch, 'ratingAfterA' | 'ratingAfterB'> {
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

function simulateSeason(config: SimulationConfig): SimulationReport {
  const rng = createRng(config.seed);
  const players = buildPopulation(config, rng);
  const matches: SimulatedMatch[] = [];

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
      expectedA: round(expectedA, 4),
      latentWinProbabilityA: round(latentProbabilityA, 4),
    });
  }

  return buildReport(config, players, matches);
}

function rankBy<T>(items: T[], value: (item: T) => number, descending = true): Map<T, number> {
  const sorted = [...items].sort((left, right) =>
    descending ? value(right) - value(left) : value(left) - value(right),
  );
  return new Map(sorted.map((item, index) => [item, index + 1]));
}

function pearson(xs: number[], ys: number[]): number {
  const count = xs.length;
  const meanX = xs.reduce((sum, value) => sum + value, 0) / count;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / count;
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

function round(value: number, decimals = 2): number {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

function recentVolatility(player: PlayerState): number {
  const history = player.ratingHistory.slice(-11);
  const deltas: number[] = [];
  for (let index = 1; index < history.length; index += 1) {
    deltas.push(Math.abs(history[index]! - history[index - 1]!));
  }
  return average(deltas);
}

function buildReport(
  config: SimulationConfig,
  players: PlayerState[],
  matches: SimulatedMatch[],
): SimulationReport {
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
      ratingSkillSpearman: round(pearson(ratingRankValues, skillRankValues), 4),
      topNOverlap: round(topNOverlap, 4),
      averageGames: round(average(players.map((player) => player.games)), 2),
      minGames: Math.min(...players.map((player) => player.games)),
      maxGames: Math.max(...players.map((player) => player.games)),
      averageRecentVolatility: round(average(players.map(recentVolatility)), 2),
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

function renderMarkdown(report: SimulationReport): string {
  const topRows = report.standings
    .slice(0, 10)
    .map(
      (player) =>
        `| ${player.rank} | ${player.skillRank} | ${player.name} | ${player.rating} | ${player.latentSkill} | ${player.games} | ${player.wins}-${player.losses}-${player.draws} |`,
    )
    .join('\n');

  return `# Ladder Season Simulation

Generated from a deterministic synthetic season. This report is an offline
ranking-depth exercise; it does not mutate product data.

## Configuration

| Field | Value |
| --- | ---: |
| Seed | ${report.config.seed} |
| Players | ${report.config.players} |
| Matches | ${report.config.matches} |
| Top-N window | ${report.config.topN} |
| Elo K-factor | ${report.config.kFactor} |

## Metrics

| Metric | Value |
| --- | ---: |
| Rating-to-skill Spearman correlation | ${report.metrics.ratingSkillSpearman} |
| Top-N overlap | ${report.metrics.topNOverlap} |
| Average games per player | ${report.metrics.averageGames} |
| Min games | ${report.metrics.minGames} |
| Max games | ${report.metrics.maxGames} |
| Average recent rating volatility | ${report.metrics.averageRecentVolatility} |
| Largest rating gain | ${report.metrics.largestRatingGain} |
| Largest rating loss | ${report.metrics.largestRatingLoss} |

## Top Standings

| Rank | Skill Rank | Player | Rating | Latent Skill | Games | W-L-D |
| ---: | ---: | --- | ---: | ---: | ---: | ---: |
${topRows}
`;
}

async function writeArtifacts(
  report: SimulationReport,
  outDir: string,
  reportName: string,
): Promise<{ jsonPath: string; markdownPath: string }> {
  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, `${reportName}.json`);
  const markdownPath = join(outDir, `${reportName}.md`);
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(markdownPath, renderMarkdown(report));
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      seed: { type: 'string' },
      players: { type: 'string' },
      matches: { type: 'string' },
      'top-n': { type: 'string' },
      'out-dir': { type: 'string', default: DEFAULT_OUT_DIR },
      'report-name': { type: 'string', default: DEFAULT_REPORT_NAME },
      verify: { type: 'boolean', default: false },
      'min-correlation': { type: 'string' },
      'min-top-n-overlap': { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) {
    usage();
    return;
  }

  const players = Math.max(4, toInt(values.players, DEFAULT_PLAYERS));
  const matches = Math.max(1, toInt(values.matches, DEFAULT_MATCHES));
  const config: SimulationConfig = {
    seed: toInt(values.seed, DEFAULT_SEED),
    players,
    matches,
    topN: Math.max(3, Math.min(players, toInt(values['top-n'], Math.ceil(players / 10)))),
    kFactor: ELO_CONSTANTS.K_FACTOR,
  };
  const minCorrelation = toFloat(values['min-correlation'], DEFAULT_MIN_CORRELATION);
  const minTopNOverlap = toFloat(values['min-top-n-overlap'], DEFAULT_MIN_TOP_N_OVERLAP);

  const report = simulateSeason(config);
  const { jsonPath, markdownPath } = await writeArtifacts(
    report,
    values['out-dir'] ?? DEFAULT_OUT_DIR,
    values['report-name'] ?? DEFAULT_REPORT_NAME,
  );

  console.log('Ladder season simulation complete');
  console.log(`seed=${config.seed} players=${config.players} matches=${config.matches}`);
  console.log(`ratingSkillSpearman=${report.metrics.ratingSkillSpearman}`);
  console.log(`topNOverlap=${report.metrics.topNOverlap}`);
  console.log(`json=${jsonPath}`);
  console.log(`markdown=${markdownPath}`);

  if (values.verify) {
    const failures: string[] = [];
    if (report.metrics.ratingSkillSpearman < minCorrelation) {
      failures.push(
        `ratingSkillSpearman ${report.metrics.ratingSkillSpearman} < ${minCorrelation}`,
      );
    }
    if (report.metrics.topNOverlap < minTopNOverlap) {
      failures.push(`topNOverlap ${report.metrics.topNOverlap} < ${minTopNOverlap}`);
    }
    if (failures.length > 0) {
      console.error(`Ladder simulation verification failed: ${failures.join('; ')}`);
      process.exitCode = 1;
    }
  }
}

await main();
