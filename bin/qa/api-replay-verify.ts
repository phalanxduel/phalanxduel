#!/usr/bin/env tsx
/**
 * Server-Side Replay Verification — TASK-206
 *
 * Reads playthrough artifacts (game-*.json manifests), then calls the server's
 * /matches/:matchId/replay endpoint for each completed match and asserts:
 *   1. The server-side replay is valid (hash chain unbroken)
 *   2. The final state hash from replay matches the hash recorded during live play
 *
 * Requires the server to still be running (used inside verify-integration-api.sh).
 *
 * Usage:
 *   tsx bin/qa/api-replay-verify.ts --dir artifacts/playthrough-api/<run-id>
 *   tsx bin/qa/api-replay-verify.ts  # uses latest run under artifacts/playthrough-api/
 */

import { parseArgs } from 'node:util';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const { values } = parseArgs({
  options: {
    dir: { type: 'string' },
    'base-dir': { type: 'string', default: 'artifacts/playthrough-api' },
    'admin-user': { type: 'string' },
    'admin-password': { type: 'string' },
  },
});

async function findLatestRunDir(baseDir: string): Promise<string> {
  const entries = await readdir(baseDir, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .reverse();
  if (dirs.length === 0) throw new Error(`No run directories found in ${baseDir}`);
  return join(baseDir, dirs[0]!);
}

interface RunManifest {
  runId: string;
  matchId: string | null;
  baseUrl: string;
  status: 'success' | 'failure';
  finalStateHash: string | null;
  actionCount: number;
  damageMode: string;
  startingLifepoints: number;
}

interface ReplayResponse {
  valid: boolean;
  actionCount?: number;
  finalStateHash?: string;
  error?: string;
  failedAtIndex?: number;
}

function wsUrlToHttp(wsUrl: string): string {
  return wsUrl.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://');
}

async function verifyMatchReplay(
  manifest: RunManifest,
  adminUser: string,
  adminPassword: string,
): Promise<{ label: string; passed: boolean; error?: string }> {
  const { matchId, baseUrl, finalStateHash, damageMode, startingLifepoints } = manifest;
  const label = `match=${matchId?.slice(0, 8) ?? 'unknown'} mode=${damageMode} lp=${startingLifepoints}`;

  if (!matchId) {
    return { label, passed: false, error: 'No matchId in manifest' };
  }

  const httpBase = wsUrlToHttp(baseUrl);
  const url = `${httpBase}/matches/${matchId}/replay`;
  const credentials = Buffer.from(`${adminUser}:${adminPassword}`).toString('base64');

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Basic ${credentials}` },
    });

    if (!response.ok) {
      const body = await response.text();
      return { label, passed: false, error: `HTTP ${response.status}: ${body}` };
    }

    const result = (await response.json()) as ReplayResponse;

    if (!result.valid) {
      const detail = result.error ?? `invalid at action index ${result.failedAtIndex ?? '?'}`;
      return { label, passed: false, error: `Replay failed — ${detail}` };
    }

    if (finalStateHash && result.finalStateHash && finalStateHash !== result.finalStateHash) {
      return {
        label,
        passed: false,
        error: `Final hash mismatch: live=${finalStateHash.slice(0, 12)} replay=${result.finalStateHash.slice(0, 12)}`,
      };
    }

    return { label, passed: true };
  } catch (err) {
    return {
      label,
      passed: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     Server-Side Replay Verification (TASK-206)      ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const runDir = values.dir ?? (await findLatestRunDir(values['base-dir']!));
  console.log(`Artifact directory: ${runDir}\n`);

  const files = await readdir(runDir);
  const gameFiles = files.filter((f) => f.startsWith('game-') && f.endsWith('.json')).sort();

  if (gameFiles.length === 0) {
    console.log('No game manifests found — nothing to verify.');
    process.exit(0);
  }

  const adminUser = values['admin-user'] ?? process.env.PHALANX_ADMIN_USER ?? 'phalanx';
  const adminPassword = values['admin-password'] ?? process.env.PHALANX_ADMIN_PASSWORD ?? 'phalanx';

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const file of gameFiles) {
    const content = await readFile(join(runDir, file), 'utf-8');
    const manifest = JSON.parse(content) as RunManifest;

    if (manifest.status !== 'success' || !manifest.matchId) {
      skipped++;
      continue;
    }

    const result = await verifyMatchReplay(manifest, adminUser, adminPassword);
    if (result.passed) {
      passed++;
      console.log(`  ✅ ${result.label}`);
    } else {
      failed++;
      console.log(`  ❌ ${result.label} — ${result.error}`);
    }
  }

  console.log(`\n  Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);

  if (failed > 0) {
    console.error('\n❌ SERVER REPLAY VERIFICATION FAILED');
    process.exit(1);
  }

  console.log('\n✅ All server-side replays verified — hash chains intact');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
