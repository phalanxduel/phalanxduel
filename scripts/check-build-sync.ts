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
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching health from ${url}`));
    });
  });
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

  // 2. Fetch live health
  let liveHealth;
  const healthUrl = 'http://127.0.0.1:3001/health';
  try {
    liveHealth = await fetchHealth(healthUrl);
  } catch (err) {
    console.error(`❌ Server unreachable at ${healthUrl}. Ensure server is running.`);
    process.exit(1);
  }

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
    console.error('   Action: Run "pnpm docker:rebuild" or restart your local server to sync.');
    process.exit(1);
  }

  console.log('✅ Build identity synchronized. Proceeding...\n');
}

checkSync().catch((err) => {
  console.error('💥 Preflight Crash:', err.message);
  process.exit(1);
});
