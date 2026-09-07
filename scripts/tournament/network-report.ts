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
import {
  getHostListeners,
  inspectLocalFirewall,
  type FirewallInspection,
} from './endpoint-accessibility.js';

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
  blockReason?: 'NOT_RUNNING' | 'LOCAL_BIND_ONLY' | 'FIREWALL_BLOCKED' | 'NETWORK_ISOLATED';
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
  firewall: FirewallInspection;
  recommendedRecords: Array<{
    name: string;
    type: string;
    value: string;
    ttl: number;
    purpose: string;
  }>;
  overallStatus: 'READY' | 'NEEDS_DNS_UPDATE' | 'SERVICES_DOWN' | 'FIREWALL_WARNING';
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

  const firewall = inspectLocalFirewall();
  const listeners = getHostListeners();

  const serviceProbes: ServiceProbe[] = [];
  for (const s of serviceChecks) {
    let localLive = false;
    let lanLive = false;

    if (s.protocol === 'HTTP') {
      localLive =
        (await probeHttp(`http://127.0.0.1:${s.port}${s.path}`)) ||
        (await probePort('127.0.0.1', s.port));
      lanLive =
        (await probeHttp(`http://${lanIp}:${s.port}${s.path}`)) || (await probePort(lanIp, s.port));
    } else {
      localLive = await probePort('127.0.0.1', s.port);
      lanLive = await probePort(lanIp, s.port);
    }

    const listener = listeners.get(s.port);
    let blockReason: ServiceProbe['blockReason'];
    let details: string | undefined;

    if (!localLive && !lanLive) {
      blockReason = 'NOT_RUNNING';
      details = 'Service is stopped or not listening on port';
    } else if (localLive && !lanLive) {
      const isLanBound =
        listener &&
        (listener.bind === '*' ||
          listener.bind === '0.0.0.0' ||
          listener.bind === '::' ||
          listener.bind === lanIp);
      if (!isLanBound) {
        blockReason = 'LOCAL_BIND_ONLY';
        details = `Bound to loopback only (${listener?.bind || '127.0.0.1'}). Restart service with --host 0.0.0.0`;
      } else if (
        firewall.blockAll ||
        (listener?.process && firewall.blockedApps.some((p) => p.includes(listener.process!)))
      ) {
        blockReason = 'FIREWALL_BLOCKED';
        details = 'Listener is 0.0.0.0, but local OS firewall dropped inbound connection';
      } else {
        blockReason = 'NETWORK_ISOLATED';
        details = 'Listener is 0.0.0.0, but LAN probe failed (check Wi-Fi isolation / subnet)';
      }
    }

    serviceProbes.push({
      name: s.name,
      port: s.port,
      protocol: s.protocol,
      localLive,
      lanLive,
      blockReason,
      details,
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
  const isFirewallBlocking = firewall.blockAll || (!firewall.isNodeAllowed && isServerLive);

  let overallStatus: 'READY' | 'NEEDS_DNS_UPDATE' | 'SERVICES_DOWN' | 'FIREWALL_WARNING' = 'READY';
  if (isFirewallBlocking) {
    overallStatus = 'FIREWALL_WARNING';
  } else if (hasDnsMismatch) {
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
    firewall,
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
    let extra = '';
    if (s.localLive && !s.lanLive) {
      if (s.blockReason === 'LOCAL_BIND_ONLY') {
        extra = ' ⚠️  [BLOCKED: Bound to 127.0.0.1 only]';
      } else if (s.blockReason === 'FIREWALL_BLOCKED') {
        extra = ' ⛔ [BLOCKED: Host Firewall dropped connection]';
      } else if (s.blockReason === 'NETWORK_ISOLATED') {
        extra = ' ⚡ [BLOCKED: LAN socket failed / AP isolation]';
      }
    } else if (!s.localLive && !s.lanLive) {
      extra = ' ⚪ (Service Down)';
    }
    console.log(
      `  ${s.name.padEnd(26, ' ')} [:${s.port}]  Local(127.0.0.1): ${locIcon}  |  LAN(${lanIp}): ${lanIcon}${extra}`,
    );
  }

  console.log('\n--- [3. LOCAL FIREWALL & INGRESS RULES] ---');
  const fw = report.firewall;
  const fwStatusIcon = fw.blockAll ? '🔴 ' : fw.enabled ? '🟢 ' : '🟡 ';
  console.log(`  Firewall Status:    ${fwStatusIcon}${fw.summary}`);
  console.log(
    `  Stealth Mode:       ${fw.stealthMode ? '⚠️  ON (Drops ICMP Ping & Discovery)' : 'OFF (ICMP echo permitted)'}`,
  );
  console.log(
    `  Node.js Inbound:    ${fw.isNodeAllowed ? '✅ ALLOWED' : '❌ BLOCKED by Firewall'}`,
  );
  console.log(
    `  Nginx Inbound:      ${fw.isNginxAllowed ? '✅ ALLOWED' : '❌ BLOCKED by Firewall'}`,
  );
  if (fw.diagnostics.length > 0) {
    for (const d of fw.diagnostics) {
      console.log(`  └─ ${d}`);
    }
  }

  console.log('\n--- [4. ACTIONABLE DNS A-RECORDS TO CONFIGURE] ---');
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

  console.log('\n--- [5. COPY-PASTE ZONE / BIND SYNTAX] ---');
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
  } else if (report.overallStatus === 'FIREWALL_WARNING') {
    console.log(
      '  STATUS: ⛔ FIREWALL INTERCEPTION — macOS Firewall is dropping incoming connections',
    );
  } else {
    console.log('  STATUS: ❌ LOCAL SERVICES DOWN — Start server: pnpm dev:server');
  }
  console.log('========================================================================');

  console.log('\n--- [6. DIAGNOSTICS & VALIDATION RECIPES (TEST COMMANDS)] ---');
  console.log(
    'Use these copy-paste commands to test whether blocks are Local Host vs Firewall vs Venue Wi-Fi:\n',
  );
  console.log('  1. Verify Local Loopback Reachability (from this machine):');
  console.log('     curl -sI http://127.0.0.1:3001/health | head -n 5');
  console.log('     nc -zv 127.0.0.1 3001\n');
  console.log('  2. Verify Host LAN IP Reachability (from this machine):');
  console.log(`     curl -sI http://${lanIp}:3001/health | head -n 5`);
  console.log(`     nc -zv ${lanIp} 3001\n`);
  console.log('  3. Verify from External Player/Spectator Device (Phone / Laptop on Venue Wi-Fi):');
  console.log(`     curl -sI http://${lanIp}:3001/health`);
  console.log(`     curl -k -sI https://${report.targetDomain}/\n`);
  console.log('  4. macOS Application Firewall Diagnosis & Remediation:');
  console.log(
    '     • View All Rules:        /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate --getblockall --listapps',
  );
  console.log(
    '     • If Block-All is active: sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setblockall off',
  );
  console.log(
    '     • Allow Node.js binary:   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add $(which node) --unblockapp $(which node)',
  );
  console.log(
    '     • Allow Nginx binary:     sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add $(which nginx) --unblockapp $(which nginx)',
  );
  console.log(
    '     • Tournament Bypass Mode: sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off\n',
  );
  console.log('  5. Detect Wi-Fi AP Client Isolation (Venue Guest Network):');
  console.log(`     • Ping Default Gateway:   ping -c 2 ${report.gateway || '192.168.1.1'}`);
  console.log('     • View Peer ARP Cache:    arp -a');
  console.log(
    '     • Diagnostic Note: If external players can join Wi-Fi but cannot ping or curl your LAN IP,',
  );
  console.log('       the venue AP has Client Isolation turned ON.');
  console.log(
    '       Fix: Use a portable travel router (GL.iNet), an iPhone/Android personal hotspot, or a switch.\n',
  );
  console.log('  6. Flush Stale DNS Caches:');
  console.log(
    '     • macOS:                  sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder',
  );
  console.log(
    '     • iOS / Android:          Toggle Airplane Mode ON for 5 seconds, then turn back OFF.\n',
  );
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
  lines.push(
    '| Service | Port | Protocol | Local (127.0.0.1) | LAN Reachable | Diagnostic Reason |',
  );
  lines.push('|---|:---:|:---:|:---:|:---:|---|');

  for (const s of report.serviceProbes) {
    const reason = s.details || (s.lanLive ? 'Accessible on LAN' : 'Offline');
    lines.push(
      `| ${s.name} | \`${s.port}\` | ${s.protocol} | ${s.localLive ? '✅ Yes' : '❌ No'} | ${s.lanLive ? '✅ Yes' : '❌ No'} | ${reason} |`,
    );
  }

  lines.push('');
  lines.push('## Local Firewall Status');
  lines.push('');
  lines.push(`- **Summary**: ${report.firewall.summary}`);
  lines.push(`- **Stealth Mode**: ${report.firewall.stealthMode ? 'Enabled' : 'Disabled'}`);
  lines.push(`- **Node.js Allowed**: ${report.firewall.isNodeAllowed ? '✅ Yes' : '❌ No'}`);
  lines.push(`- **Nginx Allowed**: ${report.firewall.isNginxAllowed ? '✅ Yes' : '❌ No'}`);

  lines.push('');
  lines.push('## Required DNS A-Records');
  lines.push('');
  lines.push('```zone');
  for (const r of report.recommendedRecords) {
    lines.push(`${r.name.padEnd(30, ' ')} ${r.ttl}  IN  ${r.type}  ${r.value}`);
  }
  lines.push('```');

  lines.push('');
  lines.push('## Troubleshooting & Validation Commands');
  lines.push('');
  lines.push('```bash');
  lines.push('# Test local loopback reachability');
  lines.push('curl -sI http://127.0.0.1:3001/health | head -n 5');
  lines.push('nc -zv 127.0.0.1 3001');
  lines.push('');
  lines.push('# Test host LAN IP socket');
  lines.push(`curl -sI http://${lanIp}:3001/health | head -n 5`);
  lines.push(`nc -zv ${lanIp} 3001`);
  lines.push('');
  lines.push('# Inspect macOS Application Firewall');
  lines.push(
    '/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate --getblockall --listapps',
  );
  lines.push('');
  lines.push('# Unblock incoming if firewall is dropping traffic');
  lines.push('sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setblockall off');
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
    const { runAllEndpointChecks, renderAccessibilityMatrixTerminal } =
      await import('./endpoint-accessibility.js');
    const matrix = await runAllEndpointChecks();
    console.log('\n' + renderAccessibilityMatrixTerminal(matrix));
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
