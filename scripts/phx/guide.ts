#!/usr/bin/env tsx
import * as os from 'os';
import { getSessionId } from './session.js';
import { getCapabilities } from './tool-discovery.js';
import { execSync } from 'child_process';

function runCmd(cmd: string): string {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isJson = args.includes('--json');

  // Reuse dev:status logic by calling it
  let status: any = {};
  try {
    status = JSON.parse(runCmd('pnpm dev:status --json'));
  } catch (e) {
    status = { overallStatus: 'ERROR', error: 'Failed to fetch dev status' };
  }

  const guide = {
    session_id: getSessionId(),
    profile: process.env.PHX_PROFILE || 'default',
    os: os.type(),
    arch: os.arch(),
    disk_available: runCmd('df -h . | awk "NR==2 {print \\$4}"'),
    git: status.git || { branch: 'unknown', commit: 'unknown' },
    system_health: {
      status: status.overallStatus || 'UNKNOWN',
      reason: status.statusReason || 'N/A',
      failures: status.failures?.length || 0,
    },
    intelligence: {
      mcp_active: status.services?.app?.status === 'READY',
      capabilities: getCapabilities().length,
      tools: getCapabilities().map((c) => c.name),
    },
    links: status.links || [],
    timestamp: new Date().toISOString(),
  };

  if (isJson) {
    console.log(JSON.stringify(guide, null, 2));
  } else {
    // Human readable output
    const statusVal = guide.system_health.status;
    const statusColor =
      statusVal === 'HEALTHY' ? '\x1b[32m' : statusVal === 'DEGRADED' ? '\x1b[33m' : '\x1b[31m';

    console.log(`\n\x1b[1mPHALANX DUEL AGENT GUIDE\x1b[0m`);
    console.log(`-------------------------`);
    console.log(`Session:  ${guide.session_id}`);
    console.log(`Status:   ${statusColor}${statusVal}\x1b[0m`);
    if (guide.system_health.reason !== 'N/A') {
      console.log(`Reason:   ${guide.system_health.reason}`);
    }
    console.log(`Git:      ${guide.git.branch} @ ${guide.git.commit}`);
    console.log(`Intel:    ${guide.intelligence.capabilities} tools available`);
    console.log(`\nRun \x1b[36mphx capabilities\x1b[0m for tool details.`);
  }
}

main();
