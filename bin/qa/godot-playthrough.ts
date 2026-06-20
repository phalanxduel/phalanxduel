#!/usr/bin/env tsx

import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { existsSync } from 'node:fs';
import { copyFile } from 'node:fs/promises';

const rawArgv = process.argv.slice(2);
const argv = rawArgv[0] === '--' ? rawArgv.slice(1) : rawArgv;

type ManifestStatus = 'success' | 'failure';

interface GodotRunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

interface GodotPlaythroughResult {
  ok?: boolean;
  errors?: string[];
  screenshotCount?: number;
  screenshots?: string[];
  checkpoints?: { type?: string; sequence?: number; metadata?: Record<string, unknown> }[];
  summary?: {
    outcomeText?: string | null;
    winnerName?: string;
    victorySummaryText?: string;
    lifepointsText?: string;
    finalLifepoints?: Record<string, number>;
    turnCount?: number;
    phase?: string;
  };
}

interface GodotPlaythroughManifest {
  startAt: string;
  endAt: string;
  durationMs: number;
  baseUrl: string;
  status: ManifestStatus;
  failureReason?: 'runtime_error' | 'missing_artifact';
  failureMessage?: string;
  turnCount: number;
  actionCount: number;
  screenshotCount: number;
  screenshots: string[];
  outcomeText: string | null;
  winnerName?: string;
  victorySummaryText?: string;
  lifepointsText?: string;
  finalLifepoints?: Record<string, number>;
  screenshotMode: 'checkpoint';
  runId: string;
  client: 'godot';
  headed: boolean;
  mode: 'demo' | 'live';
  checkpoints: NonNullable<GodotPlaythroughResult['checkpoints']>;
  godot: {
    projectDir: string;
    resultPath: string;
    stdout: string;
    stderr: string;
  };
}

const { values } = parseArgs({
  args: argv,
  options: {
    'watch-url': { type: 'string' },
    'match-id': { type: 'string' },
    'replay-speed': { type: 'string', default: '1.5' },
    'godot-bin': { type: 'string' },
    'artifact-dir': { type: 'string' },
    'out-dir': { type: 'string', default: 'artifacts/godot-playthrough' },
    headless: { type: 'boolean', default: false },
    'require-screenshots': { type: 'boolean', default: false },
    'keep-temp': { type: 'boolean', default: false },
    'input-replay': { type: 'string' },
  },
});

function spawnGodot(
  command: string,
  args: string[],
  homeDir: string,
  timeoutMs: number = 300000,
): Promise<GodotRunResult> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, HOME: homeDir },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Godot process timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolveRun({ code, stdout, stderr });
    });
  });
}

async function readResult(path: string): Promise<GodotPlaythroughResult | null> {
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as GodotPlaythroughResult;
  } catch {
    return null;
  }
}

async function getLatestRunDir(parentDir: string): Promise<string | null> {
  if (!existsSync(parentDir)) return null;
  const entries = await readdir(parentDir, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => join(parentDir, e.name))
    .filter((p) => existsSync(join(p, 'events.ndjson')));
  if (dirs.length === 0) return null;
  dirs.sort();
  return dirs[dirs.length - 1];
}

async function listScreenshotArtifacts(artifactDir: string): Promise<string[]> {
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const files = await readdir(join(artifactDir, 'screenshots'));
    return files
      .filter((file) => file.endsWith('.png'))
      .sort()
      .map((file) => join('screenshots', file));
  } catch {
    return [];
  }
}

async function writeEvents(
  path: string,
  result: GodotPlaythroughResult | null,
  errors: string[],
): Promise<void> {
  const at = new Date().toISOString();
  const events = [
    { at, type: 'state', detail: 'start Godot demo playthrough', phase: 'demo' },
    ...(result?.checkpoints ?? []).map((checkpoint) => ({
      at,
      type: 'checkpoint',
      detail: checkpoint.type ?? 'unknown',
      checkpoint: checkpoint.type ?? 'unknown',
      turn:
        typeof checkpoint.metadata?.turnNumber === 'number'
          ? checkpoint.metadata.turnNumber
          : result?.summary?.turnCount,
      phase: checkpoint.metadata?.phase ?? 'demo',
    })),
    errors.length > 0
      ? { at, type: 'error', detail: errors.join('; '), phase: 'demo' }
      : {
          at,
          type: 'result',
          detail: result?.summary?.outcomeText ?? 'Godot demo playthrough complete',
          phase: result?.summary?.phase ?? 'gameOver',
          outcomeText: result?.summary?.outcomeText ?? null,
          winnerName: result?.summary?.winnerName,
          lifepointsText: result?.summary?.lifepointsText,
        },
  ];
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await writeFile(path, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);
}

async function main(): Promise<number> {
  const godotBin = values['godot-bin'] ?? process.env.GODOT_BIN ?? 'godot';
  const projectDir = resolve('godot/client');
  const tempHome = await mkdtemp(`${tmpdir()}/phx-godot-home-`);
  const runId = `godot-playthrough-${Date.now()}`;
  const artifactDir = resolve(
    values['artifact-dir'] ?? join(values['out-dir'] ?? 'artifacts/godot-playthrough', runId),
  );
  const resultPath = join(artifactDir, 'result.json');
  const manifestPath = join(artifactDir, 'manifest.json');
  const eventsPath = join(artifactDir, 'events.ndjson');
  const start = new Date();
  const captureScreenshots = !values.headless || values['require-screenshots'];

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await mkdir(join(artifactDir, 'screenshots'), { recursive: true });

  const args: string[] = [];
  if (values.headless) {
    args.push('--headless');
  }
  args.push('--path', projectDir);
  if (values['watch-url'] && values['match-id']) {
    args.push(
      '--',
      '--live',
      '--watch-url',
      values['watch-url'],
      '--match-id',
      values['match-id'],
      '--replay-speed',
      values['replay-speed'] ?? '1.5',
      '--artifact-dir',
      artifactDir,
    );
    if (captureScreenshots) args.push('--capture-screenshots');
  } else {
    if (values['watch-url'] || values['match-id']) {
      throw new Error('--watch-url and --match-id must be passed together');
    }
    // Auto-discover and copy latest reference playthrough replay frames if available
    let hasInputReplay = false;
    let inputReplayPath = '';

    if (values['input-replay']) {
      inputReplayPath = resolve(values['input-replay']);
      hasInputReplay = true;
    } else {
      const latestRefDir = await getLatestRunDir(resolve('artifacts/playthrough'));
      if (latestRefDir) {
        const replayFramesPath = join(latestRefDir, 'replay_frames.json');
        if (existsSync(replayFramesPath)) {
          inputReplayPath = join(artifactDir, 'input_replay.json');
          await copyFile(replayFramesPath, inputReplayPath);
          hasInputReplay = true;
        }
      }
    }

    args.push(
      '--',
      '--demo',
      '--replay-speed',
      values['replay-speed'] ?? '1.5',
      '--artifact-dir',
      artifactDir,
    );
    if (hasInputReplay) {
      args.push('--input-replay', inputReplayPath);
    }
    if (captureScreenshots) args.push('--capture-screenshots');
  }

  try {
    const run = await spawnGodot(godotBin, args, tempHome);
    const result = await readResult(resultPath);
    const screenshots = result?.screenshots?.length
      ? result.screenshots
      : await listScreenshotArtifacts(artifactDir);
    const errors: string[] = [];
    if (run.code !== 0) errors.push(`Godot exited with code ${run.code ?? 'unknown'}`);
    if (result == null) {
      errors.push(`missing result.json at ${resultPath}`);
    } else if (result.ok === false) {
      errors.push(...(result.errors ?? ['Godot playthrough reported ok=false']));
    }
    if (!values.headless && screenshots.length === 0) {
      errors.push('visible Godot playthrough did not emit screenshots');
    }
    if (values['require-screenshots'] && screenshots.length === 0) {
      errors.push('required screenshots were not emitted');
    }

    const end = new Date();
    const manifest: GodotPlaythroughManifest = {
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      durationMs: end.getTime() - start.getTime(),
      baseUrl: 'godot://local',
      status: errors.length > 0 ? 'failure' : 'success',
      failureReason: errors.length > 0 ? 'runtime_error' : undefined,
      failureMessage: errors.length > 0 ? errors.join('; ') : undefined,
      turnCount: result?.summary?.turnCount ?? 0,
      actionCount: result?.checkpoints?.length ?? 0,
      screenshotCount: screenshots.length,
      screenshots,
      outcomeText: result?.summary?.outcomeText ?? null,
      winnerName: result?.summary?.winnerName,
      victorySummaryText: result?.summary?.victorySummaryText,
      lifepointsText: result?.summary?.lifepointsText,
      finalLifepoints: result?.summary?.finalLifepoints,
      screenshotMode: 'checkpoint',
      runId,
      client: 'godot',
      headed: !values.headless,
      mode: values['watch-url'] && values['match-id'] ? 'live' : 'demo',
      checkpoints: result?.checkpoints ?? [],
      godot: {
        projectDir,
        resultPath,
        stdout: run.stdout,
        stderr: run.stderr,
      },
    };

    await writeEvents(eventsPath, result, errors);
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Artifacts: ${artifactDir}`);
    console.log(`Manifest: ${manifestPath}`);

    if (manifest.status !== 'success') {
      console.error(`Godot playthrough failed: ${manifest.failureMessage ?? 'unknown error'}`);
      return run.code && run.code !== 0 ? run.code : 1;
    }

    return 0;
  } finally {
    if (!values['keep-temp']) {
      await rm(tempHome, { recursive: true, force: true });
    } else {
      console.log(`Temporary Godot HOME retained: ${tempHome}`);
    }
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
