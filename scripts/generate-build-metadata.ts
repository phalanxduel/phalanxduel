/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function getGitHash(): string {
  const explicitSha =
    process.env.GIT_COMMIT_SHA ?? process.env.SOURCE_COMMIT ?? process.env.GITHUB_SHA;
  if (explicitSha?.trim()) return explicitSha.trim();

  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

function generateMetadata() {
  const explicitBuildNumber = process.env.BUILD_NUMBER?.trim();
  const metadata = {
    version: getVersion(),
    buildNumber: explicitBuildNumber || new Date().toISOString().replace(/[:.-]/g, '').slice(0, 14), // UTC Timestamp
    commitSha: getGitHash(),
    generatedAt: new Date().toISOString(),
  };

  const outPath = join(ROOT, 'build-metadata.json');
  writeFileSync(outPath, JSON.stringify(metadata, null, 2) + '\n');
  console.log(
    `✅ Build metadata generated: ${metadata.buildNumber} (${metadata.commitSha.slice(0, 7)})`,
  );
}

generateMetadata();
