import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GAME_PHASES } from '../../engine/src/state-machine.js';

const LOOP_PHASES = [
  'StartTurn',
  'AttackPhase',
  'AttackResolution',
  'CleanupPhase',
  'ReinforcementPhase',
  'DrawPhase',
  'EndTurn',
] as const;
const LEGACY_HASH_MODEL_MARKER = 'legacy-hash-model';

const REQUIRED_FILES = {
  rules: 'docs/RULES.md',
  architecture: 'docs/system/ARCHITECTURE.md',
  decisionsIndex: 'backlog/decisions/README.md',
  stateMachine: 'engine/src/state-machine.ts',
} as const;

const failures: string[] = [];

function abs(path: string): string {
  return resolve(process.cwd(), path);
}

function read(path: string): string {
  return readFileSync(abs(path), 'utf8');
}

function assert(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

function assertOrderedTokens(content: string, tokens: readonly string[], label: string): void {
  let cursor = -1;
  for (const token of tokens) {
    const next = content.indexOf(token, cursor + 1);
    if (next === -1) {
      failures.push(`${label}: missing token "${token}"`);
      return;
    }
    if (next < cursor) {
      failures.push(`${label}: token "${token}" appears out of order`);
      return;
    }
    cursor = next;
  }
}

for (const path of Object.values(REQUIRED_FILES)) {
  assert(existsSync(abs(path)), `missing required file: ${path}`);
}

if (failures.length === 0) {
  const rules = read(REQUIRED_FILES.rules);
  const architecture = read(REQUIRED_FILES.architecture);
  const stateMachine = read(REQUIRED_FILES.stateMachine);
  const decisionsIndex = read(REQUIRED_FILES.decisionsIndex);

  assertOrderedTokens(rules, LOOP_PHASES, 'docs/RULES.md turn lifecycle');
  assertOrderedTokens(architecture, LOOP_PHASES, 'docs/system/ARCHITECTURE.md turn lifecycle');

  for (const phase of [...LOOP_PHASES, 'gameOver'] as const) {
    assert(
      GAME_PHASES.includes(phase),
      `engine/src/state-machine.ts GAME_PHASES missing "${phase}"`,
    );
  }

  assert(
    !stateMachine.includes('docs/system/GAME_STATE_MACHINE.md'),
    'engine/src/state-machine.ts still references missing docs/system/GAME_STATE_MACHINE.md',
  );

  assert(
    decisionsIndex.includes('# Decision Records') &&
      decisionsIndex.includes('DEC-2A-001') &&
      decisionsIndex.includes('DEC-OPEN-2C-001'),
    'backlog/decisions/README.md must index the canonical decision records',
  );

  assert(
    rules.includes('stateHashBefore') && rules.includes('stateHashAfter'),
    'docs/RULES.md must document stateHashBefore/stateHashAfter deterministic hash fields',
  );

  for (const legacyTerm of ['eventLogHash', 'preStateHash'] as const) {
    assert(
      !rules.includes(legacyTerm) || rules.includes(LEGACY_HASH_MODEL_MARKER),
      `docs/RULES.md contains legacy hash term "${legacyTerm}" without explicit "${LEGACY_HASH_MODEL_MARKER}" marker`,
    );
  }
}

if (failures.length > 0) {
  console.error('Rules/FSM consistency check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Rules/FSM consistency checks passed.');
