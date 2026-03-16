import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { requireAdmin } from '../middleware/auth.js';
import { db } from '../db.js';

interface ReportParam {
  name: string;
  type: 'select' | 'number';
  default: string | number;
  options?: string[];
  label: string;
}

interface Report {
  id: string;
  name: string;
  description: string;
  category: 'matches' | 'players' | 'integrity';
  params: ReportParam[];
  buildSql: (params: Record<string, string | number>) => string;
}

function safeSelect(value: unknown, options: string[], fallback: string): string {
  return options.includes(String(value)) ? String(value) : fallback;
}

function safeNumber(value: unknown, fallback: number): number {
  const n = parseInt(String(value), 10);
  return isNaN(n) ? fallback : n;
}

const REPORTS: Report[] = [
  // --- Matches ---
  {
    id: 'match-history',
    name: 'Match history',
    description: 'All matches filtered by status and opponent type',
    category: 'matches',
    params: [
      {
        name: 'status',
        type: 'select',
        default: 'all',
        options: ['all', 'active', 'completed', 'pending', 'cancelled'],
        label: 'Status',
      },
      {
        name: 'opponent',
        type: 'select',
        default: 'all',
        options: ['all', 'human', 'bot'],
        label: 'Opponent',
      },
      { name: 'limit', type: 'number', default: 50, label: 'Limit' },
    ],
    buildSql: (p) => {
      const status = safeSelect(
        p['status'],
        ['all', 'active', 'completed', 'pending', 'cancelled'],
        'all',
      );
      const opponent = safeSelect(p['opponent'], ['all', 'human', 'bot'], 'all');
      const limit = safeNumber(p['limit'], 50);
      const statusClause = status === 'all' ? '' : `AND status = '${status}'`;
      const opponentClause =
        opponent === 'all'
          ? ''
          : opponent === 'bot'
            ? `AND bot_strategy IS NOT NULL`
            : `AND bot_strategy IS NULL`;
      return `SELECT id, player_1_name, player_2_name, bot_strategy, status, outcome, created_at FROM matches WHERE 1=1 ${statusClause} ${opponentClause} ORDER BY created_at DESC LIMIT ${limit}`;
    },
  },
  {
    id: 'victory-breakdown',
    name: 'Victory type breakdown',
    description: 'Count of completed matches grouped by victory type',
    category: 'matches',
    params: [],
    buildSql: () =>
      `SELECT outcome->>'victoryType' AS victory_type, COUNT(*)::int AS count FROM matches WHERE status = 'completed' AND outcome IS NOT NULL GROUP BY victory_type ORDER BY count DESC`,
  },
  {
    id: 'turn-distribution',
    name: 'Turn length distribution',
    description: 'Distribution of completed match lengths by turn count',
    category: 'matches',
    params: [],
    buildSql: () =>
      `SELECT jsonb_array_length(transaction_log) AS turns, COUNT(*)::int AS match_count FROM matches WHERE status = 'completed' GROUP BY turns ORDER BY turns ASC`,
  },
  {
    id: 'abandoned-matches',
    name: 'Cancelled / abandoned matches',
    description: 'Matches that were cancelled or never completed',
    category: 'matches',
    params: [{ name: 'limit', type: 'number', default: 50, label: 'Limit' }],
    buildSql: (p) => {
      const limit = safeNumber(p['limit'], 50);
      return `SELECT id, player_1_name, player_2_name, status, created_at, updated_at FROM matches WHERE status IN ('cancelled', 'pending') ORDER BY created_at DESC LIMIT ${limit}`;
    },
  },
  // --- Players ---
  {
    id: 'win-loss-by-player',
    name: 'Win / loss by player',
    description: 'Win and loss counts for each user',
    category: 'players',
    params: [{ name: 'limit', type: 'number', default: 50, label: 'Limit' }],
    buildSql: (p) => {
      const limit = safeNumber(p['limit'], 50);
      return `SELECT u.id, u.gamertag, u.elo, COUNT(CASE WHEN m.outcome->>'winnerId' = u.id::text THEN 1 END)::int AS wins, COUNT(CASE WHEN (m.player_1_id = u.id OR m.player_2_id = u.id) AND m.outcome->>'winnerId' != u.id::text AND m.outcome IS NOT NULL THEN 1 END)::int AS losses FROM users u LEFT JOIN matches m ON m.player_1_id = u.id OR m.player_2_id = u.id GROUP BY u.id, u.gamertag, u.elo ORDER BY wins DESC LIMIT ${limit}`;
    },
  },
  {
    id: 'elo-progression',
    name: 'Elo progression',
    description: 'Most recent Elo snapshots per user',
    category: 'players',
    params: [{ name: 'limit', type: 'number', default: 50, label: 'Limit' }],
    buildSql: (p) => {
      const limit = safeNumber(p['limit'], 50);
      return `SELECT u.gamertag, s.category, s.elo, s.computed_at FROM elo_snapshots s JOIN users u ON u.id = s.user_id ORDER BY s.computed_at DESC LIMIT ${limit}`;
    },
  },
  {
    id: 'human-vs-bot',
    name: 'Human vs bot record',
    description: 'Win/loss record for human-vs-bot matches',
    category: 'players',
    params: [],
    buildSql: () =>
      `SELECT bot_strategy, COUNT(*)::int AS total, COUNT(CASE WHEN outcome->>'winnerId' = player_1_id::text THEN 1 END)::int AS human_wins, COUNT(CASE WHEN outcome->>'winnerId' = player_2_id::text THEN 1 END)::int AS bot_wins FROM matches WHERE bot_strategy IS NOT NULL AND status = 'completed' GROUP BY bot_strategy`,
  },
  // --- Integrity ---
  {
    id: 'turnhash-sweep',
    name: 'turnHash sweep',
    description: 'Matches where transaction_log entries are missing turnHash',
    category: 'integrity',
    params: [],
    buildSql: () =>
      `SELECT m.id, m.player_1_name, m.player_2_name, m.status, jsonb_array_length(m.transaction_log) AS total_turns, (SELECT COUNT(*)::int FROM jsonb_array_elements(m.transaction_log) AS e WHERE e->>'turnHash' IS NULL) AS missing_turn_hashes FROM matches m WHERE status = 'completed' AND jsonb_array_length(transaction_log) > 0 HAVING (SELECT COUNT(*) FROM jsonb_array_elements(m.transaction_log) AS e WHERE e->>'turnHash' IS NULL) > 0 ORDER BY missing_turn_hashes DESC`,
  },
  {
    id: 'fingerprint-audit',
    name: 'Fingerprint audit',
    description: 'Completed matches that have an event_log but no event_log_fingerprint',
    category: 'integrity',
    params: [],
    buildSql: () =>
      `SELECT id, player_1_name, player_2_name, created_at FROM matches WHERE status = 'completed' AND event_log IS NOT NULL AND event_log_fingerprint IS NULL ORDER BY created_at DESC`,
  },
  {
    id: 'missing-event-logs',
    name: 'Missing event logs',
    description: 'Completed matches with null event_log',
    category: 'integrity',
    params: [],
    buildSql: () =>
      `SELECT id, player_1_name, player_2_name, created_at FROM matches WHERE status = 'completed' AND event_log IS NULL ORDER BY created_at DESC`,
  },
];

export function registerReportRoutes(fastify: FastifyInstance) {
  // GET /admin-api/reports — list without buildSql
  fastify.get('/admin-api/reports', async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    return reply.status(200).send(
      REPORTS.map(({ id, name, description, category, params }) => ({
        id,
        name,
        description,
        category,
        params,
      })),
    );
  });

  // GET /admin-api/reports/:reportId/sql — render SQL with query params
  fastify.get<{ Params: { reportId: string }; Querystring: Record<string, string> }>(
    '/admin-api/reports/:reportId/sql',
    async (request, reply) => {
      const admin = await requireAdmin(request, reply);
      if (!admin) return;

      const report = REPORTS.find((r) => r.id === request.params.reportId);
      if (!report) return reply.status(404).send({ error: 'Report not found', code: 'NOT_FOUND' });

      const renderedSql = report.buildSql(request.query ?? {});
      return reply.status(200).send({ sql: renderedSql });
    },
  );

  // POST /admin-api/reports/:reportId/run — run report
  fastify.post<{ Params: { reportId: string }; Body: unknown }>(
    '/admin-api/reports/:reportId/run',
    async (request, reply) => {
      const admin = await requireAdmin(request, reply);
      if (!admin) return;

      const report = REPORTS.find((r) => r.id === request.params.reportId);
      if (!report) return reply.status(404).send({ error: 'Report not found', code: 'NOT_FOUND' });

      const params = (request.body as Record<string, string | number>) ?? {};
      const renderedSql = report.buildSql(params);

      const start = Date.now();
      const rows = await db.execute(sql.raw(renderedSql));
      const durationMs = Date.now() - start;

      return reply.status(200).send({
        rows,
        rowCount: rows.length,
        durationMs,
        sql: renderedSql,
      });
    },
  );
}
