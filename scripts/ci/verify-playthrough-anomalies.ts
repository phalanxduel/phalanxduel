import '../instrument-cli.ts';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { beginQaRun } from '../../bin/qa/telemetry.js';

type FailureReason = 'timeout' | 'stalled' | 'selector_error' | 'runtime_error';

type RunManifest = {
  seed: number;
  status: 'success' | 'failure';
  failureReason?: FailureReason;
  failureMessage?: string;
  turnCount: number;
  actionCount: number;
  durationMs: number;
  damageMode?: string;
  startingLifepoints?: number;
  outcomeText?: string | null;
};

type RunEvent = {
  at: string;
  type: 'action' | 'state' | 'result' | 'error';
  detail: string;
};

type ServerLogEntry = {
  level?: number;
  msg?: string;
  res?: {
    statusCode?: number;
  };
};

type CliOptions = {
  dir: string;
  latest: number;
  serverLog: string;
  serverTailLines: number;
  failOnWarn: boolean;
};

const DEFAULTS: CliOptions = {
  dir: 'artifacts/playthrough',
  latest: 12,
  serverLog: 'logs/server.log',
  serverTailLines: 5000,
  failOnWarn: false,
};

function parseIntArg(raw: string, fallback: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.trunc(parsed));
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { ...DEFAULTS };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const v = argv[i + 1];
    if (a === '--dir' && v) opts.dir = v;
    if (a === '--latest' && v) opts.latest = parseIntArg(v, DEFAULTS.latest);
    if (a === '--server-log' && v) opts.serverLog = v;
    if (a === '--server-tail-lines' && v) {
      opts.serverTailLines = parseIntArg(v, DEFAULTS.serverTailLines);
    }
    if (a === '--fail-on-warn') opts.failOnWarn = true;
  }

  return opts;
}

function abs(path: string): string {
  return resolve(process.cwd(), path);
}

function listRecentRunDirs(dirPath: string, latest: number): string[] {
  const absDir = abs(dirPath);
  if (!existsSync(absDir)) return [];
  return readdirSync(absDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(absDir, entry.name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
    .slice(0, latest);
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function readNdjson<T>(path: string): T[] {
  const raw = readFileSync(path, 'utf8').trim();
  if (!raw) return [];
  return raw.split('\n').map((line) => JSON.parse(line) as T);
}

function rel(path: string): string {
  return path.replace(`${process.cwd()}/`, '');
}

function isSevereServerLogLine(line: string): boolean {
  if (line.includes('ERR_')) return true;

  try {
    const parsed = JSON.parse(line) as ServerLogEntry;
    if (typeof parsed.level === 'number' && parsed.level >= 40) return true;
    return typeof parsed.res?.statusCode === 'number' && parsed.res.statusCode >= 500;
  } catch {
    return /\berror\b/i.test(line);
  }
}

function scanServerLog(opts: CliOptions, warnings: string[]): void {
  const serverLogPath = abs(opts.serverLog);
  if (!existsSync(serverLogPath)) return;

  const lines = readFileSync(serverLogPath, 'utf8').split('\n');
  const tail = lines.slice(-opts.serverTailLines);
  const deployLines = tail.filter((line) => line.includes('"action":"deploy"'));
  const deployPassLines = deployLines.filter((line) => line.includes('"details":{"type":"pass"}'));
  if (deployLines.length > 0 && deployPassLines.length === deployLines.length) {
    warnings.push(
      `server log anomaly: ${deployPassLines.length}/${deployLines.length} recent deploy events encode details.type=pass`,
    );
  }

  const severeLines = tail.filter(isSevereServerLogLine);
  if (severeLines.length > 0) {
    warnings.push(`server log warnings/errors in recent tail: ${severeLines.length} line(s)`);
  }
}

function main(): void {
  const opts = parseArgs(process.argv.slice(2));
  const errors: string[] = [];
  const warnings: string[] = [];
  const qaRun = beginQaRun({
    tool: 'verify-playthrough-anomalies',
    runId: `verify-playthrough-anomalies-${Date.now()}`,
    baseUrl: opts.serverLog,
  });

  const runDirs = listRecentRunDirs(opts.dir, opts.latest);
  if (runDirs.length === 0) {
    errors.push(`no playthrough run directories found in ${opts.dir}`);
    qaRun.recordPattern('missing_run_dirs', { 'qa.dir': opts.dir }, SeverityNumber.ERROR, 'ERROR');
  }

  let successCount = 0;
  let failureCount = 0;
  let missingManifestCount = 0;

  for (const runDir of runDirs) {
    const manifestPath = join(runDir, 'manifest.json');
    const eventsPath = join(runDir, 'events.ndjson');
    const runLabel = rel(runDir);

    if (!existsSync(manifestPath)) {
      missingManifestCount++;
      errors.push(`${runLabel}: missing manifest.json (interrupted or incomplete run)`);
      qaRun.recordPattern(
        'missing_manifest',
        { 'qa.run_dir': runLabel },
        SeverityNumber.ERROR,
        'ERROR',
      );
      continue;
    }

    let manifest: RunManifest;
    try {
      manifest = readJson<RunManifest>(manifestPath);
    } catch (err) {
      errors.push(
        `${runLabel}: invalid manifest.json (${err instanceof Error ? err.message : String(err)})`,
      );
      qaRun.recordPattern(
        'invalid_manifest',
        { 'qa.run_dir': runLabel },
        SeverityNumber.ERROR,
        'ERROR',
      );
      continue;
    }

    if (manifest.status !== 'success') {
      failureCount++;
      errors.push(
        `${runLabel}: failed run (reason=${manifest.failureReason ?? 'unknown'}, msg=${manifest.failureMessage ?? 'n/a'})`,
      );
      qaRun.recordPattern(
        'failed_run',
        { 'qa.run_dir': runLabel, 'qa.failure_reason': manifest.failureReason },
        SeverityNumber.ERROR,
        'ERROR',
      );
    } else {
      successCount++;
    }

    if (!existsSync(eventsPath)) {
      errors.push(`${runLabel}: missing events.ndjson`);
      qaRun.recordPattern(
        'missing_events',
        { 'qa.run_dir': runLabel },
        SeverityNumber.ERROR,
        'ERROR',
      );
      continue;
    }

    let events: RunEvent[];
    try {
      events = readNdjson<RunEvent>(eventsPath);
    } catch (err) {
      errors.push(
        `${runLabel}: invalid events.ndjson (${err instanceof Error ? err.message : String(err)})`,
      );
      qaRun.recordPattern(
        'invalid_events',
        { 'qa.run_dir': runLabel },
        SeverityNumber.ERROR,
        'ERROR',
      );
      continue;
    }

    if (events.length === 0) {
      errors.push(`${runLabel}: empty events.ndjson`);
      qaRun.recordPattern(
        'empty_events',
        { 'qa.run_dir': runLabel },
        SeverityNumber.ERROR,
        'ERROR',
      );
      continue;
    }

    const errorEvents = events.filter((event) => event.type === 'error');
    if (errorEvents.length > 0) {
      errors.push(`${runLabel}: contains ${errorEvents.length} error event(s)`);
      qaRun.recordPattern(
        'run_error_events',
        { 'qa.run_dir': runLabel, 'qa.error_events': errorEvents.length },
        SeverityNumber.ERROR,
        'ERROR',
      );
    }

    if (manifest.status === 'success' && !manifest.outcomeText) {
      warnings.push(`${runLabel}: success run missing outcomeText`);
      qaRun.recordPattern(
        'missing_outcome_text',
        { 'qa.run_dir': runLabel },
        SeverityNumber.WARN,
        'WARN',
      );
    }
  }

  scanServerLog(opts, warnings);

  console.log('Playthrough anomaly report');
  console.log(`- scanned runs: ${runDirs.length}`);
  console.log(`- success runs: ${successCount}`);
  console.log(`- failed runs: ${failureCount}`);
  console.log(`- missing manifests: ${missingManifestCount}`);
  console.log(`- warnings: ${warnings.length}`);
  console.log(`- errors: ${errors.length}`);

  if (warnings.length > 0) {
    console.log('\nWarnings:');
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const error of errors) {
      console.log(`- ${error}`);
    }
  }

  if (errors.length > 0 || (opts.failOnWarn && warnings.length > 0)) {
    qaRun.finish({
      status: 'failure',
      durationMs: 0,
      actionCount: warnings.length + errors.length,
      failureReason: errors.length > 0 ? 'anomaly_errors' : 'anomaly_warnings',
      failureMessage: `warnings=${warnings.length} errors=${errors.length}`,
    });
    process.exit(1);
  }

  qaRun.finish({
    status: 'success',
    durationMs: 0,
    actionCount: warnings.length,
    outcomeText: `warnings=${warnings.length} errors=${errors.length}`,
  });
}

main();
