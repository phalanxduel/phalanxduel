import * as fs from 'node:fs';
import * as http from 'node:http';
import * as https from 'node:https';
import * as path from 'node:path';
import * as readline from 'node:readline';

// Ponytail rule: native Node.js only, zero external npm dependencies.

export type TopEnvironment = 'local' | 'staging' | 'production';

export const ENVIRONMENTS: Record<TopEnvironment, { label: string; url: string }> = {
  local: { label: 'LOCAL DEV', url: 'http://127.0.0.1:3001' },
  staging: { label: 'STAGING (Fly.io)', url: 'https://phalanxduel-staging.fly.dev' },
  production: { label: 'PRODUCTION (Fly.io)', url: 'https://phalanxduel.fly.dev' },
};

interface ServerHealth {
  status: string;
  timestamp?: string;
  version?: string;
  build_id?: string;
  commit_sha?: string;
  uptime_seconds?: number;
  memory_heap_used_mb?: number;
  observability?: {
    otel_active?: boolean;
    region?: string;
  };
}

interface ServerStats {
  totalMatches: number;
  activeMatches: number;
  completedMatches: number;
}

interface LobbyMatch {
  matchId: string;
  openSeat: 'P0' | 'P1';
  visibility: 'private' | 'public_open';
  publicStatus: string | null;
  creatorName: string;
  creatorElo: number | null;
  ageSeconds: number;
  joinable: boolean;
  disabledReason?: string | null;
}

interface LadderRanking {
  rank: number;
  gamertag: string;
  elo: number;
  matches: number;
  wins: number;
}

interface CombatEvent {
  timestamp: string;
  matchId: string;
  playerIndex?: number;
  actionType: string;
  kind?: string;
  turnHash?: string;
  lane?: string;
  status?: string;
}

export class GameTopMonitor {
  private currentEnv: TopEnvironment = 'local';
  private intervalSec = 1.5;
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private startTime = Date.now();
  private eventLog: CombatEvent[] = [];
  private panoramicFileOffset = 0;
  private panoramicPath: string;

  constructor(initialEnv: TopEnvironment = 'local') {
    this.currentEnv = initialEnv;
    const rootDir = path.resolve(import.meta.dirname, '../..');
    this.panoramicPath = path.join(rootDir, 'logs/panoramic.jsonl');
  }

  public async start(): Promise<void> {
    this.isRunning = true;
    this.loadInitialEvents();

    const shutdown = () => {
      this.stop();
      process.stdout.write('\x1b[?25h\n'); // show cursor
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    if (process.stdin.isTTY) {
      readline.emitKeypressEvents(process.stdin);
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('keypress', (_str, key) => {
        if (!key) return;
        if (key.ctrl && key.name === 'c') shutdown();
        else if (key.name === 'q') shutdown();
        else if (key.name === 'm') this.cycleEnvironment();
        else if (key.name === 'r') void this.tick();
        else if (key.name === 'c') {
          this.eventLog = [];
          void this.tick();
        }
      });
      // Hide cursor
      process.stdout.write('\x1b[?25l');
    }

    await this.tick();
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalSec * 1000);
  }

  public async tickOnce(): Promise<void> {
    this.loadInitialEvents();
    await this.tick();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
  }

  private cycleEnvironment(): void {
    if (this.currentEnv === 'local') this.currentEnv = 'staging';
    else if (this.currentEnv === 'staging') this.currentEnv = 'production';
    else this.currentEnv = 'local';
    void this.tick();
  }

  private loadInitialEvents(): void {
    if (!fs.existsSync(this.panoramicPath)) return;
    try {
      const stats = fs.statSync(this.panoramicPath);
      // Read up to last 32KB of events
      const readSize = Math.min(stats.size, 32768);
      const startPos = Math.max(0, stats.size - readSize);
      const fd = fs.openSync(this.panoramicPath, 'r');
      const buffer = Buffer.alloc(readSize);
      fs.readSync(fd, buffer, 0, readSize, startPos);
      fs.closeSync(fd);
      this.panoramicFileOffset = stats.size;

      const lines = buffer.toString('utf8').split('\n').filter(Boolean);
      const parsed: CombatEvent[] = [];
      for (const line of lines) {
        try {
          const row = JSON.parse(line);
          if (row.match_id || row.action_type) {
            parsed.push({
              timestamp: row.timestamp || new Date().toISOString(),
              matchId: (row.match_id || 'unknown').slice(0, 8),
              playerIndex: row.player_index,
              actionType: row.action_type || row.kind || 'ACTION',
              kind: row.kind,
              turnHash: (row.turn_hash || '').slice(0, 8),
              lane: row.lane || 'engine',
              status: row.status || 'ok',
            });
          }
        } catch {
          // ignore malformed line
        }
      }
      this.eventLog = parsed.slice(-15);
    } catch {
      // ignore
    }
  }

  private pollNewEvents(): void {
    if (!fs.existsSync(this.panoramicPath)) return;
    try {
      const stats = fs.statSync(this.panoramicPath);
      if (stats.size <= this.panoramicFileOffset) return;

      const fd = fs.openSync(this.panoramicPath, 'r');
      const length = stats.size - this.panoramicFileOffset;
      const buffer = Buffer.alloc(length);
      fs.readSync(fd, buffer, 0, length, this.panoramicFileOffset);
      fs.closeSync(fd);
      this.panoramicFileOffset = stats.size;

      const lines = buffer.toString('utf8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const row = JSON.parse(line);
          if (row.match_id || row.action_type) {
            this.eventLog.push({
              timestamp: row.timestamp || new Date().toISOString(),
              matchId: (row.match_id || 'unknown').slice(0, 8),
              playerIndex: row.player_index,
              actionType: row.action_type || row.kind || 'ACTION',
              kind: row.kind,
              turnHash: (row.turn_hash || '').slice(0, 8),
              lane: row.lane || 'engine',
              status: row.status || 'ok',
            });
          }
        } catch {
          // ignore
        }
      }
      if (this.eventLog.length > 30) {
        this.eventLog = this.eventLog.slice(-30);
      }
    } catch {
      // ignore
    }
  }

  private async fetchJson<T>(
    url: string,
    timeoutMs = 1200,
  ): Promise<{ data: T | null; latencyMs: number | null; error?: string }> {
    const start = process.hrtime.bigint();
    try {
      const parsed = new URL(url);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      return await new Promise((resolve) => {
        const req = client.get(
          url,
          {
            timeout: timeoutMs,
            rejectUnauthorized: false, // allow local self-signed certs
            headers: {
              'User-Agent': 'phx-top/1.0',
              Accept: 'application/json',
            },
          },
          (res) => {
            let body = '';
            res.on('data', (chunk) => {
              body += chunk;
            });
            res.on('end', () => {
              const end = process.hrtime.bigint();
              const latencyMs = Math.round(Number(end - start) / 100_000) / 10;
              if ((res.statusCode ?? 500) >= 400) {
                resolve({
                  data: null,
                  latencyMs,
                  error: `HTTP ${res.statusCode}`,
                });
                return;
              }
              try {
                const data = JSON.parse(body) as T;
                resolve({ data, latencyMs });
              } catch {
                resolve({
                  data: null,
                  latencyMs,
                  error: 'JSON_PARSE_ERROR',
                });
              }
            });
          },
        );

        req.on('error', (err) => {
          const end = process.hrtime.bigint();
          const latencyMs = Math.round(Number(end - start) / 100_000) / 10;
          resolve({ data: null, latencyMs, error: err.message });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ data: null, latencyMs: null, error: 'TIMEOUT' });
        });
      });
    } catch (err: unknown) {
      return {
        data: null,
        latencyMs: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async tick(): Promise<void> {
    if (this.currentEnv === 'local') {
      this.pollNewEvents();
    }

    const target = ENVIRONMENTS[this.currentEnv];

    const [healthRes, readyRes, statsRes, lobbyRes, ladderRes] = await Promise.all([
      this.fetchJson<ServerHealth>(`${target.url}/health`),
      this.fetchJson<{ status: string; database?: { status: string } }>(`${target.url}/ready`),
      this.fetchJson<ServerStats>(`${target.url}/api/stats`),
      this.fetchJson<LobbyMatch[]>(`${target.url}/api/matches/lobby`),
      this.fetchJson<{ rankings: LadderRanking[] }>(`${target.url}/api/ladder/pvp`),
    ]);

    this.render({
      env: this.currentEnv,
      targetUrl: target.url,
      targetLabel: target.label,
      health: healthRes.data,
      latencyMs: healthRes.latencyMs,
      error: healthRes.error,
      ready: readyRes.data,
      stats: statsRes.data,
      lobby: lobbyRes.data || [],
      ladder: ladderRes.data?.rankings || [],
      events: this.eventLog,
    });
  }

  private render(model: {
    env: TopEnvironment;
    targetUrl: string;
    targetLabel: string;
    health: ServerHealth | null;
    latencyMs: number | null;
    error?: string;
    ready: { status: string; database?: { status: string } } | null;
    stats: ServerStats | null;
    lobby: LobbyMatch[];
    ladder: LadderRanking[];
    events: CombatEvent[];
  }): void {
    const lines: string[] = [];
    const nowStr = new Date().toLocaleTimeString();
    const upDurationSec = Math.floor((Date.now() - this.startTime) / 1000);
    const topUptime = `${Math.floor(upDurationSec / 60)}m ${upDurationSec % 60}s`;

    // Status Banner
    const isOnline = Boolean(model.health);
    const statusTag = isOnline
      ? `\x1b[1;42m ● ONLINE \x1b[0m`
      : `\x1b[1;41m ✖ UNREACHABLE (${model.error || 'DOWN'}) \x1b[0m`;

    lines.push(
      '\x1b[1;36m╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗\x1b[0m',
    );
    lines.push(
      `\x1b[1;36m║  \x1b[1;37mPHALANX DUEL — GAME RUNTIME & ANALYTICS MONITOR (TOP)\x1b[1;36m                                              ║\x1b[0m`,
    );
    lines.push(
      `\x1b[1;36m║  Target Mode: \x1b[1;33m${model.targetLabel.padEnd(20)}\x1b[1;36m URL: \x1b[1;32m${model.targetUrl.padEnd(35)}\x1b[1;36m Status: ${statusTag} ║\x1b[0m`,
    );
    lines.push(
      `\x1b[1;36m║  Local Time: \x1b[1;37m${nowStr.padEnd(10)}\x1b[1;36m  Top Uptime: \x1b[1;37m${topUptime.padEnd(8)}\x1b[1;36m  Server Ping: \x1b[1;32m${model.latencyMs !== null ? `${model.latencyMs}ms` : 'TIMEOUT'}\x1b[1;36m                                ║\x1b[0m`,
    );
    lines.push(
      '\x1b[1;36m╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣\x1b[0m',
    );

    // Section 1: Server Engine & Runtime
    const srvUptime = model.health?.uptime_seconds
      ? `${Math.floor(model.health.uptime_seconds / 60)}m ${model.health.uptime_seconds % 60}s`
      : 'N/A';
    const heapMb = model.health?.memory_heap_used_mb ?? 'N/A';
    const srvVer = model.health?.version || '1.5.0';
    const buildId = model.health?.build_id || 'dev';
    const commitSha = model.health?.commit_sha ? model.health.commit_sha.slice(0, 7) : 'unknown';
    const otelStatus = model.health?.observability?.otel_active
      ? '\x1b[1;32mACTIVE\x1b[0m'
      : '\x1b[2mINACTIVE\x1b[0m';
    const dbStatus = model.ready?.database?.status === 'ok' ? 'CONNECTED' : 'DISCONNECTED / IN-MEM';

    lines.push('\x1b[1;33m [1] GAME SERVER & RUNTIME HEALTH\x1b[0m');
    lines.push(
      `     Uptime           : \x1b[1;37m${srvUptime.padEnd(16)}\x1b[0m Heap Memory       : \x1b[1;37m${String(heapMb).padEnd(6)} MB\x1b[0m  OTel Telemetry : ${otelStatus}`,
    );
    lines.push(
      `     Engine Version   : \x1b[1;37m${srvVer.padEnd(16)}\x1b[0m Build Identity    : \x1b[1;37m${buildId.padEnd(10)}\x1b[0m Commit SHA    : \x1b[1;35m${commitSha}\x1b[0m`,
    );
    lines.push(`     Database Health  : \x1b[1;32m${dbStatus}\x1b[0m`);

    // Section 2: Arena Statistics & Match Metrics
    lines.push(
      '\x1b[1;36m╟─────────────────────────────────────────────────────────────────────────────────────────────────────╢\x1b[0m',
    );
    const totalM = model.stats?.totalMatches ?? 0;
    const activeM = model.stats?.activeMatches ?? 0;
    const completedM = model.stats?.completedMatches ?? 0;

    lines.push('\x1b[1;33m [2] ARENA DUEL METRICS\x1b[0m');
    lines.push(
      `     Active Duels     : \x1b[1;32m${String(activeM).padEnd(16)}\x1b[0m Completed Matches : \x1b[1;34m${String(completedM).padEnd(16)}\x1b[0m Total Recorded : \x1b[1;37m${totalM}\x1b[0m`,
    );

    // Section 3: Lobby & Matchmaking Waitlist
    lines.push(
      '\x1b[1;36m╟─────────────────────────────────────────────────────────────────────────────────────────────────────╢\x1b[0m',
    );
    const publicLobby = model.lobby.filter((m) => m.visibility === 'public_open');
    const privateLobby = model.lobby.filter((m) => m.visibility === 'private');

    lines.push(
      `\x1b[1;33m [3] MATCHMAKING LOBBY WAITLIST\x1b[0m  (Open Public: ${publicLobby.length} │ Private: ${privateLobby.length})`,
    );
    if (model.lobby.length === 0) {
      lines.push(
        '     (No pending matches waiting in lobby. Duelists can create matches via web UI)',
      );
    } else {
      for (const m of model.lobby.slice(0, 4)) {
        const shortId = m.matchId.slice(0, 8);
        const type = m.visibility === 'public_open' ? 'PUBLIC ' : 'PRIVATE';
        const elo = m.creatorElo ? `Elo: ${m.creatorElo}` : 'Unranked';
        const age = `${Math.floor(m.ageSeconds / 60)}m`;
        const joinStatus = m.joinable
          ? '\x1b[1;32mJOINABLE\x1b[0m'
          : `\x1b[1;33m${m.disabledReason || 'WAITING'}\x1b[0m`;
        lines.push(
          `     • [${shortId}] Seat: \x1b[1;36m${m.openSeat}\x1b[0m │ ${type} │ Creator: \x1b[1;37m${m.creatorName.padEnd(14)}\x1b[0m (${elo}) │ Age: ${age.padEnd(5)} │ ${joinStatus}`,
        );
      }
      if (model.lobby.length > 4) {
        lines.push(`     ... and ${model.lobby.length - 4} more lobby matches`);
      }
    }

    // Section 4: Ladder Standings
    lines.push(
      '\x1b[1;36m╟─────────────────────────────────────────────────────────────────────────────────────────────────────╢\x1b[0m',
    );
    lines.push('\x1b[1;33m [4] TOP DUELISTS & LADDER STANDINGS (PvP)\x1b[0m');
    if (model.ladder.length === 0) {
      lines.push('     (No ranked ladder matches recorded yet this season)');
    } else {
      for (const r of model.ladder.slice(0, 3)) {
        const winRate = r.matches > 0 ? `${Math.round((r.wins / r.matches) * 100)}%` : '-';
        lines.push(
          `     #${r.rank}  \x1b[1;37m${r.gamertag.padEnd(20)}\x1b[0m Elo: \x1b[1;33m${String(r.elo).padEnd(6)}\x1b[0m Matches: ${String(r.matches).padEnd(4)} Wins: \x1b[1;32m${String(r.wins).padEnd(4)}\x1b[0m WinRate: ${winRate}`,
        );
      }
    }

    // Section 5: Real-time Combat / Transaction Stream
    lines.push(
      '\x1b[1;36m╟─────────────────────────────────────────────────────────────────────────────────────────────────────╢\x1b[0m',
    );
    lines.push(
      '\x1b[1;33m [5] REAL-TIME COMBAT & TRANSACTION STREAM\x1b[0m  (Engine transactions & state changes)',
    );
    if (model.events.length === 0) {
      lines.push(
        '     (Listening for gameplay combat transactions, deploys, and state transitions...)',
      );
    } else {
      const recent = model.events.slice(-5);
      for (const ev of recent) {
        const time = ev.timestamp.slice(11, 19);
        const pIdx = ev.playerIndex !== undefined ? `P${ev.playerIndex}` : 'SYS';
        const action = ev.actionType.toUpperCase().padEnd(10);
        const lane = ev.lane ? `[${ev.lane}]`.padEnd(14) : '';
        const hash = ev.turnHash ? `Hash: ${ev.turnHash}` : '';
        lines.push(
          `     \x1b[2m${time}\x1b[0m  [${ev.matchId}]  \x1b[1;36m${pIdx}\x1b[0m  \x1b[1;32m${action}\x1b[0m  ${lane}  ${hash}  \x1b[2m(${ev.kind || 'event'})\x1b[0m`,
        );
      }
    }

    // Bottom Navigation Bar
    lines.push(
      '\x1b[1;36m╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣\x1b[0m',
    );
    lines.push(
      '\x1b[1;37m Hotkeys: [m] Switch Mode (local/staging/prod)  │  [r] Force Refresh  │  [c] Clear Events  │  [q] Quit\x1b[0m',
    );
    lines.push(
      '\x1b[1;36m╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝\x1b[0m',
    );

    // Clear terminal screen and redraw in place
    process.stdout.write('\x1b[2J\x1b[H' + lines.join('\n') + '\n');
  }
}

// CLI Execution
if (process.argv[1]?.endsWith('game-top.ts') || process.argv[1]?.endsWith('phx-top')) {
  const args = process.argv.slice(2);
  let env: TopEnvironment = 'local';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mode' || args[i] === '-m') {
      const val = args[i + 1]?.toLowerCase();
      if (val === 'staging' || val === 'production' || val === 'local') {
        env = val;
      }
    } else if (args[i].startsWith('--mode=')) {
      const val = args[i].split('=')[1]?.toLowerCase();
      if (val === 'staging' || val === 'production' || val === 'local') {
        env = val;
      }
    }
  }

  const monitor = new GameTopMonitor(env);
  if (args.includes('--once')) {
    void monitor.tickOnce();
  } else {
    void monitor.start();
  }
}
