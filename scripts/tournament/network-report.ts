/**
 * scripts/tournament/network-report.ts
 *
 * Tournament Networking & DNS Manager for Phalanx Duel.
 * Detects local network interfaces, public IP, tests live DNS resolution,
 * probes service listener reachability, and prints exact DNS A-records
 * needed for on-site tournament hosting.
 *
 * Usage:
 *  pnpm tsx scripts/tournament/network-report.ts [--domain lan.phalanxduel.com] [--json] [--markdown]
 */

import { execSync } from 'node:child_process';
import dns from 'node:dns/promises';
import net from 'node:net';
import os from 'node:os';

interface InterfaceInfo {
  name: string;
  address: string;
  netmask: string;
  mac: string;
}

interface DnsProbe {
  domain: string;
  resolvedIps: string[];
  matchesLan: boolean;
  status: 'MATCH' | 'MISMATCH' | 'UNRESOLVED';
  error?: string;
}

interface ServiceProbe {
  name: string;
  port: number;
  protocol: 'HTTP' | 'TCP';
  localLive: boolean;
  lanLive: boolean;
  details?: string;
}

interface NetworkReport {
  timestamp: string;
  targetDomain: string;
  lanInterface: InterfaceInfo | null;
  allInterfaces: InterfaceInfo[];
  gateway: string | null;
  publicIp: string | null;
  dnsServers: string[];
  dnsProbes: DnsProbe[];
  serviceProbes: ServiceProbe[];
  recommendedRecords: Array<{
    name: string;
    type: string;
    value: string;
    ttl: number;
    purpose: string;
  }>;
  overallStatus: 'READY' | 'NEEDS_DNS_UPDATE' | 'SERVICES_DOWN';
}

// ponytail: detect primary default gateway via native OS routing table
function getDefaultGateway(): { gateway: string | null; iface: string | null } {
  try {
    if (process.platform === 'darwin') {
      const out = execSync('route -n get default 2>/dev/null', { encoding: 'utf8' });
      const gwMatch = out.match(/gateway:\s+([0-9.]+)/);
      const ifMatch = out.match(/interface:\s+(\w+)/);
      return {
        gateway: gwMatch ? gwMatch[1] : null,
        iface: ifMatch ? ifMatch[1] : null,
      };
    } else if (process.platform === 'linux') {
      const out = execSync('ip route show default 2>/dev/null', { encoding: 'utf8' });
      const match = out.match(/default via ([0-9.]+) dev (\w+)/);
      return {
        gateway: match ? match[1] : null,
        iface: match ? match[2] : null,
      };
    }
  } catch {
    // fallback
  }
  return { gateway: null, iface: null };
}

async function getPublicIp(): Promise<string | null> {
  const providers = ['https://api.ipify.org', 'https://icanhazip.com', 'https://ifconfig.me/ip'];
  for (const url of providers) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      if (res.ok) {
        const text = (await res.text()).trim();
        if (net.isIPv4(text)) return text;
      }
    } catch {
      // try next provider
    }
  }
  return null;
}

function probePort(host: string, port: number, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected = false;

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      isConnected = true;
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function probeHttp(url: string, timeoutMs = 1200): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res.status >= 200 && res.status < 500;
  } catch {
    return false;
  }
}

async function runProbes(targetDomain: string): Promise<NetworkReport> {
  const ifaces = os.networkInterfaces();
  const allInterfaces: InterfaceInfo[] = [];

  for (const [name, list] of Object.entries(ifaces)) {
    if (!list) continue;
    for (const info of list) {
      if (info.family === 'IPv4' && !info.internal) {
        allInterfaces.push({
          name,
          address: info.address,
          netmask: info.netmask,
          mac: info.mac,
        });
      }
    }
  }

  const { gateway, iface: gwIface } = getDefaultGateway();
  let lanInterface: InterfaceInfo | null = null;

  if (gwIface) {
    lanInterface = allInterfaces.find((i) => i.name === gwIface) || null;
  }
  if (!lanInterface && allInterfaces.length > 0) {
    lanInterface =
      allInterfaces.find((i) => i.name.startsWith('en') || i.name.startsWith('eth')) ||
      allInterfaces[0];
  }

  const lanIp = lanInterface ? lanInterface.address : '127.0.0.1';
  const publicIp = await getPublicIp();
  const dnsServers = dns.getServers();

  // Test target subdomains
  const domainsToTest = [
    targetDomain,
    `server.${targetDomain}`,
    `client.${targetDomain}`,
    `admin.${targetDomain}`,
  ];

  const dnsProbes: DnsProbe[] = [];
  for (const domain of domainsToTest) {
    try {
      const resolved = await dns.resolve4(domain);
      const matchesLan = resolved.includes(lanIp);
      dnsProbes.push({
        domain,
        resolvedIps: resolved,
        matchesLan,
        status: matchesLan ? 'MATCH' : 'MISMATCH',
      });
    } catch (err: unknown) {
      dnsProbes.push({
        domain,
        resolvedIps: [],
        matchesLan: false,
        status: 'UNRESOLVED',
        error: (err as Error).message,
      });
    }
  }

  // Service listener checks
  const serviceChecks = [
    { name: 'Fastify Game Server', port: 3001, path: '/health', protocol: 'HTTP' as const },
    { name: 'Web Client UI (Vite)', port: 5173, path: '/', protocol: 'HTTP' as const },
    { name: 'Admin Cockpit UI', port: 5174, path: '/', protocol: 'HTTP' as const },
    { name: 'LAN Reverse Proxy (HTTP)', port: 80, path: '/', protocol: 'TCP' as const },
    { name: 'LAN Reverse Proxy (HTTPS)', port: 443, path: '/', protocol: 'TCP' as const },
    { name: 'PostgreSQL Database', port: 5432, path: '', protocol: 'TCP' as const },
    { name: 'OTel Collector', port: 4318, path: '', protocol: 'TCP' as const },
  ];

  const serviceProbes: ServiceProbe[] = [];
  for (const s of serviceChecks) {
    let localLive = false;
    let lanLive = false;

    if (s.protocol === 'HTTP') {
      localLive = await probeHttp(`http://127.0.0.1:${s.port}${s.path}`);
      lanLive = await probeHttp(`http://${lanIp}:${s.port}${s.path}`);
    } else {
      localLive = await probePort('127.0.0.1', s.port);
      lanLive = await probePort(lanIp, s.port);
    }

    serviceProbes.push({
      name: s.name,
      port: s.port,
      protocol: s.protocol,
      localLive,
      lanLive,
    });
  }

  // Recommended DNS Records
  const recommendedRecords = [
    {
      name: targetDomain,
      type: 'A',
      value: lanIp,
      ttl: 60,
      purpose: 'Apex domain for local tournament access',
    },
    {
      name: `*.${targetDomain}`,
      type: 'A',
      value: lanIp,
      ttl: 60,
      purpose: 'Wildcard for client, server, and admin subdomains',
    },
    {
      name: `server.${targetDomain}`,
      type: 'A',
      value: lanIp,
      ttl: 60,
      purpose: 'Fastify REST API & WebSocket endpoint',
    },
    {
      name: `client.${targetDomain}`,
      type: 'A',
      value: lanIp,
      ttl: 60,
      purpose: 'Player web client interface',
    },
    {
      name: `admin.${targetDomain}`,
      type: 'A',
      value: lanIp,
      ttl: 60,
      purpose: 'Tournament director cockpit',
    },
  ];

  const hasDnsMismatch = dnsProbes.some((p) => p.status !== 'MATCH');
  const isServerLive = serviceProbes.some(
    (s) => s.name === 'Fastify Game Server' && (s.localLive || s.lanLive),
  );

  let overallStatus: 'READY' | 'NEEDS_DNS_UPDATE' | 'SERVICES_DOWN' = 'READY';
  if (hasDnsMismatch) {
    overallStatus = 'NEEDS_DNS_UPDATE';
  } else if (!isServerLive) {
    overallStatus = 'SERVICES_DOWN';
  }

  return {
    timestamp: new Date().toISOString(),
    targetDomain,
    lanInterface,
    allInterfaces,
    gateway,
    publicIp,
    dnsServers,
    dnsProbes,
    serviceProbes,
    recommendedRecords,
    overallStatus,
  };
}

function renderTerminalReport(report: NetworkReport): void {
  const lanIp = report.lanInterface ? report.lanInterface.address : '127.0.0.1';
  const lanName = report.lanInterface ? report.lanInterface.name : 'unknown';

  console.log('\n========================================================================');
  console.log('       PHALANX DUEL — TOURNAMENT NETWORKING & DNS STATUS REPORT         ');
  console.log('========================================================================');
  console.log(`Timestamp:       ${report.timestamp}`);
  console.log(`Tournament Target: ${report.targetDomain}`);
  console.log(`Active LAN IP:   ${lanIp} (${lanName}) [Gateway: ${report.gateway || 'N/A'}]`);
  console.log(`Public (WAN) IP: ${report.publicIp || 'N/A'}`);
  console.log(`DNS Resolvers:   ${report.dnsServers.join(', ')}`);

  console.log('\n--- [1. DNS RESOLUTION STATUS] ---');
  for (const p of report.dnsProbes) {
    const icon = p.status === 'MATCH' ? '✅' : p.status === 'MISMATCH' ? '⚠️ ' : '❌';
    const resolvedStr =
      p.resolvedIps.length > 0 ? p.resolvedIps.join(', ') : `UNRESOLVED (${p.error || 'NXDOMAIN'})`;
    console.log(`  ${icon} ${p.domain.padEnd(28, ' ')} -> ${resolvedStr}`);
    if (p.status === 'MISMATCH') {
      console.log(`     └─ STALE RECORD: Points to ${resolvedStr}, but current LAN is ${lanIp}!`);
    }
  }

  console.log('\n--- [2. LOCAL & LAN SERVICE PROBES] ---');
  for (const s of report.serviceProbes) {
    const locIcon = s.localLive ? '✅' : '❌';
    const lanIcon = s.lanLive ? '✅' : '❌';
    console.log(
      `  ${s.name.padEnd(26, ' ')} [:${s.port}]  Local(127.0.0.1): ${locIcon}  |  LAN(${lanIp}): ${lanIcon}`,
    );
  }

  console.log('\n--- [3. ACTIONABLE DNS A-RECORDS TO CONFIGURE] ---');
  console.log('Set these A records at your DNS provider (e.g. DNSimple / Cloudflare / AdGuard):');
  console.log('');
  console.log('  Record / Subdomain           Type   Value (IP)       TTL   Description');
  console.log(
    '  --------------------------   ----   --------------   ---   -----------------------',
  );
  for (const r of report.recommendedRecords) {
    console.log(
      `  ${r.name.padEnd(26, ' ')}   ${r.type.padEnd(4, ' ')}   ${r.value.padEnd(14, ' ')}   ${String(r.ttl).padEnd(3, ' ')}   ${r.purpose}`,
    );
  }

  console.log('\n--- [4. COPY-PASTE ZONE / BIND SYNTAX] ---');
  for (const r of report.recommendedRecords) {
    console.log(`${r.name.padEnd(30, ' ')} ${r.ttl}  IN  ${r.type}  ${r.value}`);
  }

  console.log('\n========================================================================');
  if (report.overallStatus === 'READY') {
    console.log('  STATUS: ✅ READY FOR TOURNAMENT (All DNS records match current LAN IP)');
  } else if (report.overallStatus === 'NEEDS_DNS_UPDATE') {
    console.log(
      '  STATUS: ⚠️  DNS UPDATE NEEDED — Update your DNS A records to point to: ' + lanIp,
    );
  } else {
    console.log('  STATUS: ❌ LOCAL SERVICES DOWN — Start server: pnpm dev:server');
  }
  console.log('========================================================================\n');
}

function renderMarkdownReport(report: NetworkReport): string {
  const lanIp = report.lanInterface ? report.lanInterface.address : '127.0.0.1';
  const lines: string[] = [
    `# Tournament Network & DNS Status Report`,
    ``,
    `- **Generated**: \`${report.timestamp}\``,
    `- **Tournament Target**: \`${report.targetDomain}\``,
    `- **Detected LAN IP**: \`${lanIp}\` (Interface: \`${report.lanInterface?.name || 'N/A'}\`)`,
    `- **Gateway**: \`${report.gateway || 'N/A'}\``,
    `- **Public IP**: \`${report.publicIp || 'N/A'}\``,
    `- **Overall Status**: **${report.overallStatus}**`,
    ``,
    `## DNS Resolution Verification`,
    ``,
    `| Hostname | Resolved IP(s) | Expected LAN IP | Status |`,
    `|---|---|---|:---:|`,
  ];

  for (const p of report.dnsProbes) {
    const res = p.resolvedIps.length > 0 ? p.resolvedIps.join(', ') : `*(unresolved)*`;
    const icon =
      p.status === 'MATCH' ? '✅ Match' : p.status === 'MISMATCH' ? '⚠️ Stale' : '❌ Unresolved';
    lines.push(`| \`${p.domain}\` | \`${res}\` | \`${lanIp}\` | ${icon} |`);
  }

  lines.push('');
  lines.push('## Local & LAN Service Listeners');
  lines.push('');
  lines.push('| Service | Port | Protocol | Local (127.0.0.1) | LAN Reachable |');
  lines.push('|---|:---:|:---:|:---:|:---:|');

  for (const s of report.serviceProbes) {
    lines.push(
      `| ${s.name} | \`${s.port}\` | ${s.protocol} | ${s.localLive ? '✅ Yes' : '❌ No'} | ${s.lanLive ? '✅ Yes' : '❌ No'} |`,
    );
  }

  lines.push('');
  lines.push('## Required DNS A-Records');
  lines.push('');
  lines.push('```zone');
  for (const r of report.recommendedRecords) {
    lines.push(`${r.name.padEnd(30, ' ')} ${r.ttl}  IN  ${r.type}  ${r.value}`);
  }
  lines.push('```');

  return lines.join('\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let targetDomain = 'lan.phalanxduel.com';

  const domainIdx = args.indexOf('--domain');
  if (domainIdx !== -1 && args[domainIdx + 1]) {
    targetDomain = args[domainIdx + 1];
  }

  const isTop = args.includes('--top') || args.includes('--watch');
  if (isTop) {
    const { TournamentNetworkMonitor } = await import('./network-monitor.js');
    const intervalIdx = args.indexOf('--interval');
    const interval = intervalIdx !== -1 ? Number.parseInt(args[intervalIdx + 1], 10) : 2;
    const daemon = args.includes('--daemon') || args.includes('--background');
    const once = args.includes('--once');
    const monitor = new TournamentNetworkMonitor({ intervalSec: interval, daemon });
    if (once) {
      const snap = await monitor['collectSnapshot']();
      process.stdout.write(`${monitor['renderDashboard'](snap)}\n`);
      return;
    }
    await monitor.start();
    return;
  }

  const isJson = args.includes('--json');
  const isMarkdown = args.includes('--markdown');

  const report = await runProbes(targetDomain);

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else if (isMarkdown) {
    console.log(renderMarkdownReport(report));
  } else {
    renderTerminalReport(report);
  }

  if (args.includes('--strict')) {
    if (report.overallStatus === 'NEEDS_DNS_UPDATE') {
      process.exit(2);
    } else if (report.overallStatus === 'SERVICES_DOWN') {
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error('Fatal network report error:', err);
  process.exit(1);
});
