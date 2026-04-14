#!/usr/bin/env tsx

/**
 * Phalanx Duel - Local Development Cockpit
 *
 * A clean, high-signal dashboard for human developers and AI agents.
 * Features: Indented section layout, observability tracking, failure diagnostics,
 * and backlog context. Zero flicker via atomic cursor-reset buffering.
 */

import { execSync } from 'child_process';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// --- Configuration ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REFRESH_INTERVAL_MS = 2000;
const PROBE_TIMEOUT_MS = 2000;
const PORTS = {
  APP: 3001,
  ADMIN: 3002,
  CLIENT: 5173,
  POSTGRES: 5432,
  OTEL_HTTP: 4318,
  OTEL_HEALTH: 13133,
  AUTOMATION: 6080,
};

// --- Types ---

type HealthStatus =
  | 'READY'
  | 'STARTING'
  | 'DEGRADED'
  | 'FAILED'
  | 'OPTIONAL'
  | 'DISABLED'
  | 'UNKNOWN';

interface FailureContext {
  target: string;
  error: string;
  portState: 'LISTEN' | 'CLOSED';
  containerState: string;
  role: 'REQUIRED' | 'OPTIONAL';
  impact: string;
  nextStep: string;
  investigationCmd: string;
}

interface ContainerState {
  name: string;
  status: string;
  health: string;
  restarts: number;
  ready: boolean;
}

interface BacklogTask {
  id: string;
  title: string;
  path: string;
}

interface EnvState {
  timestamp: string;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'FAILED';
  statusReason?: string;
  containers: ContainerState[];
  serverIdentity?: {
    hostSha: string;
    liveSha: string;
    liveBuild: string;
    match: boolean;
  };
  services: {
    app: ServiceStatus;
    admin: ServiceStatus;
    client: ServiceStatus;
    postgres: ServiceStatus;
    otel: ObservabilityPipeline;
    automation: ServiceStatus;
  };
  git: {
    branch: string;
    commit: string;
    commitAge: string;
    changes: number;
    isDirty: boolean;
    dirtyLatency: string;
  };
  backlog: {
    activeTasks: BacklogTask[];
  };
  toolchain: {
    nodeMatch: boolean;
    localNode: string;
    requiredNode: string;
  };
  validation: {
    lastVerifyAge: string;
    isStale: boolean;
  };
  metrics: {
    status: 'AVAILABLE' | 'UNAVAILABLE';
    activeMatches: number;
    totalMatches: number;
    dependencyError?: string;
  };
  docker: {
    diskUsage: string;
    reclaimable: string;
    activeProfiles: string[];
  };
  failures: FailureContext[];
  recoveryCommands: RecoveryCommand[];
  links: QuickLink[];
}

interface ServiceStatus {
  name: string;
  status: HealthStatus;
  message: string;
  port: number;
  required: boolean;
}

interface ObservabilityPipeline {
  status: HealthStatus;
  appTelemetry: boolean;
  collectorType: 'CONTAINER' | 'HOST' | 'DISABLED';
  collectorRunning: boolean;
  collectorReachable: boolean;
  logFlow: string;
}

interface RecoveryCommand {
  label: string;
  command: string;
  reason: string;
  priority: 'HIGH' | 'LOW';
}

interface QuickLink {
  label: string;
  url: string;
  description: string;
}

// --- Utils ---

function runCmd(cmd: string): string {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

async function checkPort(port: number): Promise<'LISTEN' | 'CLOSED'> {
  try {
    const out = runCmd(`lsof -Pi :${port} -sTCP:LISTEN -t`);
    return out ? 'LISTEN' : 'CLOSED';
  } catch {
    return 'CLOSED';
  }
}

async function fetchHttp(
  url: string,
  timeoutMs = PROBE_TIMEOUT_MS,
): Promise<{ ok: boolean; status: string; data?: any }> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve({
            ok: res.statusCode === 200,
            status: String(res.statusCode),
            data: JSON.parse(body),
          });
        } catch {
          resolve({ ok: res.statusCode === 200, status: String(res.statusCode) });
        }
      });
    });
    req.on('error', () => resolve({ ok: false, status: 'DOWN' }));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve({ ok: false, status: 'TIMEOUT' });
    });
  });
}

// --- Collectors ---

function getContainer(name: string): ContainerState {
  const status = runCmd(`docker inspect -f '{{.State.Status}}' ${name}`) || 'missing';
  const health = runCmd(`docker inspect -f '{{.State.Health.Status}}' ${name}`) || 'none';
  const restarts = parseInt(runCmd(`docker inspect -f '{{.RestartCount}}' ${name}`) || '0', 10);
  const ready = status === 'running' && (health === 'healthy' || health === 'none');
  return { name, status, health, restarts, ready };
}

function getLogFlow(container: string): string {
  const lastLog = runCmd(`docker logs ${container} --tail 1 --timestamps`);
  if (!lastLog) return 'NO LOGS';
  const match = lastLog.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z)/);
  if (!match) return 'UNKNOWN';
  const ts = new Date(match[1]).getTime();
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 10) return `ACTIVE (${diff}s ago)`;
  if (diff < 60) return `IDLE (${diff}s ago)`;
  return `STALE (>1m)`;
}

function getBacklogTasks(): BacklogTask[] {
  const tasks: BacklogTask[] = [];
  try {
    const files = fs.readdirSync('backlog/tasks');
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = fs.readFileSync(path.join('backlog/tasks', file), 'utf-8');
        if (!content.includes('status: In Progress')) continue;
        const idMatch = file.match(/task-([\d\.]+)/i);
        // Prefer YAML frontmatter title, fall back to first # heading
        const frontmatterTitle = content.match(/^title:\s*['"]?(.+?)['"]?\s*$/m);
        const headingTitle = content.split('\n').find((l) => l.startsWith('# '));
        let title = frontmatterTitle
          ? frontmatterTitle[1].trim()
          : headingTitle
            ? headingTitle.replace('# ', '').trim()
            : file.replace(/^task-[\d\.]+ - /i, '').replace('.md', '');
        tasks.push({
          id: idMatch ? idMatch[1].toUpperCase() : '?',
          title,
          path: path.join('backlog/tasks', file),
        });
      }
    }
  } catch {}
  return tasks;
}

async function collectState(): Promise<EnvState> {
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  // Check Docker availability first
  const dockerInfo = runCmd('docker info');
  const dockerAvailable = !!dockerInfo;

  const [appH, adminH, clientH, otelH, statsH] = await Promise.all([
    fetchHttp(`http://127.0.0.1:${PORTS.APP}/health`),
    fetchHttp(`http://127.0.0.1:${PORTS.ADMIN}/`),
    fetchHttp(`http://127.0.0.1:${PORTS.CLIENT}/`),
    fetchHttp(`http://127.0.0.1:${PORTS.OTEL_HEALTH}/`),
    fetchHttp(`http://127.0.0.1:${PORTS.APP}/api/stats`),
    fetchHttp(`http://127.0.0.1:${PORTS.AUTOMATION}/`, 500),
  ]);

  let hostMeta: any = null;
  try {
    hostMeta = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'build-metadata.json'), 'utf8'),
    );
  } catch {
    // Ignore if not present
  }

  const liveSha = appH.data?.commit_sha || '';
  const hostSha = hostMeta?.commitSha || '';
  const identityMatch = !hostSha || !liveSha || hostSha === liveSha;

  const serverIdentity = {
    hostSha: hostSha.slice(0, 7),
    liveSha: liveSha.slice(0, 7),
    liveBuild: appH.data?.build_id || 'unknown',
    match: identityMatch,
  };

  const portStates = {
    app: await checkPort(PORTS.APP),
    admin: await checkPort(PORTS.ADMIN),
    client: await checkPort(PORTS.CLIENT),
    postgres: await checkPort(PORTS.POSTGRES),
    otel: await checkPort(PORTS.OTEL_HTTP),
  };

  const appTelemetry = appH.data?.observability?.otel_active === true;
  const runningContainerNames = dockerAvailable
    ? runCmd('docker ps --format "{{.Names}}"').split('\n')
    : [];
  const collectorContainerRunning = runningContainerNames.includes('phalanx-otel-collector');

  const otelEndpoint =
    dockerAvailable && collectorContainerRunning
      ? runCmd('docker exec phalanx-app env | grep OTEL_EXPORTER_OTLP_ENDPOINT').split('=')[1] || ''
      : '';
  const isHostCollector =
    otelEndpoint.includes('host.docker.internal') || otelEndpoint.includes('127.0.0.1');
  const isContainerCollector = otelEndpoint.includes('otel-collector');

  let collectorType: 'CONTAINER' | 'HOST' | 'DISABLED' = 'DISABLED';
  if (appTelemetry) {
    collectorType = isContainerCollector ? 'CONTAINER' : isHostCollector ? 'HOST' : 'DISABLED';
  }

  const collectorReachable = portStates.otel === 'LISTEN';
  let otelStatus: HealthStatus = 'DISABLED';
  if (appTelemetry) {
    if (collectorType === 'CONTAINER') {
      otelStatus = collectorContainerRunning && collectorReachable ? 'READY' : 'FAILED';
    } else if (collectorType === 'HOST') {
      otelStatus = collectorReachable ? 'READY' : 'DEGRADED';
    }
  }

  const otel: ObservabilityPipeline = {
    status: otelStatus,
    appTelemetry,
    collectorType,
    collectorRunning: collectorContainerRunning,
    collectorReachable,
    logFlow: dockerAvailable ? getLogFlow('phalanx-app') : 'DOCKER DOWN',
  };

  let containers: ContainerState[] = [];
  if (dockerAvailable) {
    const containerNames = [
      'phalanx-app',
      'phalanx-admin',
      'phalanx-client',
      'phalanx-postgres',
      'phalanx-automation',
    ];
    if (collectorType === 'CONTAINER' || collectorContainerRunning) {
      containerNames.push('phalanx-otel-collector');
    }
    containers = containerNames.map((name) => getContainer(name));
  } else {
    containers = [
      { name: 'DOCKER DAEMON', status: 'UNREACHABLE', health: 'none', restarts: 0, ready: false },
    ];
  }

  const appC = containers.find((c) => c.name === 'phalanx-app') || {
    status: 'missing',
    ready: false,
    health: 'none',
    restarts: 0,
  };
  const adminC = containers.find((c) => c.name === 'phalanx-admin') || {
    status: 'missing',
    ready: false,
    health: 'none',
    restarts: 0,
  };
  const clientC = containers.find((c) => c.name === 'phalanx-client') || {
    status: 'missing',
    ready: false,
    health: 'none',
    restarts: 0,
  };
  const pgC = containers.find((c) => c.name === 'phalanx-postgres') || {
    status: 'missing',
    ready: false,
    health: 'none',
    restarts: 0,
  };
  const autoC = containers.find((c) => c.name === 'phalanx-automation') || {
    status: 'missing',
    ready: false,
    health: 'none',
    restarts: 0,
  };

  const branch = runCmd('git rev-parse --abbrev-ref HEAD') || 'unknown';
  const commit = runCmd('git rev-parse --short HEAD') || 'unknown';
  const lastCommitTs = parseInt(runCmd('git log -1 --format=%ct') || '0', 10);
  const changes = runCmd('git status --porcelain')
    .split('\n')
    .filter((x) => x).length;
  const commitAgeS = lastCommitTs ? Math.floor(now.getTime() / 1000 - lastCommitTs) : 0;

  const isMac = process.platform === 'darwin';
  const oldestModifiedCmd = isMac
    ? 'find server/src engine/src shared/src client/src admin/src -type f -exec stat -f "%m" {} + | sort -n | head -1'
    : 'find server/src engine/src shared/src client/src admin/src -type f -exec stat -c %Y {} + | sort -n | head -1';
  const oldestModifiedTs = parseInt(runCmd(oldestModifiedCmd), 10);
  let dirtyLatency = '0s';
  if (changes > 0 && oldestModifiedTs) {
    const latS = Math.floor(now.getTime() / 1000 - oldestModifiedTs);
    if (latS > 0) {
      dirtyLatency = latS < 3600 ? `${Math.floor(latS / 60)}m` : `${Math.floor(latS / 3600)}h`;
    }
  }

  const verifyReport = 'eslint-report.json';
  const hasVerify = fs.existsSync(verifyReport);
  const verifyStat = hasVerify ? fs.statSync(verifyReport) : null;
  const isStale = verifyStat ? verifyStat.mtimeMs < lastCommitTs * 1000 : true;

  const miseNode = (runCmd('cat mise.toml').match(/node\s*=\s*"([^"]+)"/) || [])[1] || 'unknown';
  const localNode = process.version;
  const nodeMatch = localNode.includes(miseNode.replace('.x', ''));

  const dockerDf = dockerAvailable
    ? runCmd('docker system df').split('\n')[1]?.trim().split(/\s+/) || []
    : [];

  let metricsStatus: 'AVAILABLE' | 'UNAVAILABLE' = 'UNAVAILABLE';
  let dependencyError = undefined;
  if (appH.ok && statsH.ok) {
    metricsStatus = 'AVAILABLE';
  } else if (!pgC.ready) {
    dependencyError = 'Postgres unreachable';
  } else if (!appH.ok) {
    dependencyError = 'App API down';
  }

  const state: EnvState = {
    timestamp,
    overallStatus: 'HEALTHY',
    containers,
    serverIdentity,
    services: {
      app: {
        name: 'App API',
        status: appH.ok ? 'READY' : appC.ready ? 'STARTING' : 'FAILED',
        message: appH.status,
        port: PORTS.APP,
        required: true,
      },
      admin: {
        name: 'Admin UI',
        status: adminH.ok ? 'READY' : adminC.ready ? 'STARTING' : 'FAILED',
        message: adminH.status,
        port: PORTS.ADMIN,
        required: true,
      },
      client: {
        name: 'Client UI',
        status: clientH.ok ? 'READY' : clientC.ready ? 'STARTING' : 'FAILED',
        message: clientH.status,
        port: PORTS.CLIENT,
        required: true,
      },
      postgres: {
        name: 'Postgres',
        status: pgC.ready ? 'READY' : 'FAILED',
        message: pgC.health,
        port: PORTS.POSTGRES,
        required: true,
      },
      automation: {
        name: 'Automation',
        status: autoC.ready ? 'READY' : autoC.status === 'running' ? 'STARTING' : 'OPTIONAL',
        message: autoC.health === 'none' ? autoC.status : autoC.health,
        port: PORTS.AUTOMATION,
        required: false,
      },
      otel,
    },
    git: {
      branch,
      commit,
      isDirty: changes > 0,
      changes,
      dirtyLatency,
      commitAge:
        commitAgeS < 3600
          ? `${Math.floor(commitAgeS / 60)}m ago`
          : `${Math.floor(commitAgeS / 3600)}h ago`,
    },
    backlog: { activeTasks: getBacklogTasks() },
    toolchain: { nodeMatch, localNode, requiredNode: miseNode },
    validation: {
      lastVerifyAge: verifyStat
        ? `${Math.floor((now.getTime() - verifyStat.mtimeMs) / 60000)}m ago`
        : 'Never',
      isStale,
    },
    metrics: {
      status: metricsStatus,
      activeMatches: statsH.data?.activeMatches ?? 0,
      totalMatches: statsH.data?.totalMatches ?? 0,
      dependencyError,
    },
    docker: {
      diskUsage: dockerDf[3] || 'unknown',
      reclaimable: dockerDf[4] || 'unknown',
      activeProfiles: dockerAvailable
        ? runCmd('docker compose config --profiles')
            .split('\n')
            .filter((x) => x)
        : [],
    },
    failures: [],
    recoveryCommands: [],
    links: [
      {
        label: 'App Health',
        url: `http://127.0.0.1:${PORTS.APP}/health`,
        description: 'Liveness & OTel',
      },
      {
        label: 'Admin Console',
        url: `http://127.0.0.1:${PORTS.ADMIN}/`,
        description: 'Management UI',
      },
      { label: 'Client UI', url: `http://127.0.0.1:${PORTS.CLIENT}/`, description: 'Game UI' },
      { label: 'API Docs', url: `http://127.0.0.1:${PORTS.APP}/docs`, description: 'OpenAPI' },
      {
        label: 'OpenAPI JSON',
        url: `http://127.0.0.1:${PORTS.APP}/docs/json`,
        description: 'Raw spec',
      },
      { label: 'WebSocket', url: `ws://127.0.0.1:${PORTS.APP}/ws`, description: 'Real-time' },
      {
        label: 'noVNC Hub',
        url: `http://127.0.0.1:${PORTS.AUTOMATION}/`,
        description: 'Headed UI View',
      },
    ],
  };

  const addFailure = (
    target: string,
    err: string,
    port: number,
    role: 'REQUIRED' | 'OPTIONAL',
    impact: string,
    next: string,
    cmd: string,
  ) => {
    state.failures.push({
      target,
      error: err,
      portState: portStates[target.toLowerCase() as keyof typeof portStates] || 'CLOSED',
      containerState:
        containers.find((c) => c.name.includes(target.toLowerCase()))?.status || 'missing',
      role,
      impact,
      nextStep: next,
      investigationCmd: cmd,
    });
  };

  if (!dockerAvailable) {
    addFailure(
      'Docker',
      'DAEMON DOWN',
      0,
      'REQUIRED',
      'Cannot manage containers',
      'Restart Colima',
      'colima restart',
    );
  }

  if (!appH.ok)
    addFailure(
      'App',
      appH.status,
      PORTS.APP,
      'REQUIRED',
      'API unavailable',
      'Check container logs',
      'docker logs phalanx-app',
    );
  if (!pgC.ready)
    addFailure(
      'Postgres',
      pgC.health,
      PORTS.POSTGRES,
      'REQUIRED',
      'DB unreachable',
      'Restart stack',
      'pnpm docker:up',
    );
  if (!clientH.ok)
    addFailure(
      'Client',
      clientH.status,
      PORTS.CLIENT,
      'REQUIRED',
      'Web UI unavailable',
      'Check container logs',
      'docker logs phalanx-client',
    );

  if (otel.status === 'FAILED' || (otel.collectorType === 'CONTAINER' && !otel.collectorRunning)) {
    addFailure(
      'OTel',
      'COLLECTOR MISSING',
      PORTS.OTEL_HTTP,
      'REQUIRED',
      'Pipeline degraded',
      'Start collector profile',
      'pnpm docker:up --profile staging',
    );
  } else if (otel.status === 'DEGRADED') {
    addFailure(
      'OTel',
      'HOST COLLECTOR DOWN',
      PORTS.OTEL_HTTP,
      'OPTIONAL',
      'Local observability missing',
      'Ensure host LGTM is running',
      'pnpm infra:otel:collector',
    );
  }

  if (
    containers.some(
      (c) => c.status === 'missing' || (c.status === 'exited' && !c.name.includes('otel')),
    )
  ) {
    state.recoveryCommands.push({
      label: 'Start Stack',
      command: 'pnpm docker:up',
      reason: 'Stopped containers detected',
      priority: 'HIGH',
    });
  }
  if (!nodeMatch) {
    state.recoveryCommands.push({
      label: 'Align Node',
      command: 'mise install node',
      reason: 'Toolchain drift detected',
      priority: 'HIGH',
    });
  }
  if (!identityMatch) {
    state.recoveryCommands.push({
      label: 'Update Server Container',
      command: 'pnpm docker:up app-dev',
      reason: 'Live server is serving stale build artifacts',
      priority: 'HIGH',
    });
  }
  if (isStale) {
    state.recoveryCommands.push({
      label: 'Verify Local Code',
      command: 'pnpm verify:quick',
      reason: 'Source code changed since last validation',
      priority: 'LOW',
    });
  }

  if (state.failures.some((f) => f.role === 'REQUIRED')) {
    state.overallStatus = 'FAILED';
    state.statusReason = state.failures.find((f) => f.role === 'REQUIRED')?.impact;
  } else if (!identityMatch) {
    state.overallStatus = 'DEGRADED';
    state.statusReason = 'Server Build Mismatch';
  } else if (state.failures.length > 0) {
    state.overallStatus = 'DEGRADED';
    state.statusReason = state.failures[0].impact;
  } else if (isStale) {
    state.overallStatus = 'DEGRADED';
    state.statusReason = 'Validation is stale';
  } else if (!nodeMatch) {
    state.overallStatus = 'DEGRADED';
    state.statusReason = 'Node version drift';
  }

  return state;
}

// --- Rendering ---

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const NC = '\x1b[0m';

function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

function padRow(label: string, value: string, color: string = NC) {
  const visibleLabel = stripAnsi(label);
  return `  ${BOLD}${label}${NC}${' '.repeat(Math.max(0, 18 - visibleLabel.length))} : ${color}${value}${NC}`;
}

function renderDashboard(state: EnvState): string {
  let out = '';
  const statusColor =
    state.overallStatus === 'HEALTHY' ? GREEN : state.overallStatus === 'DEGRADED' ? YELLOW : RED;
  const reasonText = state.statusReason ? ` (${state.statusReason})` : '';

  out += `\n ${CYAN}${BOLD}PHALANX DUEL OPERATIONAL COCKPIT${NC} ${' '.repeat(10)} [${statusColor}${BOLD}${state.overallStatus}${NC}${statusColor}${reasonText}${NC}]\n`;
  out += ` ${DIM}Refreshed: ${timestamp()}${NC}\n\n`;

  out += ` ${BLUE}${BOLD}CONTAINERS${NC}\n`;
  for (const c of state.containers) {
    if (c.name.includes('otel') && state.services.otel.role === 'DISABLED') continue;
    const color = c.ready ? GREEN : c.status === 'running' ? YELLOW : RED;
    const restarts = c.restarts > 0 ? ` ${RED}[R:${c.restarts}]${NC}` : '';
    out +=
      padRow(
        c.name.replace('phalanx-', ''),
        `${c.status.toUpperCase()} (${c.health})${restarts}`,
        color,
      ) + '\n';
  }

  out += `\n ${BLUE}${BOLD}SERVICES & ENDPOINTS${NC}\n`;
  for (const key of ['app', 'admin', 'client', 'postgres', 'automation'] as const) {
    const s = state.services[key];
    const color = s.status === 'READY' ? GREEN : s.status === 'OPTIONAL' ? BLUE : RED;
    out += padRow(s.name, `${s.status} (${s.message})`, color) + '\n';
  }

  out += `\n ${BLUE}${BOLD}OPERATIONAL METRICS${NC}\n`;
  if (state.metrics.status === 'AVAILABLE') {
    out += padRow('Active Matches', String(state.metrics.activeMatches), CYAN) + '\n';
    out += padRow('Total Matches', String(state.metrics.totalMatches), CYAN) + '\n';
  } else {
    out += padRow('Metrics', `UNAVAILABLE (${state.metrics.dependencyError})`, RED) + '\n';
  }

  out += `\n ${BLUE}${BOLD}OBSERVABILITY PIPELINE${NC}\n`;
  const otel = state.services.otel;
  const otelColor =
    otel.status === 'READY'
      ? GREEN
      : otel.status === 'DISABLED'
        ? BLUE
        : otel.status === 'DEGRADED'
          ? YELLOW
          : RED;
  out += padRow('Pipeline', `${otel.status} (${otel.collectorType})`, otelColor) + '\n';
  out +=
    padRow(
      'App Telemetry',
      otel.appTelemetry ? 'EMITTING' : 'INACTIVE',
      otel.appTelemetry ? GREEN : RED,
    ) + '\n';
  out += padRow('Log Flow', otel.logFlow) + '\n';

  out += `\n ${BLUE}${BOLD}WORKSPACE & GIT${NC}\n`;
  out +=
    padRow('Branch/Commit', `${state.git.branch} @ ${state.git.commit} (${state.git.commitAge})`) +
    '\n';
  if (state.serverIdentity) {
    const id = state.serverIdentity;
    const color = id.match ? GREEN : RED;
    out +=
      padRow(
        'Server Identity',
        `${id.hostSha} (Host) vs ${id.liveSha} (Live) [${id.liveBuild}]`,
        color,
      ) + '\n';
  }
  out +=
    padRow(
      'Working Tree',
      state.git.isDirty
        ? `${YELLOW}${state.git.changes} files (${state.git.dirtyLatency} dirty)${NC}`
        : 'CLEAN',
      state.git.isDirty ? YELLOW : GREEN,
    ) + '\n';
  out +=
    padRow(
      'Validation',
      state.validation.isStale
        ? `STALE (${state.validation.lastVerifyAge})`
        : `CURRENT (${state.validation.lastVerifyAge})`,
      state.validation.isStale ? YELLOW : GREEN,
    ) + '\n';
  out +=
    padRow(
      'Node Parity',
      state.toolchain.nodeMatch ? 'MATCH' : 'DRIFT',
      state.toolchain.nodeMatch ? GREEN : RED,
    ) + '\n';

  if (state.backlog.activeTasks.length > 0) {
    out += `\n ${BLUE}${BOLD}ACTIVE WORK (Backlog)${NC}\n`;
    for (const t of state.backlog.activeTasks.slice(0, 4)) {
      out += padRow(`Task ${t.id}`, t.title, CYAN) + '\n';
    }
  }

  out += `\n ${BLUE}${BOLD}QUICK LINKS${NC}\n`;
  for (const l of state.links.slice(0, 3)) {
    out += padRow(l.label, l.url, CYAN) + '\n';
  }

  if (state.failures.length > 0) {
    out += `\n ${RED}${BOLD}FAILURE INVESTIGATION${NC}\n`;
    const f = state.failures[0];
    out += padRow('Target', f.target, RED) + '\n';
    out += padRow('Impact', f.impact) + '\n';
    out += padRow('Investigate', f.investigationCmd, BOLD) + '\n';
  }

  out += `\n ${YELLOW}${BOLD}RECOVERY / RECONCILE${NC}\n`;
  if (state.recoveryCommands.length === 0) {
    out += `  ${GREEN}System healthy. No actions required.${NC}\n`;
  } else {
    for (const cmd of state.recoveryCommands.slice(0, 2)) {
      out += padRow(cmd.label, cmd.command, BOLD) + '\n';
    }
  }

  out += `\n ${DIM}(Ctrl+C to exit) | Snapshots: pnpm dev:status / dev:verify${NC}\n`;

  return out;
}

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
}

// --- Entry Points ---

async function main() {
  const args = process.argv.slice(2);
  const isJson = args.includes('--json') || args.includes('status');
  const isVerify = args.includes('--verify') || args.includes('verify');
  const isOnce = args.includes('--once') || args.includes('once');

  if (isJson) {
    const state = await collectState();
    console.log(JSON.stringify(state, null, 2));
    return;
  }

  if (isVerify) {
    console.log('🔍 Running Deep Environment Verification...\n');
    const state = await collectState();
    console.log(renderDashboard(state));
    process.exit(state.overallStatus === 'FAILED' ? 1 : 0);
  }

  if (isOnce) {
    const state = await collectState();
    console.log(renderDashboard(state));
    return;
  }

  // Interactive Mode
  process.stdout.write('\x1b[2J');
  process.stdout.write('\x1b[?25l');

  const handleExit = () => {
    process.stdout.write('\x1b[?25h\n');
    process.exit(0);
  };
  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);

  while (true) {
    const state = await collectState();
    const frame = renderDashboard(state);
    process.stdout.write('\x1b[H\x1b[J' + frame);
    await new Promise((r) => setTimeout(r, REFRESH_INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error('\n💥 Cockpit Crash:', err);
  process.exit(1);
});
