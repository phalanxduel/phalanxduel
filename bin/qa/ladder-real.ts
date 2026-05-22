#!/usr/bin/env tsx
/**
 * Fetch the live ladder leaderboard and compute the same quality metrics
 * as the ladder season simulation, using win_rate as a skill proxy.
 *
 * Simulation uses latent_skill (ground truth). Production uses win_rate
 * (observable proxy). Both produce a Spearman rank correlation with Elo.
 * The two are comparable but not equivalent — see notes in the report.
 *
 * Usage:
 *   pnpm qa:ladder:real
 *   pnpm qa:ladder:real -- --server-url http://localhost:3000 --category pvp
 *   pnpm qa:ladder:real -- --history   # append row to ladder-history.jsonl
 */

import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const DEFAULT_SERVER_URL = process.env.GAME_SERVER_URL ?? 'http://localhost:3000';
const DEFAULT_CATEGORY = 'pvp';
const DEFAULT_MIN_GAMES = 3;
const DEFAULT_OUT_DIR = 'artifacts/ladder';
const DEFAULT_REPORT_NAME = 'ladder-real';
const DEFAULT_HISTORY_DIR = 'docs/quality';
const DEFAULT_HISTORY_NAME = 'ladder-history';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeaderboardEntry {
  rank: number;
  userId: string;
  gamertag: string;
  elo: number;
  matches: number;
  wins: number;
}

interface LeaderboardResponse {
  category: string;
  windowDays: number;
  limit: number;
  offset: number;
  rankings: LeaderboardEntry[];
}

interface PlayerStanding {
  eloRank: number;
  winRateRank: number;
  delta: number;
  gamertag: string;
  elo: number;
  winRate: number;
  matches: number;
  wins: number;
}

interface RealLadderMetrics {
  eloWinRateSpearman: number;
  topNOverlap: number;
  averageGames: number;
  minGames: number;
  maxGames: number;
  activePlayers: number;
  filteredBelowMinGames: number;
}

interface RealLadderReport {
  source: 'production';
  fetchedAt: string;
  serverUrl: string;
  category: string;
  windowDays: number;
  skillProxy: 'win_rate';
  config: {
    minGames: number;
    topN: number;
    limit: number;
  };
  metrics: RealLadderMetrics;
  standings: PlayerStanding[];
  notes: string[];
}

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

// ---------------------------------------------------------------------------
// Stats helpers
// ---------------------------------------------------------------------------

function toRanks(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => b.v - a.v);
  const ranks = new Array<number>(values.length);
  indexed.forEach(({ i }, ri) => {
    ranks[i] = ri + 1;
  });
  return ranks;
}

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  const num = xs.reduce((s, v, i) => s + (v - mx) * (ys[i] - my), 0);
  const dx = Math.sqrt(xs.reduce((s, v) => s + (v - mx) ** 2, 0));
  const dy = Math.sqrt(ys.reduce((s, v) => s + (v - my) ** 2, 0));
  return dx * dy === 0 ? 0 : num / (dx * dy);
}

function spearmanRank(xs: number[], ys: number[]): number {
  return pearsonCorrelation(toRanks(xs), toRanks(ys));
}

function computeTopNOverlap(entries: LeaderboardEntry[], topN: number): number {
  const byElo = [...entries].sort((a, b) => b.elo - a.elo).slice(0, topN);
  const byWinRate = [...entries]
    .sort((a, b) => b.wins / b.matches - a.wins / a.matches)
    .slice(0, topN);
  const topEloIds = new Set(byElo.map((e) => e.userId));
  let overlap = 0;
  for (const e of byWinRate) {
    if (topEloIds.has(e.userId)) overlap++;
  }
  return overlap / topN;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchLeaderboard(
  serverUrl: string,
  category: string,
  limit: number,
  token?: string,
): Promise<LeaderboardResponse> {
  const url = `${serverUrl}/api/ladder/${category}?limit=${limit}&offset=0`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Leaderboard fetch failed: ${res.status} ${res.statusText} (${url})`);
  }
  return res.json() as Promise<LeaderboardResponse>;
}

// ---------------------------------------------------------------------------
// Compute
// ---------------------------------------------------------------------------

function computeReport(
  raw: LeaderboardResponse,
  minGames: number,
  topN: number,
  serverUrl: string,
): RealLadderReport {
  const all = raw.rankings;
  const filtered = all.filter((e) => e.matches >= minGames);
  const notes: string[] = [];

  if (filtered.length < 4) {
    notes.push(
      `Only ${filtered.length} players have ≥${minGames} games. Metrics unreliable — lower --min-games or wait for more activity.`,
    );
  }

  const effectiveTopN = Math.max(1, Math.min(filtered.length, topN));
  const eloValues = filtered.map((e) => e.elo);
  const winRateValues = filtered.map((e) => (e.matches > 0 ? e.wins / e.matches : 0));

  const eloRanks = toRanks(eloValues);
  const winRateRanks = toRanks(winRateValues);

  const spearman = round4(spearmanRank(eloValues, winRateValues));
  const overlap = round4(computeTopNOverlap(filtered, effectiveTopN));

  const games = filtered.map((e) => e.matches);
  const avgGames =
    games.length > 0 ? Math.round(games.reduce((s, v) => s + v, 0) / games.length) : 0;

  const standings: PlayerStanding[] = filtered.map((e, i) => ({
    eloRank: eloRanks[i],
    winRateRank: winRateRanks[i],
    delta: eloRanks[i] - winRateRanks[i],
    gamertag: e.gamertag,
    elo: e.elo,
    winRate: round4(e.matches > 0 ? e.wins / e.matches : 0),
    matches: e.matches,
    wins: e.wins,
  }));
  standings.sort((a, b) => a.eloRank - b.eloRank);

  if (filtered.length < all.length) {
    notes.push(
      `${all.length - filtered.length} players excluded for having fewer than ${minGames} games in the window.`,
    );
  }

  notes.push(
    'win_rate is a noisy skill proxy: it reflects results in the current window only, not long-term ability.',
  );
  notes.push(
    'Simulation Spearman uses ground-truth latent skill; this metric uses win_rate. Lower values here are expected and do not indicate a regression.',
  );

  return {
    source: 'production',
    fetchedAt: new Date().toISOString(),
    serverUrl,
    category: raw.category,
    windowDays: raw.windowDays,
    skillProxy: 'win_rate',
    config: { minGames, topN: effectiveTopN, limit: raw.limit },
    metrics: {
      eloWinRateSpearman: spearman,
      topNOverlap: overlap,
      averageGames: avgGames,
      minGames: games.length > 0 ? Math.min(...games) : 0,
      maxGames: games.length > 0 ? Math.max(...games) : 0,
      activePlayers: filtered.length,
      filteredBelowMinGames: all.length - filtered.length,
    },
    standings,
    notes,
  };
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderMarkdown(report: RealLadderReport): string {
  const topRows = report.standings
    .slice(0, 12)
    .map((p) => {
      const d = p.delta === 0 ? '—' : p.delta > 0 ? `▼${p.delta}` : `▲${Math.abs(p.delta)}`;
      return `| ${p.eloRank} | ${p.winRateRank} | ${d} | ${p.gamertag} | ${p.elo} | ${(p.winRate * 100).toFixed(1)}% | ${p.matches} |`;
    })
    .join('\n');

  const noteLines = report.notes.map((n) => `- ${n}`).join('\n');

  return `# Ladder Real-Data Comparison

Fetched from \`${report.serverUrl}\` at ${report.fetchedAt.slice(0, 19).replace('T', ' ')}.
Skill proxy: **win_rate** (wins ÷ matches in window). Not ground-truth latent skill.

## Configuration

| Field | Value |
| --- | ---: |
| Category | ${report.category} |
| Window | ${report.windowDays} days |
| Active players (≥${report.config.minGames} games) | ${report.metrics.activePlayers} |
| Excluded (below min games) | ${report.metrics.filteredBelowMinGames} |
| Top-N window | ${report.config.topN} |

## Metrics

| Metric | Value |
| --- | ---: |
| Elo-to-win_rate Spearman | ${report.metrics.eloWinRateSpearman} |
| Top-N overlap | ${report.metrics.topNOverlap} |
| Avg games per player | ${report.metrics.averageGames} |
| Min games | ${report.metrics.minGames} |
| Max games | ${report.metrics.maxGames} |

## Standings (top 12 by Elo, Δ = elo_rank − win_rate_rank)

| Elo rank | WR rank | Δ | Player | Elo | Win rate | Games |
| ---: | ---: | --- | --- | ---: | ---: | ---: |
${topRows}

## Notes

${noteLines}
`;
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

async function appendHistory(
  row: HistoryRow,
  historyDir: string,
  historyName: string,
): Promise<void> {
  await mkdir(historyDir, { recursive: true });
  const jsonlPath = join(historyDir, `${historyName}.jsonl`);
  const mdPath = join(historyDir, `${historyName}.md`);
  const jsonPath = join(historyDir, `${historyName}.json`);

  await appendFile(jsonlPath, JSON.stringify(row) + '\n', 'utf8');

  const raw = await readFile(jsonlPath, 'utf8');
  const allRows: HistoryRow[] = raw
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => JSON.parse(l) as HistoryRow);

  await writeFile(jsonPath, `${JSON.stringify(allRows, null, 2)}\n`);

  const tableRows = [...allRows]
    .reverse()
    .map((r) => {
      const date = r.timestamp.slice(0, 10);
      return `| ${date} | ${r.sha} | ${r.seed} | ${r.players} | ${r.matches} | ${r.kFactor} | ${r.label} | ${r.spearman} | ${r.topNOverlap} |`;
    })
    .join('\n');

  await writeFile(
    mdPath,
    `# Ladder Simulation History\n\nEach row is one simulation run.\n\n| Date | Commit | Seed | Players | Matches | K | Label | Spearman | Top-N |\n| --- | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |\n${tableRows}\n`,
  );
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usage(): void {
  console.log(`Usage: tsx bin/qa/ladder-real.ts [OPTIONS]

Fetches the live ladder leaderboard and computes quality metrics using
win_rate as a skill proxy (compared to latent_skill in simulation).

Options:
  --server-url URL      Server base URL (default: $GAME_SERVER_URL or ${DEFAULT_SERVER_URL})
  --token TOKEN         Bearer token if required (default: $AGENT_TOKEN)
  --category NAME       Ladder category: pvp, sp-random, sp-heuristic (default: ${DEFAULT_CATEGORY})
  --min-games NUMBER    Exclude players with fewer games (default: ${DEFAULT_MIN_GAMES})
  --top-n NUMBER        Top-N for overlap metric (default: top decile)
  --limit NUMBER        Max players to fetch (default: 100)
  --out-dir PATH        Artifact output directory (default: ${DEFAULT_OUT_DIR})
  --report-name NAME    Report basename (default: ${DEFAULT_REPORT_NAME})
  --history             Append a row to docs/quality/ladder-history.jsonl
  --history-dir PATH    History directory (default: ${DEFAULT_HISTORY_DIR})
  --history-name NAME   History file basename (default: ${DEFAULT_HISTORY_NAME})
  --help                Show this help

Notes:
  Spearman here measures Elo-rank vs win_rate-rank correlation.
  Simulation Spearman measures Elo-rank vs latent_skill-rank correlation.
  Both go on the same chart but are not directly comparable — see report notes.
`);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((a) => a !== '--'),
    options: {
      'server-url': { type: 'string', default: DEFAULT_SERVER_URL },
      token: { type: 'string', default: process.env.AGENT_TOKEN },
      category: { type: 'string', default: DEFAULT_CATEGORY },
      'min-games': { type: 'string', default: String(DEFAULT_MIN_GAMES) },
      'top-n': { type: 'string' },
      limit: { type: 'string', default: '100' },
      'out-dir': { type: 'string', default: DEFAULT_OUT_DIR },
      'report-name': { type: 'string', default: DEFAULT_REPORT_NAME },
      history: { type: 'boolean', default: false },
      'history-dir': { type: 'string', default: DEFAULT_HISTORY_DIR },
      'history-name': { type: 'string', default: DEFAULT_HISTORY_NAME },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) {
    usage();
    return;
  }

  const serverUrl = (values['server-url'] ?? DEFAULT_SERVER_URL).replace(/\/$/, '');
  const category = values.category ?? DEFAULT_CATEGORY;
  const minGames = Math.max(1, parseInt(values['min-games'] ?? String(DEFAULT_MIN_GAMES), 10));
  const limit = Math.min(100, Math.max(1, parseInt(values.limit ?? '100', 10)));

  console.log(`Fetching ${category} leaderboard from ${serverUrl} …`);
  const raw = await fetchLeaderboard(serverUrl, category, limit, values.token);
  console.log(
    `Received ${raw.rankings.length} players (window: ${raw.windowDays} days, limit: ${limit})`,
  );

  const effectiveTopN = values['top-n']
    ? parseInt(values['top-n'], 10)
    : Math.max(3, Math.ceil(raw.rankings.filter((e) => e.matches >= minGames).length / 10));

  const report = computeReport(raw, minGames, effectiveTopN, serverUrl);

  await mkdir(values['out-dir'] ?? DEFAULT_OUT_DIR, { recursive: true });
  const jsonPath = join(
    values['out-dir'] ?? DEFAULT_OUT_DIR,
    `${values['report-name'] ?? DEFAULT_REPORT_NAME}.json`,
  );
  const mdPath = join(
    values['out-dir'] ?? DEFAULT_OUT_DIR,
    `${values['report-name'] ?? DEFAULT_REPORT_NAME}.md`,
  );
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(mdPath, renderMarkdown(report));

  console.log(`eloWinRateSpearman=${report.metrics.eloWinRateSpearman}`);
  console.log(`topNOverlap=${report.metrics.topNOverlap}`);
  console.log(`activePlayers=${report.metrics.activePlayers} (minGames=${minGames})`);
  console.log(`json=${jsonPath}`);
  console.log(`markdown=${mdPath}`);

  if (values.history) {
    const historyRow: HistoryRow = {
      timestamp: report.fetchedAt,
      sha: 'live',
      seed: 0,
      players: report.metrics.activePlayers,
      matches: report.metrics.averageGames,
      kFactor: 32,
      label: `real-${category}`,
      spearman: report.metrics.eloWinRateSpearman,
      topNOverlap: report.metrics.topNOverlap,
    };
    await appendHistory(
      historyRow,
      values['history-dir'] ?? DEFAULT_HISTORY_DIR,
      values['history-name'] ?? DEFAULT_HISTORY_NAME,
    );
    console.log(`history=docs/quality/ladder-history.jsonl`);
  }

  for (const note of report.notes) {
    console.log(`note: ${note}`);
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
