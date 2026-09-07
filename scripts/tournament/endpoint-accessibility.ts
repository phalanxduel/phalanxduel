import { execSync } from 'node:child_process';
import * as dns from 'node:dns/promises';
import * as https from 'node:https';
import * as net from 'node:net';
import * as os from 'node:os';

// Ponytail rule: native Node.js and zero external dependencies

export interface EndpointCheck {
  id: string;
  name: string;
  role: 'client' | 'server' | 'admin' | 'demo' | 'observability' | 'database';
  domain: string;
  port: number;
  protocol: 'https' | 'http' | 'tcp';
  path?: string;
  description: string;
  isOptional?: boolean;
}

export interface FirewallInspection {
  platform: string;
  enabled: boolean;
  blockAll: boolean;
  stealthMode: boolean;
  isNodeAllowed: boolean;
  isNginxAllowed: boolean;
  totalAppRules: number;
  blockedApps: string[];
  allowedApps: string[];
  summary: string;
  diagnostics: string[];
}

export type EndpointVerdict =
  | 'READY'
  | 'LOCAL_ONLY'
  | 'FIREWALL_BLOCKED'
  | 'NETWORK_BLOCKED'
  | 'DNS_MISMATCH'
  | 'PORT_CLOSED'
  | 'UNRESOLVED';

export type ProbeFailureCause =
  | 'SERVICE_DOWN'
  | 'LOCAL_BIND_ONLY'
  | 'FIREWALL_BLOCKED'
  | 'NETWORK_CLIENT_ISOLATION'
  | 'DNS_MISMATCH'
  | 'DNS_UNRESOLVED'
  | 'NONE';

export interface EndpointResult {
  endpoint: EndpointCheck;
  dns: {
    resolvedIps: string[];
    matchesLanIp: boolean;
    status: 'MATCH' | 'MISMATCH' | 'UNRESOLVED' | 'SKIPPED';
  };
  listener: {
    active: boolean;
    bindAddress: string;
    processName?: string;
    pid?: number;
    lanExposed: boolean;
  };
  reachability: {
    lanReachable: boolean;
    lanLatencyMs: number | null;
    domainReachable: boolean;
    domainLatencyMs: number | null;
    httpStatus?: number;
    httpLatencyMs?: number;
    error?: string;
  };
  verdict: EndpointVerdict;
  failureCause?: ProbeFailureCause;
  remedy?: string;
}

export const CANONICAL_TOURNAMENT_ENDPOINTS: EndpointCheck[] = [
  {
    id: 'client-tls',
    name: 'Game Client (TLS)',
    role: 'client',
    domain: 'play.lan.phalanxduel.com',
    port: 443,
    protocol: 'https',
    path: '/',
    description: 'Primary player battle arena UI (Nginx TLS -> Vite)',
  },
  {
    id: 'client-http',
    name: 'Game Client (HTTP)',
    role: 'client',
    domain: 'play.lan.phalanxduel.com',
    port: 80,
    protocol: 'http',
    path: '/',
    description: 'Player battle arena fallback HTTP ingress',
  },
  {
    id: 'server-direct',
    name: 'Game Server (Direct)',
    role: 'server',
    domain: 'api.lan.phalanxduel.com',
    port: 3001,
    protocol: 'http',
    path: '/health',
    description: 'Fastify authoritative game engine REST API & WebSocket (/ws)',
  },
  {
    id: 'demo-landing',
    name: 'Demo Presentation',
    role: 'demo',
    domain: 'lan.phalanxduel.com',
    port: 443,
    protocol: 'https',
    path: '/',
    description: 'Tournament demo presentation & landing site (Nginx)',
  },
  {
    id: 'demo-cockpit',
    name: 'Demo Cockpit Bridge',
    role: 'demo',
    domain: 'lan.phalanxduel.com',
    port: 3333,
    protocol: 'http',
    path: '/health',
    description: 'Demo cockpit HTTP media & playback bridge',
    isOptional: true,
  },
  {
    id: 'admin-console',
    name: 'Admin Console',
    role: 'admin',
    domain: 'admin.lan.phalanxduel.com',
    port: 443,
    protocol: 'https',
    path: '/',
    description: 'Tournament bracket & match arbitration console',
    isOptional: true,
  },
  {
    id: 'client-vite',
    name: 'Vite Dev Server',
    role: 'client',
    domain: 'play.lan.phalanxduel.com',
    port: 5173,
    protocol: 'http',
    path: '/',
    description: 'Local frontend dev server (upstream for Nginx /play)',
  },
  {
    id: 'postgres',
    name: 'PostgreSQL Database',
    role: 'database',
    domain: '127.0.0.1',
    port: 5432,
    protocol: 'tcp',
    description: 'Postgres match persistence and replay store',
  },
  {
    id: 'otel-collector',
    name: 'OTel Collector',
    role: 'observability',
    domain: '127.0.0.1',
    port: 4318,
    protocol: 'http',
    path: '/v1/traces',
    description: 'OpenTelemetry collector for tournament match telemetry',
    isOptional: true,
  },
  {
    id: 'openobserve',
    name: 'OpenObserve (o2)',
    role: 'observability',
    domain: 'o2.lan.phalanxduel.com',
    port: 5080,
    protocol: 'http',
    path: '/',
    description: 'Longitudinal logs, metrics & RUM analytics backend',
    isOptional: true,
  },
  {
    id: 'jaeger',
    name: 'Jaeger UI',
    role: 'observability',
    domain: 'jaeger.lan.phalanxduel.com',
    port: 16686,
    protocol: 'http',
    path: '/',
    description: 'Distributed match tracing dashboard',
    isOptional: true,
  },
];

export function getActiveLanIp(): string {
  const ifaces = os.networkInterfaces();
  for (const [_, addrs] of Object.entries(ifaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (
        addr.family === 'IPv4' &&
        !addr.internal &&
        (addr.address.startsWith('10.') ||
          addr.address.startsWith('192.168.') ||
          addr.address.startsWith('172.'))
      ) {
        return addr.address;
      }
    }
  }
  return '127.0.0.1';
}

export function inspectLocalFirewall(): FirewallInspection {
  const platform = process.platform;
  if (platform !== 'darwin') {
    return {
      platform,
      enabled: false,
      blockAll: false,
      stealthMode: false,
      isNodeAllowed: true,
      isNginxAllowed: true,
      totalAppRules: 0,
      blockedApps: [],
      allowedApps: [],
      summary: `Non-macOS platform (${platform}); Application Firewall checks skipped`,
      diagnostics: [`Firewall inspection not active for ${platform}`],
    };
  }

  try {
    const globalOut = execSync(
      '/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null',
      { encoding: 'utf8' },
    );
    const blockAllOut = execSync(
      '/usr/libexec/ApplicationFirewall/socketfilterfw --getblockall 2>/dev/null',
      { encoding: 'utf8' },
    );
    const stealthOut = execSync(
      '/usr/libexec/ApplicationFirewall/socketfilterfw --getstealthmode 2>/dev/null',
      { encoding: 'utf8' },
    );

    let appsOut = '';
    try {
      appsOut = execSync('/usr/libexec/ApplicationFirewall/socketfilterfw --listapps 2>/dev/null', {
        encoding: 'utf8',
      });
    } catch {
      // unprivileged or no custom rules
    }

    const enabled = /State = 1|enabled/i.test(globalOut);
    const blockAll = /block all.+enabled|is enabled/i.test(blockAllOut);
    const stealthMode = /stealth mode.+enabled|is on/i.test(stealthOut);

    const regex =
      /(\d+)\s*:\s*(.+?)\s*\n\s*\((Allow incoming connections|Block incoming connections)\)/g;
    const allowedApps: string[] = [];
    const blockedApps: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(appsOut)) !== null) {
      const appPath = match[2].trim();
      const isAllowed = match[3].includes('Allow');
      if (isAllowed) {
        allowedApps.push(appPath);
      } else {
        blockedApps.push(appPath);
      }
    }

    let activeNginxPath = '';
    try {
      activeNginxPath = execSync(
        'readlink -f $(which nginx 2>/dev/null) 2>/dev/null || which nginx 2>/dev/null',
        { encoding: 'utf8' },
      ).trim();
    } catch {}

    let activeNodePath = '';
    try {
      activeNodePath = execSync('node -e "console.log(process.execPath)" 2>/dev/null', {
        encoding: 'utf8',
      }).trim();
    } catch {}

    const isNodeBlocked = blockedApps.some(
      (p) => p === activeNodePath || (activeNodePath === '' && p.endsWith('/node')),
    );
    const isNginxBlocked = blockedApps.some(
      (p) => p === activeNginxPath || (activeNginxPath === '' && p.endsWith('/nginx')),
    );

    const isNodeAllowed = !isNodeBlocked;
    const isNginxAllowed = !isNginxBlocked;

    const diagnostics: string[] = [];
    if (!enabled) {
      diagnostics.push(
        '🟢 macOS Application Firewall is DISABLED (incoming LAN traffic permitted).',
      );
    } else if (blockAll) {
      diagnostics.push(
        '🔴 CRITICAL: macOS Application Firewall "Block All Incoming Connections" is ENABLED. All tournament players will be blocked!',
      );
    } else {
      diagnostics.push(
        '🟢 macOS Application Firewall is ENABLED with selective application filtering.',
      );
      if (isNodeAllowed && isNginxAllowed) {
        diagnostics.push('✅ Both Node.js and Nginx have incoming connections allowed.');
      } else {
        if (!isNodeAllowed)
          diagnostics.push('❌ Node.js is explicitly BLOCKED in Application Firewall.');
        if (!isNginxAllowed)
          diagnostics.push('❌ Nginx is explicitly BLOCKED in Application Firewall.');
      }
    }

    if (stealthMode) {
      diagnostics.push(
        '⚠️ Stealth mode is ON: ICMP ping / echo requests will be dropped by macOS.',
      );
    }

    const summary = !enabled
      ? 'Firewall: Disabled (Allow All)'
      : blockAll
        ? 'Firewall: Block All Incoming Connections'
        : `Firewall: Active (${allowedApps.length} allowed, ${blockedApps.length} blocked)`;

    return {
      platform,
      enabled,
      blockAll,
      stealthMode,
      isNodeAllowed,
      isNginxAllowed,
      totalAppRules: allowedApps.length + blockedApps.length,
      blockedApps,
      allowedApps,
      summary,
      diagnostics,
    };
  } catch (err: unknown) {
    return {
      platform,
      enabled: false,
      blockAll: false,
      stealthMode: false,
      isNodeAllowed: true,
      isNginxAllowed: true,
      totalAppRules: 0,
      blockedApps: [],
      allowedApps: [],
      summary: `Firewall query failed: ${err instanceof Error ? err.message : String(err)}`,
      diagnostics: ['Unable to inspect socketfilterfw (permissions or missing binary)'],
    };
  }
}

export function getHostListeners(): Map<number, { bind: string; process?: string; pid?: number }> {
  const map = new Map<number, { bind: string; process?: string; pid?: number }>();
  try {
    const out = execSync('netstat -anv -p tcp | grep LISTEN', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    for (const line of out.trim().split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 4) {
        const local = parts[3];
        const lastDot = local.lastIndexOf('.');
        if (lastDot !== -1) {
          const hostPart = local.slice(0, lastDot);
          const portStr = local.slice(lastDot + 1);
          const port = Number.parseInt(portStr, 10);
          if (!Number.isNaN(port)) {
            let procInfo: string | undefined;
            let pidInfo: number | undefined;
            const procCol = parts.find((p) => p.includes(':'));
            if (procCol && procCol !== local) {
              const [pname, pidStr] = procCol.split(':');
              procInfo = pname;
              pidInfo = Number.parseInt(pidStr, 10);
            }
            map.set(port, {
              bind: hostPart,
              process: procInfo,
              pid: pidInfo,
            });
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return map;
}

export function testTcpHandshake(
  host: string,
  port: number,
  timeoutMs = 600,
): Promise<{ ok: boolean; ms: number | null }> {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      const end = process.hrtime.bigint();
      socket.destroy();
      const ms = Number(end - start) / 1_000_000;
      resolve({ ok: true, ms: Math.round(ms * 10) / 10 });
    });

    socket.on('error', () => {
      socket.destroy();
      resolve({ ok: false, ms: null });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ ok: false, ms: null });
    });
  });
}

export function testHttpEndpoint(
  url: string,
  timeoutMs = 1000,
): Promise<{ ok: boolean; status?: number; ms?: number; error?: string }> {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    try {
      const parsed = new URL(url);
      const isHttps = parsed.protocol === 'https:';

      if (isHttps) {
        // Node native https request ignoring self-signed local certificates for tournament test
        const req = https.request(
          url,
          {
            method: 'GET',
            rejectUnauthorized: false,
            timeout: timeoutMs,
            headers: { 'User-Agent': 'phx-tournament-verifier/1.0' },
          },
          (res) => {
            const end = process.hrtime.bigint();
            const ms = Math.round(Number(end - start) / 100_000) / 10;
            res.resume(); // consume body
            resolve({ ok: (res.statusCode ?? 0) < 500, status: res.statusCode, ms });
          },
        );

        req.on('error', (err) => {
          resolve({ ok: false, error: err.message });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ ok: false, error: 'TIMEOUT' });
        });

        req.end();
      } else {
        fetch(url, {
          signal: AbortSignal.timeout(timeoutMs),
          headers: { 'User-Agent': 'phx-tournament-verifier/1.0' },
        })
          .then((res) => {
            const end = process.hrtime.bigint();
            const ms = Math.round(Number(end - start) / 100_000) / 10;
            resolve({ ok: res.status < 500, status: res.status, ms });
          })
          .catch((err: unknown) => {
            resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
          });
      }
    } catch (err: unknown) {
      resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });
}

export async function probeEndpoint(
  ep: EndpointCheck,
  lanIp: string,
  listeners: Map<number, { bind: string; process?: string; pid?: number }>,
  firewall?: FirewallInspection,
): Promise<EndpointResult> {
  const isIp = /^[0-9.]+$/.test(ep.domain);

  // 1. DNS Resolution
  let resolvedIps: string[] = [];
  let dnsStatus: EndpointResult['dns']['status'] = 'SKIPPED';
  let matchesLanIp = false;

  if (isIp) {
    resolvedIps = [ep.domain];
    matchesLanIp = ep.domain === lanIp || ep.domain === '127.0.0.1';
    dnsStatus = 'MATCH';
  } else {
    try {
      resolvedIps = await dns.resolve4(ep.domain);
      matchesLanIp = resolvedIps.includes(lanIp);
      dnsStatus = matchesLanIp ? 'MATCH' : 'MISMATCH';
    } catch {
      dnsStatus = 'UNRESOLVED';
    }
  }

  // 2. Listener Check
  const listenerInfo = listeners.get(ep.port);
  const active = Boolean(listenerInfo);
  const bind = listenerInfo?.bind ?? 'none';
  const lanExposed = bind === '*' || bind === '0.0.0.0' || bind === '::' || bind === lanIp;

  // 3. Reachability Probes
  // Test LAN IP socket connectivity
  const lanCheck = await testTcpHandshake(lanIp, ep.port, 400);

  // Test domain connectivity if resolved
  let domainCheck = { ok: false, ms: null as number | null };
  if (resolvedIps.length > 0) {
    domainCheck = await testTcpHandshake(resolvedIps[0], ep.port, 400);
  }

  // Test HTTP endpoint if applicable
  let httpRes: { ok: boolean; status?: number; ms?: number; error?: string } | undefined;
  if (ep.protocol === 'http' || ep.protocol === 'https') {
    const testUrl = isIp
      ? `${ep.protocol}://${lanIp}:${ep.port}${ep.path || '/'}`
      : `${ep.protocol}://${ep.domain}${ep.port === 80 || ep.port === 443 ? '' : `:${ep.port}`}${ep.path || '/'}`;
    httpRes = await testHttpEndpoint(testUrl, 600);
  }

  // 4. Verdict formulation
  let verdict: EndpointVerdict = 'READY';
  let failureCause: ProbeFailureCause = 'NONE';
  let remedy: string | undefined;

  if (!active && !domainCheck.ok && !lanCheck.ok) {
    verdict = 'PORT_CLOSED';
    failureCause = 'SERVICE_DOWN';
    remedy = `Service not listening on port :${ep.port}. Start the service with pnpm services.`;
  } else if (!isIp && dnsStatus === 'UNRESOLVED') {
    verdict = 'UNRESOLVED';
    failureCause = 'DNS_UNRESOLVED';
    remedy = `DNS cannot resolve ${ep.domain}. Add A-record pointing to ${lanIp}.`;
  } else if (!isIp && dnsStatus === 'MISMATCH') {
    verdict = 'DNS_MISMATCH';
    failureCause = 'DNS_MISMATCH';
    remedy = `${ep.domain} points to ${resolvedIps.join(', ')}, but local LAN IP is ${lanIp}. Update DNS A-record.`;
  } else if (active && !lanExposed && !lanCheck.ok) {
    verdict = 'LOCAL_ONLY';
    failureCause = 'LOCAL_BIND_ONLY';
    remedy = `Service on :${ep.port} is bound to 127.0.0.1 (${bind}). Restart service with --host 0.0.0.0 to allow LAN tournament players.`;
  } else if (active && lanExposed && !lanCheck.ok) {
    const isFwDropping =
      firewall?.blockAll ||
      (firewall?.blockedApps &&
        listenerInfo?.process &&
        firewall.blockedApps.some((p) => p.includes(listenerInfo.process!)));
    if (isFwDropping) {
      verdict = 'FIREWALL_BLOCKED';
      failureCause = 'FIREWALL_BLOCKED';
      remedy = `Service on :${ep.port} is bound to 0.0.0.0, but local OS firewall dropped incoming packets. Check socketfilterfw / pf.`;
    } else {
      verdict = 'NETWORK_BLOCKED';
      failureCause = 'NETWORK_CLIENT_ISOLATION';
      remedy = `Service on :${ep.port} is bound to 0.0.0.0, but LAN socket connection failed. Verify local subnet and Wi-Fi client isolation.`;
    }
  } else {
    verdict = 'READY';
    failureCause = 'NONE';
  }

  return {
    endpoint: ep,
    dns: {
      resolvedIps,
      matchesLanIp,
      status: dnsStatus,
    },
    listener: {
      active,
      bindAddress: bind,
      processName: listenerInfo?.process,
      pid: listenerInfo?.pid,
      lanExposed,
    },
    reachability: {
      lanReachable: lanCheck.ok,
      lanLatencyMs: lanCheck.ms,
      domainReachable: domainCheck.ok,
      domainLatencyMs: domainCheck.ms,
      httpStatus: httpRes?.status,
      httpLatencyMs: httpRes?.ms,
      error: httpRes?.error,
    },
    verdict,
    failureCause,
    remedy,
  };
}

export async function runAllEndpointChecks(customEndpoints?: EndpointCheck[]): Promise<{
  lanIp: string;
  firewall: FirewallInspection;
  results: EndpointResult[];
  allReady: boolean;
  criticalMissing: string[];
}> {
  const lanIp = getActiveLanIp();
  const listeners = getHostListeners();
  const firewall = inspectLocalFirewall();
  const endpoints = customEndpoints || CANONICAL_TOURNAMENT_ENDPOINTS;

  const results = await Promise.all(
    endpoints.map((ep) => probeEndpoint(ep, lanIp, listeners, firewall)),
  );

  const criticalMissing: string[] = [];
  for (const r of results) {
    if (!r.endpoint.isOptional && r.verdict !== 'READY') {
      criticalMissing.push(`${r.endpoint.name} (${r.verdict})`);
    }
  }

  return {
    lanIp,
    firewall,
    results,
    allReady: criticalMissing.length === 0,
    criticalMissing,
  };
}

export function renderAccessibilityMatrixTerminal(
  report: Awaited<ReturnType<typeof runAllEndpointChecks>>,
): string {
  const lines: string[] = [];

  lines.push(
    '\x1b[1;36m┌──────────────────────────────┬────────┬───────────┬──────────────┬──────────────┬──────────────────────┐\x1b[0m',
  );
  lines.push(
    '\x1b[1;36m│                    TOURNAMENT & DEMONSTRATION DOMAINS & PORTS ACCESSIBILITY MATRIX                     │\x1b[0m',
  );
  lines.push(
    `\x1b[1;36m│ Active LAN IP: \x1b[1;32m${report.lanIp.padEnd(16)}\x1b[1;36m Status: ${report.allReady ? '\x1b[1;42m ALL CRITICAL SERVICES READY \x1b[0m' : '\x1b[1;41m ATTENTION REQUIRED \x1b[0m'}                        \x1b[1;36m│\x1b[0m`,
  );
  lines.push(
    '\x1b[1;36m├──────────────────────────────┼────────┼───────────┼──────────────┼──────────────┼──────────────────────┤\x1b[0m',
  );
  lines.push(
    '\x1b[1;37m│ Service / Target             │ Port   │ DNS Match │ LAN Bind     │ Live Probe   │ Tournament Verdict   │\x1b[0m',
  );
  lines.push(
    '\x1b[1;36m├──────────────────────────────┼────────┼───────────┼──────────────┼──────────────┼──────────────────────┤\x1b[0m',
  );

  for (const r of report.results) {
    const rawName = r.endpoint.name.padEnd(28).slice(0, 28);
    const rawPort = `:${r.endpoint.port}`.padEnd(6);

    let dnsText = '';
    let dnsColor = '';
    if (r.dns.status === 'MATCH') {
      dnsText = '✓ MATCH  ';
      dnsColor = '\x1b[1;32m';
    } else if (r.dns.status === 'MISMATCH') {
      dnsText = '≠ WRONG  ';
      dnsColor = '\x1b[1;33m';
    } else if (r.dns.status === 'UNRESOLVED') {
      dnsText = '✗ NXDOM  ';
      dnsColor = '\x1b[1;31m';
    } else {
      dnsText = '(local)  ';
      dnsColor = '\x1b[2m';
    }
    const dnsFormatted = `${dnsColor}${dnsText}\x1b[0m`;

    let bindText = '';
    let bindColor = '';
    if (r.listener.active) {
      if (r.listener.lanExposed) {
        bindText = '* (LAN Exposed)';
        bindColor = '\x1b[1;32m';
      } else {
        bindText = '127.0.0.1 (Loc)';
        bindColor = '\x1b[1;33m';
      }
    } else {
      bindText = 'PORT CLOSED   ';
      bindColor = '\x1b[1;31m';
    }
    const bindFormatted = `${bindColor}${bindText.padEnd(12).slice(0, 12)}\x1b[0m`;

    let probeText = '';
    let probeColor = '';
    if (r.reachability.httpStatus) {
      const ms = r.reachability.httpLatencyMs ? `${r.reachability.httpLatencyMs}ms` : '';
      probeText = `${r.reachability.httpStatus} OK ${ms}`.padEnd(12).slice(0, 12);
      probeColor = '\x1b[1;32m';
    } else if (r.reachability.lanReachable) {
      const ms = r.reachability.lanLatencyMs ? `${r.reachability.lanLatencyMs}ms` : '';
      probeText = `TCP OK ${ms}`.padEnd(12).slice(0, 12);
      probeColor = '\x1b[1;32m';
    } else {
      probeText = 'UNREACHABLE ';
      probeColor = '\x1b[1;31m';
    }
    const probeFormatted = `${probeColor}${probeText}\x1b[0m`;

    let verdictText = '';
    let verdictColor = '';
    if (r.verdict === 'READY') {
      verdictText = '● ACCESSIBLE (LAN) ';
      verdictColor = '\x1b[1;32m';
    } else if (r.verdict === 'LOCAL_ONLY') {
      verdictText = '▲ LOCAL ONLY (WARN)';
      verdictColor = '\x1b[1;33m';
    } else if (r.verdict === 'DNS_MISMATCH') {
      verdictText = '◆ DNS MISMATCH     ';
      verdictColor = '\x1b[1;33m';
    } else if (r.verdict === 'FIREWALL_BLOCKED') {
      verdictText = '⛔ FIREWALL BLOCKED ';
      verdictColor = '\x1b[1;31m';
    } else if (r.verdict === 'NETWORK_BLOCKED') {
      verdictText = '⚡ NETWORK BLOCKED  ';
      verdictColor = '\x1b[1;31m';
    } else if (r.verdict === 'PORT_CLOSED') {
      verdictText = r.endpoint.isOptional ? '○ OPTIONAL (OFF)   ' : '✖ SERVICE DOWN     ';
      verdictColor = r.endpoint.isOptional ? '\x1b[2m' : '\x1b[1;31m';
    } else {
      verdictText = '✖ UNRESOLVED       ';
      verdictColor = '\x1b[1;31m';
    }
    const verdictFormatted = `${verdictColor}${verdictText}\x1b[0m`;

    lines.push(
      `│ ${rawName} │ ${rawPort} │ ${dnsFormatted} │ ${bindFormatted} │ ${probeFormatted} │ ${verdictFormatted} │`,
    );
  }

  lines.push(
    '\x1b[1;36m└──────────────────────────────┴────────┴───────────┴──────────────┴──────────────┴──────────────────────┘\x1b[0m',
  );

  if (report.firewall) {
    const fwColor = report.firewall.blockAll
      ? '\x1b[1;31m'
      : report.firewall.enabled
        ? '\x1b[1;32m'
        : '\x1b[1;33m';
    lines.push(
      `\x1b[1;30m[Firewall]\x1b[0m ${fwColor}${report.firewall.summary}\x1b[0m | Stealth: ${report.firewall.stealthMode ? '\x1b[1;33mON\x1b[0m' : 'OFF'} | Inbound Node: ${report.firewall.isNodeAllowed ? '\x1b[1;32mALLOW\x1b[0m' : '\x1b[1;31mBLOCK\x1b[0m'} | Inbound Nginx: ${report.firewall.isNginxAllowed ? '\x1b[1;32mALLOW\x1b[0m' : '\x1b[1;31mBLOCK\x1b[0m'}`,
    );
  }

  const remedies = report.results.filter(
    (r) => r.remedy && !r.endpoint.isOptional && r.verdict !== 'READY',
  );
  if (remedies.length > 0) {
    lines.push('\n\x1b[1;33m[!] ACTIONS REQUIRED BEFORE DEMO / TOURNAMENT:\x1b[0m');
    for (const rem of remedies) {
      lines.push(` • \x1b[1;37m${rem.endpoint.name}\x1b[0m: ${rem.remedy}`);
    }
  }

  return lines.join('\n');
}
