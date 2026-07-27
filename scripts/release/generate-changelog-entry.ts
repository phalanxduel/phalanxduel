/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

/**
 * Generates a CHANGELOG.md-ready entry from conventional-commit messages since
 * the last plain `vX.Y.Z` tag. Deliberately does NOT bump SCHEMA_VERSION, tag,
 * or touch scripts/release/sync-version.sh's flow — this only drafts text for
 * a human to review before running the existing pnpm release:prepare /
 * release:tag steps.
 *
 * Usage:
 *   pnpm release:notes            # print the draft entry to stdout
 *   pnpm release:notes --write    # insert it into CHANGELOG.md for editing
 */

import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const CHANGELOG_PATH = join(ROOT, 'CHANGELOG.md');

function getLatestTag(): string {
  try {
    return (
      execFileSync('git', ['tag', '-l', 'v*', '--sort=-v:refname'], {
        cwd: ROOT,
        encoding: 'utf8',
      })
        .split('\n')
        .find((line) => line.trim().length > 0)
        ?.trim() ?? ''
    );
  } catch {
    return '';
  }
}

function generateNotes(prevTag: string): string {
  return execFileSync('bash', [join(ROOT, 'scripts/release/generate-notes.sh'), prevTag, 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trimEnd();
}

function main() {
  const write = process.argv.includes('--write');
  const prevTag = getLatestTag();
  const notes = generateNotes(prevTag);

  const today = new Date().toISOString().slice(0, 10);
  const entry = `## [Unreleased] - ${today}\n\n${notes}\n`;

  if (!write) {
    console.log(entry);
    if (prevTag) {
      console.error(`\n(commits since ${prevTag} — this is a draft; review before committing)`);
    } else {
      console.error(
        '\n(no prior vX.Y.Z tag found — showing full history; review before committing)',
      );
    }
    return;
  }

  const changelog = readFileSync(CHANGELOG_PATH, 'utf8');
  const headerMatch = /^# Changelog\n/.exec(changelog);
  if (!headerMatch) {
    throw new Error('CHANGELOG.md does not start with the expected "# Changelog" header');
  }
  const insertAt = headerMatch[0].length;
  const updated = `${changelog.slice(0, insertAt)}\n${entry}\n${changelog.slice(insertAt)}`;
  writeFileSync(CHANGELOG_PATH, updated);
  console.log(`✅ Draft entry inserted into ${CHANGELOG_PATH} — review before committing.`);
}

main();
