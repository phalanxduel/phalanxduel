#!/usr/bin/env tsx
/**
 * Exports live repository, engine, rule-evidence, and datalake metrics to
 * docs/print/data/monograph-metrics.json for consumption by Typst print specs.
 *
 * Usage: node --import tsx scripts/docs/export-monograph-data.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIVENESS_POLICY } from '../../engine/src/liveness.js';
import { GAME_PHASES, STATE_MACHINE } from '../../engine/src/state-machine.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_FILE = path.join(ROOT_DIR, 'docs/print/data/monograph-metrics.json');

interface RuleEntry {
  status: string;
  formalization: string;
  evidence: string;
}

const pkg = JSON.parse(readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8')) as {
  version: string;
  buildNumber?: number;
};

const ruleEvidence = JSON.parse(
  readFileSync(path.join(ROOT_DIR, 'docs/gameplay/rule-evidence.json'), 'utf8'),
) as { rulesVersion: string; rules: RuleEntry[] };

const datalakeCatalogPath = path.join(ROOT_DIR, 'datalake/data/gold/datalake_catalog.json');
const datalakeCatalog = existsSync(datalakeCatalogPath)
  ? JSON.parse(readFileSync(datalakeCatalogPath, 'utf8'))
  : null;

const metrics = {
  packageVersion: pkg.version,
  buildNumber: pkg.buildNumber ?? 0,
  rulesVersion: ruleEvidence.rulesVersion,
  fsm: {
    phaseCount: GAME_PHASES.length,
    transitionCount: STATE_MACHINE.length,
    nonTerminalPhases: GAME_PHASES.filter((p) => p !== 'gameOver').length,
  },
  liveness: {
    repetitionOccurrences: LIVENESS_POLICY.repetitionOccurrences,
    noProgressTurns: LIVENESS_POLICY.noProgressTurns,
    hardTurnLimit: LIVENESS_POLICY.hardTurnLimit,
  },
  ruleEvidence: {
    total: ruleEvidence.rules.length,
    aligned: ruleEvidence.rules.filter((r) => r.status === 'aligned').length,
    partial: ruleEvidence.rules.filter((r) => r.status === 'partial').length,
    unverified: ruleEvidence.rules.filter((r) => r.status === 'unverified').length,
  },
  formalSpec: {
    tlaModule: 'docs/formal/PhalanxDuelV3.tla',
    verifierScript: 'scripts/ci/verify-formal-properties.ts',
    exhaustiveCombatTransitions: 2355388,
  },
  datalakePresent: Boolean(datalakeCatalog),
};

mkdirSync(path.dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');
console.log(`Generated: ${path.relative(ROOT_DIR, OUT_FILE)}`);
