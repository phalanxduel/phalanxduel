/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU General Public License v3.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

async function fetchHealth(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Failed to parse health response from ${url}`));
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.setTimeout(2000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching health from ${url}`));
    });
  });
}

async function waitForServer(url: string, maxAttempts = 15): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fetchHealth(url);
    } catch {
      process.stdout.write('.');
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error(`\n❌ Server unreachable at ${url} after ${maxAttempts} attempts.`);
}

async function checkSync() {
  console.log('🔍 Preflight Build Identity Check...');

  // 1. Load host metadata
  let hostMeta;
  try {
    hostMeta = JSON.parse(readFileSync(join(ROOT, 'build-metadata.json'), 'utf8'));
  } catch (err) {
    console.error('❌ Missing build-metadata.json on host. Run "pnpm infra:metadata" first.');
    process.exit(1);
  }

  // 2. Wait for live health
  const healthUrl = 'http://127.0.0.1:3001/health';
  process.stdout.write('   Waiting for server readiness');
  const liveHealth = await waitForServer(healthUrl);
  console.log(' (READY)');

  // 3. Compare identity
  const hostSha = hostMeta.commitSha.slice(0, 7);
  const liveSha = (liveHealth.commit_sha || '').slice(0, 7);
  const liveBuild = liveHealth.build_id;

  console.log(`   Host: ${hostSha} (${hostMeta.buildNumber})`);
  console.log(`   Live: ${liveSha} (${liveBuild})`);

  if (hostSha !== liveSha) {
    console.error('\n🛑 BUILD MISMATCH DETECTED!');
    console.error(
      `   The running server is on commit ${liveSha}, but your local source is on ${hostSha}.`,
    );
    console.error('   Action: Run "pnpm docker:up app-dev" to sync the container.');
    process.exit(1);
  }

  console.log('✅ Build identity synchronized. Proceeding...\n');
}

checkSync().catch((err) => {
  console.error('\n💥 Preflight Failure:', err.message);
  process.exit(1);
});
