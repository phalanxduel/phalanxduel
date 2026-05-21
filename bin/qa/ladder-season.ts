#!/usr/bin/env tsx
/**
 * Deterministic ladder season simulator.
 *
 * This is a fast, offline exercise for ranking depth. It does not mutate the
 * product database; it generates a synthetic population with latent skill,
 * plays a fixed-seed season, updates Elo with the server rating constants, and
 * writes evidence artifacts for review.
 */

import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { openHistoryView } from './ladder-view.ts';
import {
  DEFAULT_LADDER_SIMULATION_CONFIG,
  compareLadderPolicies,
  simulateLadderSeason,
  type LadderPolicyComparison,
  type LadderSimulationConfig,
  type LadderSimulationReport,
} from '../../server/src/ladder-simulation.ts';

type LadderSeasonCliReport = LadderSimulationReport & {
  shadowPolicies?: LadderPolicyComparison[];
};

interface HistoryRow {
  timestamp: string;
  sha: string;
  seed: number;
  players: number;
  matches: number;
  kFactor: number;
  label: string;
  spearman: number;
  topNOverlap: number;
}

const DEFAULT_OUT_DIR = 'artifacts/ladder';
const DEFAULT_REPORT_NAME = 'ladder-season';
const DEFAULT_HISTORY_DIR = 'docs/quality';
const DEFAULT_HISTORY_NAME = 'ladder-history';
const DEFAULT_MIN_CORRELATION = 0.72;
const DEFAULT_MIN_TOP_N_OVERLAP = 0.5;

function usage(): void {
  console.log(`Usage: tsx bin/qa/ladder-season.ts [OPTIONS]

Options:
  --seed NUMBER                 Deterministic RNG seed (default: ${DEFAULT_LADDER_SIMULATION_CONFIG.seed})
  --seeds RANGE                 Run multiple seeds: START:END (inclusive) or comma list, e.g. 20260521:20260530
  --players NUMBER              Synthetic player count, minimum 4 (default: ${DEFAULT_LADDER_SIMULATION_CONFIG.players})
  --matches NUMBER              Season match count (default: ${DEFAULT_LADDER_SIMULATION_CONFIG.matches})
  --top-n NUMBER                Top-N overlap size (default: top decile, minimum 3)
  --out-dir PATH                Artifact directory (default: ${DEFAULT_OUT_DIR})
  --report-name NAME            Report basename (default: ${DEFAULT_REPORT_NAME})
  --shadow-k-factors LIST       Comma-separated K-factors for shadow comparison
  --history-dir PATH            Directory for history JSONL/MD/JSON (default: ${DEFAULT_HISTORY_DIR})
  --history-name NAME           History file basename (default: ${DEFAULT_HISTORY_NAME})
  --no-history                  Skip appending to the history log
  --view                        Open chart in browser after writing history
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

function toSeedList(value: string | undefined, fallback: number): number[] {
  if (!value) return [fallback];
  const range = /^(\d+):(\d+)$/.exec(value);
  if (range) {
    const lo = Math.min(Number.parseInt(range[1], 10), Number.parseInt(range[2], 10));
    const hi = Math.max(Number.parseInt(range[1], 10), Number.parseInt(range[2], 10));
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  }
  return value
    .split(',')
    .map((v) => Number.parseInt(v.trim(), 10))
    .filter((v) => Number.isFinite(v) && v > 0);
}

function toIntList(value: string | undefined): number[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => Number.parseInt(entry.trim(), 10))
    .filter((entry) => Number.isFinite(entry) && entry > 0);
}

function getGitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function buildHistoryRows(report: LadderSeasonCliReport, sha: string): HistoryRow[] {
  const timestamp = new Date().toISOString();
  const base: HistoryRow = {
    timestamp,
    sha,
    seed: report.config.seed,
    players: report.config.players,
    matches: report.config.matches,
    kFactor: report.config.kFactor,
    label: 'production',
    spearman: report.metrics.ratingSkillSpearman,
    topNOverlap: report.metrics.topNOverlap,
  };
  const shadows: HistoryRow[] = (report.shadowPolicies ?? []).map((policy) => ({
    timestamp,
    sha,
    seed: report.config.seed,
    players: report.config.players,
    matches: report.config.matches,
    kFactor: policy.kFactor,
    label: policy.label,
    spearman: policy.metrics.ratingSkillSpearman,
    topNOverlap: policy.metrics.topNOverlap,
  }));
  return [base, ...shadows];
}

function renderHistoryMarkdown(rows: HistoryRow[]): string {
  if (rows.length === 0) return '# Ladder Simulation History\n\nNo runs recorded yet.\n';
  const tableRows = rows
    .slice()
    .reverse()
    .map((r) => {
      const date = r.timestamp.slice(0, 10);
      return `| ${date} | ${r.sha} | ${r.seed} | ${r.players} | ${r.matches} | ${r.kFactor} | ${r.label} | ${r.spearman} | ${r.topNOverlap} |`;
    })
    .join('\n');
  return `# Ladder Simulation History

Each row is one simulation run. Shadow policies share a timestamp with their
production baseline. Regenerated automatically by \`pnpm qa:ladder:simulate\`.

| Date | Commit | Seed | Players | Matches | K | Label | Spearman | Top-N |
| --- | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |
${tableRows}
`;
}

async function appendHistory(
  rows: HistoryRow[],
  historyDir: string,
  historyName: string,
): Promise<{ jsonlPath: string; mdPath: string; jsonPath: string }> {
  await mkdir(historyDir, { recursive: true });
  const jsonlPath = join(historyDir, `${historyName}.jsonl`);
  const mdPath = join(historyDir, `${historyName}.md`);
  const jsonPath = join(historyDir, `${historyName}.json`);

  const newLines = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
  await appendFile(jsonlPath, newLines, 'utf8');

  const raw = await readFile(jsonlPath, 'utf8');
  const allRows: HistoryRow[] = raw
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as HistoryRow);

  await writeFile(mdPath, renderHistoryMarkdown(allRows));
  await writeFile(jsonPath, `${JSON.stringify(allRows, null, 2)}\n`);

  return { jsonlPath, mdPath, jsonPath };
}

function renderShadowPolicies(policies: LadderPolicyComparison[]): string {
  if (policies.length === 0) return '';
  const rows = policies
    .map((policy) => {
      const leader = policy.topStanding?.name ?? 'n/a';
      const leaderRating = policy.topStanding?.rating ?? 'n/a';
      return `| ${policy.label} | ${policy.metrics.ratingSkillSpearman} | ${policy.metrics.topNOverlap} | ${leader} | ${leaderRating} | ${policy.topNPlayerIds.join(', ')} |`;
    })
    .join('\n');

  return `

## Shadow Policy Comparison

| Policy | Rating-to-skill Spearman | Top-N overlap | Leader | Leader rating | Top-N players |
| --- | ---: | ---: | --- | ---: | --- |
${rows}`;
}

function renderMarkdown(report: LadderSeasonCliReport): string {
  const topRows = report.standings
    .slice(0, 10)
    .map(
      (player) =>
        `| ${player.rank} | ${player.skillRank} | ${player.name} | ${player.rating} | ${player.latentSkill} | ${player.games} | ${player.wins}-${player.losses}-${player.draws} |`,
    )
    .join('\n');
  const shadowPolicies = renderShadowPolicies(report.shadowPolicies ?? []);

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
${topRows}${shadowPolicies}
`;
}

async function writeArtifacts(
  report: LadderSeasonCliReport,
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
    args: process.argv.slice(2).filter((arg) => arg !== '--'),
    options: {
      seed: { type: 'string' },
      seeds: { type: 'string' },
      players: { type: 'string' },
      matches: { type: 'string' },
      'top-n': { type: 'string' },
      'out-dir': { type: 'string', default: DEFAULT_OUT_DIR },
      'report-name': { type: 'string', default: DEFAULT_REPORT_NAME },
      'shadow-k-factors': { type: 'string' },
      'history-dir': { type: 'string', default: DEFAULT_HISTORY_DIR },
      'history-name': { type: 'string', default: DEFAULT_HISTORY_NAME },
      'no-history': { type: 'boolean', default: false },
      view: { type: 'boolean', default: false },
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

  const players = Math.max(4, toInt(values.players, DEFAULT_LADDER_SIMULATION_CONFIG.players));
  const baseConfig = {
    players,
    matches: Math.max(1, toInt(values.matches, DEFAULT_LADDER_SIMULATION_CONFIG.matches)),
    topN: Math.max(3, Math.min(players, toInt(values['top-n'], Math.ceil(players / 10)))),
    kFactor: DEFAULT_LADDER_SIMULATION_CONFIG.kFactor,
  };
  const minCorrelation = toFloat(values['min-correlation'], DEFAULT_MIN_CORRELATION);
  const minTopNOverlap = toFloat(values['min-top-n-overlap'], DEFAULT_MIN_TOP_N_OVERLAP);
  const shadowKFactors = toIntList(values['shadow-k-factors']);

  const defaultSeed = toInt(values.seed, DEFAULT_LADDER_SIMULATION_CONFIG.seed);
  const seedList = toSeedList(values.seeds, defaultSeed);
  const isBatch = seedList.length > 1;

  if (isBatch) {
    console.log(
      `Running ${seedList.length} seeds: ${seedList[0]}…${seedList[seedList.length - 1]}`,
    );
  }

  const sha = getGitSha();
  const allHistoryRows: HistoryRow[] = [];
  let lastReport: LadderSeasonCliReport | undefined;
  let lastConfig: LadderSimulationConfig | undefined;

  for (const seed of seedList) {
    const config: LadderSimulationConfig = { ...baseConfig, seed };
    const report = simulateLadderSeason(config);
    const reportWithShadow: LadderSeasonCliReport = {
      ...report,
      ...(shadowKFactors.length > 0
        ? { shadowPolicies: compareLadderPolicies(config, shadowKFactors) }
        : {}),
    };
    allHistoryRows.push(...buildHistoryRows(reportWithShadow, sha));
    lastReport = reportWithShadow;
    lastConfig = config;
    if (isBatch) {
      process.stdout.write(
        `seed=${seed} spearman=${report.metrics.ratingSkillSpearman} topN=${report.metrics.topNOverlap}\n`,
      );
    }
  }

  if (!lastReport || !lastConfig) return;

  const { jsonPath, markdownPath } = await writeArtifacts(
    lastReport,
    values['out-dir'] ?? DEFAULT_OUT_DIR,
    values['report-name'] ?? DEFAULT_REPORT_NAME,
  );

  const writeHistory = !values.verify && !values['no-history'];
  let historyPaths: { jsonlPath: string; mdPath: string; jsonPath: string } | undefined;
  if (writeHistory) {
    historyPaths = await appendHistory(
      allHistoryRows,
      values['history-dir'] ?? DEFAULT_HISTORY_DIR,
      values['history-name'] ?? DEFAULT_HISTORY_NAME,
    );
  }

  if (!isBatch) {
    console.log('Ladder season simulation complete');
    console.log(
      `seed=${lastConfig.seed} players=${lastConfig.players} matches=${lastConfig.matches}`,
    );
    console.log(`ratingSkillSpearman=${lastReport.metrics.ratingSkillSpearman}`);
    console.log(`topNOverlap=${lastReport.metrics.topNOverlap}`);
  } else {
    console.log(`Batch complete: ${seedList.length} runs written to history`);
  }
  console.log(`json=${jsonPath}`);
  console.log(`markdown=${markdownPath}`);

  if (historyPaths) {
    console.log(`history=${historyPaths.jsonlPath}`);
    if (values.view) {
      const viewPath = await openHistoryView(
        historyPaths.jsonPath,
        values['out-dir'] ?? DEFAULT_OUT_DIR,
      );
      console.log(`view=${viewPath}`);
    }
  }
  if (shadowKFactors.length > 0 && lastReport.shadowPolicies) {
    for (const policy of lastReport.shadowPolicies) {
      console.log(`${policy.label} spearman: ${policy.metrics.ratingSkillSpearman}`);
    }
  }

  if (values.verify) {
    const failures: string[] = [];
    if (lastReport.metrics.ratingSkillSpearman < minCorrelation) {
      failures.push(
        `ratingSkillSpearman ${lastReport.metrics.ratingSkillSpearman} < ${minCorrelation}`,
      );
    }
    if (lastReport.metrics.topNOverlap < minTopNOverlap) {
      failures.push(`topNOverlap ${lastReport.metrics.topNOverlap} < ${minTopNOverlap}`);
    }
    if (failures.length > 0) {
      console.error(`Ladder simulation verification failed: ${failures.join('; ')}`);
      process.exitCode = 1;
    }
  }
}

try {
  await main();
} catch (err) {
  if (err instanceof Error && err.message.includes('Unknown option')) {
    console.error(`${err.message}\nRun with --help for usage.`);
    process.exitCode = 1;
  } else {
    throw err;
  }
}
