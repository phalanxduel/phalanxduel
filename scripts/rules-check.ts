import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = process.cwd();
const RULES_PATH = path.join(ROOT, 'docs', 'RULES.md');
const RULE_ID_PATTERN = /\b(PHX-[A-Z]+-\d{3})\b/g;

// ── 1. Parse rule IDs from docs/RULES.md ────────────────────────────
const rulesContent = fs.readFileSync(RULES_PATH, 'utf-8');
const ruleIds = [...new Set(Array.from(rulesContent.matchAll(RULE_ID_PATTERN), (m) => m[1]))];

if (ruleIds.length === 0) {
  console.error('ERROR: No rule IDs (PHX-XXX-NNN) found in docs/RULES.md');
  process.exit(1);
}

console.log(`Found ${ruleIds.length} rule ID(s) in docs/RULES.md: ${ruleIds.join(', ')}`);

// ── 2. Find all test files recursively ──────────────────────────────
function findTestFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      results.push(...findTestFiles(fullPath));
    } else if (entry.isFile() && /\.test\.ts$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

const packageDirs = ['engine', 'server', 'shared', 'client'].map((d) => path.join(ROOT, d));
const testFiles: string[] = [];
for (const dir of packageDirs) {
  testFiles.push(...findTestFiles(dir));
}

console.log(`Scanning ${testFiles.length} test file(s) for rule ID references...\n`);

// ── 3. Read all test content ────────────────────────────────────────
const allTestContent = testFiles.map((f) => fs.readFileSync(f, 'utf-8')).join('\n');

// ── 4. Check each rule ID ───────────────────────────────────────────
const missing: string[] = [];
for (const id of ruleIds) {
  if (allTestContent.includes(id)) {
    console.log(`  OK  ${id}`);
  } else {
    console.log(`  MISSING  ${id}`);
    missing.push(id);
  }
}

if (missing.length > 0) {
  console.error(`\nERROR: ${missing.length} rule ID(s) not found in any test file:`);
  for (const id of missing) {
    console.error(`  - ${id}`);
  }
  console.error('\nEvery rule ID in docs/RULES.md must be referenced in at least one test.');
  process.exit(1);
}

console.log(`\nAll ${ruleIds.length} rule ID(s) are covered by tests.`);
