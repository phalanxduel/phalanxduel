import { execSync } from 'node:child_process';
import * as dns from 'node:dns/promises';
import * as fs from 'node:fs';
import * as net from 'node:net';
import * as os from 'node:os';

// Ponytail principle: zero external dependencies, native Node and platform tools.

export interface ServiceTarget {
  name: string;
  host: string;
  port: number;
  type: 'http' | 'tcp';
  path?: string;
}

export interface ConnectedPeer {
  remoteAddress: string;
  remotePort: number;
  localPort: number;
  service: string;
  state: string;
}

export interface NetworkThroughput {
  rxBytes: number;
  txBytes: number;
  rxRateBps: number; // bytes/sec
  txRateBps: number; // bytes/sec
  timestamp: number;
}

export interface WifiInfo {
  interfaceName: string;
  ssid?: string;
  bssid?: string;
  rssi?: string;
  noise?: string;
  txRate?: string;
  channel?: string;
  isWifi: boolean;
}

export interface LatencySample {
  gatewayMs: number | null;
  cloudMs: number | null;
  serverMs: number | null;
}

const TOURNAMENT_DOMAINS = [
  'lan.phalanxduel.com',
  'api.lan.phalanxduel.com',
  'admin.lan.phalanxduel.com',
  'o2.lan.phalanxduel.com',
  'jaeger.lan.phalanxduel.com',
];

const GAME_SERVICES: ServiceTarget[] = [
  { name: 'Game Server (HTTP/WS)', host: '127.0.0.1', port: 3001, type: 'http', path: '/health' },
  { name: 'Web Client', host: '127.0.0.1', port: 5173, type: 'tcp' },
  { name: 'PostgreSQL', host: '127.0.0.1', port: 5432, type: 'tcp' },
  { name: 'OTel Collector', host: '127.0.0.1', port: 4318, type: 'http', path: '/v1/traces' },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatRate(bps: number): string {
  if (bps < 1024) return `${bps.toFixed(0)} B/s`;
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  const mbps = (bps * 8) / 1_000_000;
  return `${(bps / (1024 * 1024)).toFixed(2)} MB/s (${mbps.toFixed(1)} Mbps)`;
}

function getPrimaryInterface(): { name: string; ip: string } {
  const ifaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(ifaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (
        addr.family === 'IPv4' &&
        !addr.internal &&
        (addr.address.startsWith('10.') ||
          addr.address.startsWith('192.168.') ||
          addr.address.startsWith('172.'))
      ) {
        return { name, ip: addr.address };
      }
    }
  }
  for (const [name, addrs] of Object.entries(ifaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return { name, ip: addr.address };
      }
    }
  }
  return { name: 'lo0', ip: '127.0.0.1' };
}

function getDefaultGateway(): string | null {
  try {
    const out = execSync('netstat -rn -f inet', { encoding: 'utf8' });
    for (const line of out.split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts[0] === 'default' && parts[1]) {
        return parts[1];
      }
    }
  } catch {
    // fallback
  }
  return null;
}

function getInterfaceBytes(iface: string): { rxBytes: number; txBytes: number } {
  try {
    const out = execSync(`netstat -I ${iface} -b`, { encoding: 'utf8' });
    const lines = out.trim().split('\n');
    if (lines.length >= 2) {
      const cols = lines[1].trim().split(/\s+/);
      // macOS netstat -I en0 -b columns:
      // Name Mtu Network Address Ipkts Ierrs Ibytes Opkts Oerrs Obytes Coll
      const rx = Number.parseInt(cols[6], 10);
      const tx = Number.parseInt(cols[9], 10);
      return {
        rxBytes: Number.isNaN(rx) ? 0 : rx,
        txBytes: Number.isNaN(tx) ? 0 : tx,
      };
    }
  } catch {
    // ignore
  }
  return { rxBytes: 0, txBytes: 0 };
}

function getWifiInfo(iface: string): WifiInfo {
  const result: WifiInfo = {
    interfaceName: iface,
    isWifi: false,
  };

  try {
    const hwOut = execSync('networksetup -listallhardwareports', { encoding: 'utf8' });
    const sections = hwOut.split('\n\n');
    for (const sec of sections) {
      if (sec.includes('Wi-Fi') && sec.includes(`Device: ${iface}`)) {
        result.isWifi = true;
        break;
      }
    }

    if (result.isWifi) {
      const airportOut = execSync(`networksetup -getairportnetwork ${iface} 2>/dev/null`, {
        encoding: 'utf8',
      }).trim();
      const match = airportOut.match(/Current Wi-Fi Network:\s*(.+)$/i);
      if (match) {
        result.ssid = match[1].trim();
      }

      // Try ipconfig summary for extra details if available
      try {
        const sumOut = execSync(`ipconfig getsummary ${iface} 2>/dev/null`, {
          encoding: 'utf8',
        });
        const bssidMatch = sumOut.match(/BSSID\s*:\s*([0-9a-fA-F:]+)/);
        if (bssidMatch) result.bssid = bssidMatch[1].trim();
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  return result;
}

function checkTcpLatency(host: string, port: number, timeoutMs = 800): Promise<number | null> {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      const end = process.hrtime.bigint();
      socket.destroy();
      const ms = Number(end - start) / 1_000_000;
      resolve(Math.round(ms * 10) / 10);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(null);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(null);
    });
  });
}

async function checkHttpLatency(
  url: string,
  timeoutMs = 800,
): Promise<{ ok: boolean; status: number; ms: number | null }> {
  const start = process.hrtime.bigint();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'phx-tournament-monitor/1.0' },
    });
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1_000_000;
    return { ok: res.ok, status: res.status, ms: Math.round(ms * 10) / 10 };
  } catch {
    return { ok: false, status: 0, ms: null };
  }
}

function getConnectedGamePeers(): ConnectedPeer[] {
  const peers: ConnectedPeer[] = [];
  try {
    // macOS lsof check for active TCP connections to game server ports (3001, 5173)
    const out = execSync('lsof -nP -iTCP:3001,5173 -sTCP:ESTABLISHED 2>/dev/null', {
      encoding: 'utf8',
    });
    const lines = out.trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(/\s+/);
      // Format: COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
      // NAME is typically localIP:localPort->remoteIP:remotePort
      const nameCol = parts[parts.length - 2];
      if (nameCol && nameCol.includes('->')) {
        const [local, remote] = nameCol.split('->');
        const localPortStr = local.split(':').pop() || '0';
        const remoteParts = remote.split(':');
        const remotePortStr = remoteParts.pop() || '0';
        const remoteIp = remoteParts.join(':').replace(/^\[|\]$/g, '');

        const localPort = Number.parseInt(localPortStr, 10);
        const remotePort = Number.parseInt(remotePortStr, 10);

        peers.push({
          remoteAddress: remoteIp,
          remotePort,
          localPort,
          service: localPort === 3001 ? 'Game Server/WS' : 'Web Client',
          state: 'ESTABLISHED',
        });
      }
    }
  } catch {
    // lsof returns exit 1 if no connections found
  }
  return peers;
}

export class TournamentNetworkMonitor {
  private primaryIf: { name: string; ip: string };
  private gatewayIp: string | null;
  private intervalSec: number;
  private isDaemon: boolean;
  private logPath?: string;
  private prevThroughput?: NetworkThroughput;
  private startTime = Date.now();
  private totalRxSession = 0;
  private totalTxSession = 0;
  private isRunning = false;
  private timer?: NodeJS.Timeout;

  constructor(options: { intervalSec?: number; daemon?: boolean; logPath?: string }) {
    this.intervalSec = options.intervalSec || 2;
    this.isDaemon = Boolean(options.daemon);
    this.logPath = options.logPath;
    this.primaryIf = getPrimaryInterface();
    this.gatewayIp = getDefaultGateway();
  }

  public async start(): Promise<void> {
    this.isRunning = true;

    const shutdown = () => {
      this.stop();
      process.stdout.write('\n\x1b[?25h[Tournament Monitor] Exited cleanly.\n');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    if (!this.isDaemon && process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (key: string) => {
        if (key === 'q' || key === '\u0003') {
          // 'q' or Ctrl+C
          shutdown();
        } else if (key === 'r') {
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

  public stop(): void {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
  }

  private async collectSnapshot() {
    const now = Date.now();
    const ifaceBytes = getInterfaceBytes(this.primaryIf.name);

    let rxRate = 0;
    let txRate = 0;

    if (this.prevThroughput) {
      const dt = (now - this.prevThroughput.timestamp) / 1000;
      if (dt > 0) {
        const deltaRx = Math.max(0, ifaceBytes.rxBytes - this.prevThroughput.rxBytes);
        const deltaTx = Math.max(0, ifaceBytes.txBytes - this.prevThroughput.txBytes);
        rxRate = deltaRx / dt;
        txRate = deltaTx / dt;
        this.totalRxSession += deltaRx;
        this.totalTxSession += deltaTx;
      }
    }

    this.prevThroughput = {
      rxBytes: ifaceBytes.rxBytes,
      txBytes: ifaceBytes.txBytes,
      rxRateBps: rxRate,
      txRateBps: txRate,
      timestamp: now,
    };

    const wifi = getWifiInfo(this.primaryIf.name);

    // Latency checks
    const [gatewayLat, cloudLat, serverHealth] = await Promise.all([
      this.gatewayIp
        ? checkTcpLatency(this.gatewayIp, 80, 500).then(
            (res) => res ?? checkTcpLatency(this.gatewayIp!, 53, 500),
          )
        : Promise.resolve(null),
      checkTcpLatency('1.1.1.1', 53, 600),
      checkHttpLatency('http://127.0.0.1:3001/health', 500),
    ]);

    // Service probes
    const services = await Promise.all(
      GAME_SERVICES.map(async (svc) => {
        if (svc.type === 'http' && svc.path) {
          const res = await checkHttpLatency(`http://${svc.host}:${svc.port}${svc.path}`, 400);
          return {
            ...svc,
            live: res.ok || res.status > 0,
            ms: res.ms,
            status: res.status,
          };
        }
        const ms = await checkTcpLatency(svc.host, svc.port, 400);
        return { ...svc, live: ms !== null, ms, status: ms !== null ? 200 : 0 };
      }),
    );

    // DNS check
    const dnsStatus = await Promise.all(
      TOURNAMENT_DOMAINS.map(async (domain) => {
        try {
          const resolved = await dns.resolve4(domain);
          const matches = resolved.includes(this.primaryIf.ip);
          return { domain, ips: resolved, matches, error: null };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return { domain, ips: [], matches: false, error: message };
        }
      }),
    );

    const peers = getConnectedGamePeers();

    return {
      timestamp: now,
      uptimeSec: Math.floor((now - this.startTime) / 1000),
      iface: this.primaryIf,
      gateway: this.gatewayIp,
      throughput: this.prevThroughput,
      wifi,
      latencies: {
        gatewayMs: gatewayLat,
        cloudMs: cloudLat,
        serverMs: serverHealth.ms,
      },
      services,
      dnsStatus,
      peers,
    };
  }

  private renderDashboard(snap: Awaited<ReturnType<typeof this.collectSnapshot>>) {
    const lines: string[] = [];
    const dateStr = new Date(snap.timestamp).toLocaleTimeString();
    const uptime = `${Math.floor(snap.uptimeSec / 60)}m ${snap.uptimeSec % 60}s`;

    // Top Header
    lines.push(
      '\x1b[1;36m╔════════════════════════════════════════════════════════════════════════════════════════════╗\x1b[0m',
    );
    lines.push(
      `\x1b[1;36m║  PHALANX DUEL — TOURNAMENT NETWORK TOP & LIVE CONNECTION MONITOR                        ║\x1b[0m`,
    );
    lines.push(
      `\x1b[1;36m║  Time: \x1b[1;37m${dateStr.padEnd(12)}\x1b[1;36m Uptime: \x1b[1;37m${uptime.padEnd(10)}\x1b[1;36m Interface: \x1b[1;32m${snap.iface.name} (${snap.iface.ip})\x1b[1;36m      ║\x1b[0m`,
    );
    lines.push(
      '\x1b[1;36m╠════════════════════════════════════════════════════════════════════════════════════════════╣\x1b[0m',
    );

    // Section 1: Wi-Fi & Bandwidth
    const wifiStatus = snap.wifi.isWifi
      ? `SSID: \x1b[1;32m${snap.wifi.ssid || '(unassociated)'}\x1b[0m`
      : `Wired Ethernet / Local Link`;

    const rxStr = formatRate(snap.throughput.rxRateBps);
    const txStr = formatRate(snap.throughput.txRateBps);
    const sessRx = formatBytes(this.totalRxSession);
    const sessTx = formatBytes(this.totalTxSession);

    lines.push(`\x1b[1;33m [1] RADIO & THROUGHPUT\x1b[0m  │  ${wifiStatus}`);
    lines.push(
      `     Inbound Rate (DL)  : \x1b[1;32m${rxStr.padEnd(28)}\x1b[0m Session In  : ${sessRx}`,
    );
    lines.push(
      `     Outbound Rate (UL) : \x1b[1;34m${txStr.padEnd(28)}\x1b[0m Session Out : ${sessTx}`,
    );

    // Section 2: Latencies & Reachability
    lines.push(
      '\x1b[1;36m╟────────────────────────────────────────────────────────────────────────────────────────────╢\x1b[0m',
    );
    const gwLatStr =
      snap.latencies.gatewayMs !== null
        ? `\x1b[1;32m${snap.latencies.gatewayMs} ms\x1b[0m`
        : '\x1b[1;31mTIMEOUT\x1b[0m';
    const cloudLatStr =
      snap.latencies.cloudMs !== null
        ? `\x1b[1;32m${snap.latencies.cloudMs} ms\x1b[0m`
        : '\x1b[1;33mOFFLINE (LAN Mode)\x1b[0m';
    const srvLatStr =
      snap.latencies.serverMs !== null
        ? `\x1b[1;32m${snap.latencies.serverMs} ms\x1b[0m`
        : '\x1b[1;31mDOWN\x1b[0m';

    lines.push(
      `\x1b[1;33m [2] LATENCY / RTT\x1b[0m      │  Gateway: ${gwLatStr}  │  Cloud (1.1.1.1): ${cloudLatStr}  │  API Ping: ${srvLatStr}`,
    );

    // Section 3: Local Game Infrastructure
    lines.push(
      '\x1b[1;36m╟────────────────────────────────────────────────────────────────────────────────────────────╢\x1b[0m',
    );
    lines.push('\x1b[1;33m [3] GAME SERVICES ON HOST\x1b[0m');
    for (const svc of snap.services) {
      const stateBadge = svc.live ? '\x1b[1;42m ONLINE \x1b[0m' : '\x1b[1;41m OFFLINE \x1b[0m';
      const latInfo = svc.ms !== null ? `(${svc.ms} ms)` : '';
      lines.push(
        `     • ${svc.name.padEnd(26)} :${String(svc.port).padEnd(6)} ${stateBadge} ${latInfo}`,
      );
    }

    // Section 4: Live Connected Peers / Tournament Players
    lines.push(
      '\x1b[1;36m╟────────────────────────────────────────────────────────────────────────────────────────────╢\x1b[0m',
    );
    const peerCount = snap.peers.length;
    const uniqueIps = Array.from(new Set(snap.peers.map((p) => p.remoteAddress)));
    lines.push(
      `\x1b[1;33m [4] TOURNAMENT PLAYERS & CLIENT CONNECTIONS\x1b[0m  (\x1b[1;32m${peerCount} sockets\x1b[0m / \x1b[1;37m${uniqueIps.length} clients\x1b[0m)`,
    );

    if (peerCount === 0) {
      lines.push(
        '     \x1b[2mNo active remote duel players connected yet. Ready for tournament joiners.\x1b[0m',
      );
    } else {
      for (const ip of uniqueIps.slice(0, 5)) {
        const clientSockets = snap.peers.filter((p) => p.remoteAddress === ip);
        const servicesUsed = Array.from(new Set(clientSockets.map((p) => p.service))).join(', ');
        lines.push(
          `     • Remote Client \x1b[1;32m${ip.padEnd(16)}\x1b[0m → ${clientSockets.length} sockets (${servicesUsed})`,
        );
      }
      if (uniqueIps.length > 5) {
        lines.push(`     ... and ${uniqueIps.length - 5} more clients.`);
      }
    }

    // Section 5: DNS Records Verification
    lines.push(
      '\x1b[1;36m╟────────────────────────────────────────────────────────────────────────────────────────────╢\x1b[0m',
    );
    lines.push('\x1b[1;33m [5] LAN DNS STATUS (*.lan.phalanxduel.com)\x1b[0m');
    let allDnsMatched = true;
    for (const d of snap.dnsStatus.slice(0, 3)) {
      if (d.matches) {
        lines.push(
          `     • \x1b[1;32m✓\x1b[0m ${d.domain.padEnd(30)} -> ${d.ips.join(', ')} \x1b[1;32m(MATCHED)\x1b[0m`,
        );
      } else {
        allDnsMatched = false;
        const note =
          d.ips.length > 0
            ? `points to ${d.ips.join(', ')} (expected ${snap.iface.ip})`
            : 'UNRESOLVED';
        lines.push(`     • \x1b[1;31m✗\x1b[0m ${d.domain.padEnd(30)} -> \x1b[1;31m${note}\x1b[0m`);
      }
    }

    if (!allDnsMatched) {
      lines.push(
        `\n  \x1b[1;33mACTION REQUIRED:\x1b[0m Set DNS A-record: \x1b[1;37m*.lan.phalanxduel.com  300  IN  A  ${snap.iface.ip}\x1b[0m`,
      );
    }

    // Footer
    lines.push(
      '\x1b[1;36m╚════════════════════════════════════════════════════════════════════════════════════════════╝\x1b[0m',
    );
    lines.push('\x1b[2m  Keys: [q] Quit  [r] Force Refresh  | Running live top monitor...\x1b[0m');

    return lines.join('\n');
  }

  private async tick(): Promise<void> {
    try {
      const snap = await this.collectSnapshot();

      if (this.isDaemon) {
        const line = JSON.stringify({
          time: new Date(snap.timestamp).toISOString(),
          ip: snap.iface.ip,
          rxBps: Math.round(snap.throughput.rxRateBps),
          txBps: Math.round(snap.throughput.txRateBps),
          gatewayMs: snap.latencies.gatewayMs,
          serverOk: snap.services.find((s) => s.port === 3001)?.live ?? false,
          activeSockets: snap.peers.length,
          dnsMatches: snap.dnsStatus.every((d) => d.matches),
        });

        if (this.logPath) {
          fs.appendFileSync(this.logPath, `${line}\n`, 'utf8');
        } else {
          process.stdout.write(`${line}\n`);
        }
      } else {
        // ANSI clear screen & move home
        const out = this.renderDashboard(snap);
        process.stdout.write(`\x1b[H\x1b[2J${out}\n`);
      }
    } catch (err) {
      if (!this.isDaemon) {
        process.stderr.write(`Error collecting snapshot: ${err}\n`);
      }
    }
  }
}

// CLI Execution entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const daemon = args.includes('--daemon') || args.includes('--background');
  const once = args.includes('--once');
  const intervalIndex = args.indexOf('--interval');
  const interval = intervalIndex !== -1 ? Number.parseInt(args[intervalIndex + 1], 10) : 2;
  const logIndex = args.indexOf('--log');
  const logPath = logIndex !== -1 ? args[logIndex + 1] : undefined;

  const monitor = new TournamentNetworkMonitor({
    intervalSec: Number.isNaN(interval) ? 2 : interval,
    daemon,
    logPath,
  });

  if (once) {
    void monitor['collectSnapshot']().then((snap) => {
      process.stdout.write(`${monitor['renderDashboard'](snap)}\n`);
      process.exit(0);
    });
  } else {
    void monitor.start();
  }
}
