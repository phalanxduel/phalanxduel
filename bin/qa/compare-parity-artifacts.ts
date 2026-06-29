#!/usr/bin/env tsx

import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';

type JsonObject = Record<string, unknown>;

interface Artifact {
  dir: string;
  manifest: JsonObject;
  events: JsonObject[];
  screenshots: string[];
}

interface Diff {
  severity: 'error' | 'warning';
  category: 'manifest' | 'events' | 'screenshots' | 'checkpoints' | 'structure';
  field?: string;
  expected: unknown;
  actual: unknown;
  message: string;
}

interface ComparatorOptions {
  referenceDir: string;
  godotDir: string;
  outFile: string;
  summaryFile: string;
  partial: boolean;
  requiredCheckpoints: string[];
  requiredScreenshots: string[];
  actionTolerance: number;
  turnTolerance: number;
  eventTolerance: number;
  allowMissingScreenshots: boolean;
}

interface ParityReport {
  timestamp: string;
  status: 'success' | 'failure';
  partial: boolean;
  referenceDir: string;
  godotDir: string;
  options: {
    actionTolerance: number;
    turnTolerance: number;
    eventTolerance: number;
    requiredCheckpoints: string[];
    requiredScreenshots: string[];
    allowMissingScreenshots: boolean;
  };
  summary: {
    errors: number;
    warnings: number;
    referenceEvents: number;
    godotEvents: number;
    referenceScreenshots: number;
    godotScreenshots: number;
  };
  diffs: Diff[];
}

const rawArgv = process.argv.slice(2);
const argv = rawArgv[0] === '--' ? rawArgv.slice(1) : rawArgv;

const { values } = parseArgs({
  args: argv,
  options: {
    'reference-dir': { type: 'string', short: 'r' },
    'godot-dir': { type: 'string', short: 'g' },
    'out-file': {
      type: 'string',
      short: 'o',
      default: 'artifacts/diffs/parity-artifact-report.json',
    },
    'summary-file': {
      type: 'string',
      default: 'artifacts/diffs/parity-artifact-summary.md',
    },
    partial: { type: 'boolean', short: 'p', default: false },
    'required-checkpoints': { type: 'string', default: 'connected,hydrated,animation_idle' },
    'required-screenshots': { type: 'string', default: '' },
    'action-tolerance': { type: 'string', default: '0' },
    'turn-tolerance': { type: 'string', default: '0' },
    'event-tolerance': { type: 'string', default: '0' },
    'allow-missing-screenshots': { type: 'boolean', default: false },
  },
});

function parseList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNonNegativeInteger(name: string, value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '0', 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`--${name} must be a non-negative integer`);
  }
  return parsed;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getNestedNumber(manifest: JsonObject, field: string, nestedField: string): number | null {
  const direct = asNumber(manifest[field]);
  if (direct !== null) return direct;
  const scenario = manifest.scenario;
  if (scenario && typeof scenario === 'object') {
    return asNumber((scenario as JsonObject)[nestedField]);
  }
  return null;
}

function getScreenshotList(manifest: JsonObject, dir: string): string[] {
  if (Array.isArray(manifest.screenshots)) {
    return manifest.screenshots.filter((item): item is string => typeof item === 'string');
  }

  const count = asNumber(manifest.screenshotCount);
  if (count === 0 && !existsSync(join(dir, 'screenshots'))) {
    return [];
  }

  return [];
}

async function listPngs(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
    .map((entry) => entry.name)
    .sort();
}

async function readJson(path: string): Promise<JsonObject> {
  const raw = await readFile(path, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${path} must contain a JSON object`);
  }
  return parsed as JsonObject;
}

async function readEvents(path: string): Promise<JsonObject[]> {
  if (!existsSync(path)) return [];
  const raw = await readFile(path, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parsed: unknown = JSON.parse(line);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`${path}:${index + 1} must contain a JSON object`);
      }
      return parsed as JsonObject;
    });
}

async function loadArtifact(dir: string): Promise<Artifact> {
  const artifactDir = resolve(dir);
  const manifestPath = join(artifactDir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`missing manifest.json in ${artifactDir}`);
  }

  const manifest = await readJson(manifestPath);
  const events = await readEvents(join(artifactDir, 'events.ndjson'));
  const manifestScreenshots = getScreenshotList(manifest, artifactDir);
  const diskScreenshots = await listPngs(join(artifactDir, 'screenshots'));
  const screenshots =
    manifestScreenshots.length > 0
      ? manifestScreenshots.map((item) => basename(item)).sort()
      : diskScreenshots;

  return {
    dir: artifactDir,
    manifest,
    events,
    screenshots,
  };
}

function pushDiff(diffs: Diff[], diff: Diff): void {
  diffs.push(diff);
}

function compareStringField(
  diffs: Diff[],
  field: string,
  reference: Artifact,
  godot: Artifact,
): void {
  const expected = asString(reference.manifest[field]);
  const actual = asString(godot.manifest[field]);
  if (expected === null && actual === null) return;
  if (expected !== null && actual === null) {
    pushDiff(diffs, {
      severity: 'error',
      category: 'manifest',
      field,
      expected,
      actual,
      message: `Godot manifest is missing ${field}`,
    });
    return;
  }
  if (expected !== null && actual !== null && expected !== actual) {
    pushDiff(diffs, {
      severity: 'error',
      category: 'manifest',
      field,
      expected,
      actual,
      message: `${field} differs`,
    });
  }
}

function compareJsonField(
  diffs: Diff[],
  field: string,
  reference: Artifact,
  godot: Artifact,
): void {
  const expected = reference.manifest[field];
  const actual = godot.manifest[field];
  if (expected === undefined && actual === undefined) return;
  if (expected !== undefined && actual === undefined) {
    pushDiff(diffs, {
      severity: 'error',
      category: 'manifest',
      field,
      expected,
      actual,
      message: `Godot manifest is missing ${field}`,
    });
    return;
  }
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    pushDiff(diffs, {
      severity: 'error',
      category: 'manifest',
      field,
      expected,
      actual,
      message: `${field} differs`,
    });
  }
}

function compareCount(
  diffs: Diff[],
  field: string,
  expected: number | null,
  actual: number | null,
  tolerance: number,
): void {
  if (expected === null && actual === null) return;
  if (expected !== null && actual === null) {
    pushDiff(diffs, {
      severity: 'error',
      category: 'manifest',
      field,
      expected,
      actual,
      message: `Godot artifact is missing ${field}`,
    });
    return;
  }
  if (expected === null || actual === null) return;
  const delta = Math.abs(expected - actual);
  if (delta > tolerance) {
    pushDiff(diffs, {
      severity: 'error',
      category: 'manifest',
      field,
      expected,
      actual,
      message: `${field} differs by ${delta}, tolerance ${tolerance}`,
    });
  }
}

function checkpointNames(artifact: Artifact): Set<string> {
  const names = new Set<string>();
  const checkpoints = artifact.manifest.checkpoints;
  if (Array.isArray(checkpoints)) {
    for (const checkpoint of checkpoints) {
      if (checkpoint && typeof checkpoint === 'object') {
        const type = asString((checkpoint as JsonObject).type);
        if (type) names.add(type);
      }
    }
  }
  for (const event of artifact.events) {
    const checkpoint = asString(event.checkpoint);
    const type = asString(event.type);
    if (checkpoint) names.add(checkpoint);
    if (type === 'checkpoint') {
      const detail = event.detail;
      if (typeof detail === 'string') names.add(detail);
      if (detail && typeof detail === 'object') {
        const detailCheckpoint = asString((detail as JsonObject).checkpoint);
        const detailType = asString((detail as JsonObject).type);
        if (detailCheckpoint) names.add(detailCheckpoint);
        if (detailType) names.add(detailType);
      }
    }
  }
  return names;
}

function compareCheckpoints(diffs: Diff[], godot: Artifact, requiredCheckpoints: string[]): void {
  const actual = checkpointNames(godot);
  for (const checkpoint of requiredCheckpoints) {
    if (!actual.has(checkpoint)) {
      pushDiff(diffs, {
        severity: 'error',
        category: 'checkpoints',
        field: checkpoint,
        expected: checkpoint,
        actual: Array.from(actual).sort(),
        message: `Godot artifact is missing required checkpoint ${checkpoint}`,
      });
    }
  }
}

function screenshotLabels(screenshots: string[]): Set<string> {
  const labels = new Set<string>();
  for (const screenshot of screenshots) {
    const stem = basename(screenshot).replace(/\.png$/i, '');
    const parts = stem.split('_');
    const label = parts[parts.length - 1];
    if (label) labels.add(label);
  }
  return labels;
}

function compareScreenshots(
  diffs: Diff[],
  reference: Artifact,
  godot: Artifact,
  requiredScreenshots: string[],
  allowMissingScreenshots: boolean,
): void {
  const severity = allowMissingScreenshots ? 'warning' : 'error';
  if (reference.screenshots.length > 0 && godot.screenshots.length === 0) {
    pushDiff(diffs, {
      severity,
      category: 'screenshots',
      field: 'screenshots',
      expected: `at least one screenshot; reference has ${reference.screenshots.length}`,
      actual: 0,
      message: 'Godot artifact has no screenshots',
    });
  }

  const actualLabels = screenshotLabels(godot.screenshots);
  for (const label of requiredScreenshots) {
    if (!actualLabels.has(label)) {
      pushDiff(diffs, {
        severity,
        category: 'screenshots',
        field: label,
        expected: label,
        actual: Array.from(actualLabels).sort(),
        message: `Godot artifact is missing required screenshot label ${label}`,
      });
    }
  }
}

function compareEvents(
  diffs: Diff[],
  reference: Artifact,
  godot: Artifact,
  eventTolerance: number,
): void {
  const delta = Math.abs(reference.events.length - godot.events.length);
  if (delta > eventTolerance) {
    pushDiff(diffs, {
      severity: 'error',
      category: 'events',
      field: 'events.ndjson',
      expected: reference.events.length,
      actual: godot.events.length,
      message: `event count differs by ${delta}, tolerance ${eventTolerance}`,
    });
  }
}

function compareArtifacts(
  reference: Artifact,
  godot: Artifact,
  options: ComparatorOptions,
): Diff[] {
  const diffs: Diff[] = [];

  for (const field of [
    'status',
    'winnerName',
    'outcomeText',
    'victorySummaryText',
    'lifepointsText',
  ]) {
    compareStringField(diffs, field, reference, godot);
  }
  compareJsonField(diffs, 'finalLifepoints', reference, godot);

  compareCount(
    diffs,
    'turnCount',
    getNestedNumber(reference.manifest, 'turnCount', 'turnCount'),
    getNestedNumber(godot.manifest, 'turnCount', 'turnCount'),
    options.turnTolerance,
  );
  compareCount(
    diffs,
    'actionCount',
    getNestedNumber(reference.manifest, 'actionCount', 'actionCount'),
    getNestedNumber(godot.manifest, 'actionCount', 'actionCount'),
    options.actionTolerance,
  );

  compareEvents(diffs, reference, godot, options.eventTolerance);
  compareCheckpoints(diffs, godot, options.requiredCheckpoints);
  compareScreenshots(
    diffs,
    reference,
    godot,
    options.requiredScreenshots,
    options.allowMissingScreenshots,
  );

  return diffs;
}

function renderSummary(report: ParityReport): string {
  const lines = [
    '# Parity Artifact Comparison',
    '',
    `Status: ${report.status}`,
    `Mode: ${report.partial ? 'partial slice' : 'strict'}`,
    `Reference: ${relative(process.cwd(), report.referenceDir) || '.'}`,
    `Godot: ${relative(process.cwd(), report.godotDir) || '.'}`,
    '',
    '## Summary',
    '',
    `- Errors: ${report.summary.errors}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Events: reference ${report.summary.referenceEvents}, Godot ${report.summary.godotEvents}`,
    `- Screenshots: reference ${report.summary.referenceScreenshots}, Godot ${report.summary.godotScreenshots}`,
    '',
  ];

  if (report.diffs.length === 0) {
    lines.push('No parity mismatches found.', '');
    return `${lines.join('\n')}\n`;
  }

  lines.push('## Findings', '');
  for (const diff of report.diffs) {
    lines.push(
      `- ${diff.severity.toUpperCase()} ${diff.category}${diff.field ? `.${diff.field}` : ''}: ${diff.message}`,
    );
  }

  return `${lines.join('\n')}\n`;
}

function buildOptions(): ComparatorOptions {
  const referenceDir = values['reference-dir'];
  const godotDir = values['godot-dir'];
  if (!referenceDir || !godotDir) {
    throw new Error(
      'usage: pnpm qa:godot:compare-artifacts -- --reference-dir <dir> --godot-dir <dir>',
    );
  }

  const partial = values.partial ?? false;
  return {
    referenceDir,
    godotDir,
    outFile: values['out-file'] ?? 'artifacts/diffs/parity-artifact-report.json',
    summaryFile: values['summary-file'] ?? 'artifacts/diffs/parity-artifact-summary.md',
    partial,
    requiredCheckpoints: parseList(values['required-checkpoints']),
    requiredScreenshots: parseList(values['required-screenshots']),
    actionTolerance: parseNonNegativeInteger('action-tolerance', values['action-tolerance']),
    turnTolerance: parseNonNegativeInteger('turn-tolerance', values['turn-tolerance']),
    eventTolerance: parseNonNegativeInteger('event-tolerance', values['event-tolerance']),
    allowMissingScreenshots: (values['allow-missing-screenshots'] ?? false) || partial,
  };
}

async function main(): Promise<number> {
  const options = buildOptions();
  const reference = await loadArtifact(options.referenceDir);
  const godot = await loadArtifact(options.godotDir);
  const diffs = compareArtifacts(reference, godot, options);
  const errors = diffs.filter((diff) => diff.severity === 'error').length;
  const warnings = diffs.filter((diff) => diff.severity === 'warning').length;

  const report: ParityReport = {
    timestamp: new Date().toISOString(),
    status: errors === 0 ? 'success' : 'failure',
    partial: options.partial,
    referenceDir: reference.dir,
    godotDir: godot.dir,
    options: {
      actionTolerance: options.actionTolerance,
      turnTolerance: options.turnTolerance,
      eventTolerance: options.eventTolerance,
      requiredCheckpoints: options.requiredCheckpoints,
      requiredScreenshots: options.requiredScreenshots,
      allowMissingScreenshots: options.allowMissingScreenshots,
    },
    summary: {
      errors,
      warnings,
      referenceEvents: reference.events.length,
      godotEvents: godot.events.length,
      referenceScreenshots: reference.screenshots.length,
      godotScreenshots: godot.screenshots.length,
    },
    diffs,
  };

  await mkdir(dirname(options.outFile), { recursive: true });
  await mkdir(dirname(options.summaryFile), { recursive: true });
  await writeFile(options.outFile, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(options.summaryFile, renderSummary(report));

  console.log(renderSummary(report).trim());
  console.log(`\nJSON report: ${options.outFile}`);
  console.log(`Summary: ${options.summaryFile}`);

  return report.status === 'success' ? 0 : 1;
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Parity artifact comparison failed: ${message}`);
    process.exit(1);
  });
