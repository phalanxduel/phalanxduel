#!/usr/bin/env tsx

import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { parseArgs } from 'node:util';
import { existsSync } from 'node:fs';

interface ParityDiff {
  type: string;
  field?: string;
  expected: any;
  actual: any;
  message: string;
}

interface ScreenshotComparison {
  name: string;
  refPath: string;
  godotPath: string;
  match: boolean;
  diffPixels?: number;
  error?: string;
}

interface ParityReport {
  timestamp: string;
  referenceDir: string;
  godotDir: string;
  status: 'success' | 'failure';
  partial: boolean;
  manifestComparisons: ParityDiff[];
  checkpointComparisons: ParityDiff[];
  screenshotComparisons: ScreenshotComparison[];
}

const rawArgv = process.argv.slice(2);
const argv = rawArgv[0] === '--' ? rawArgv.slice(1) : rawArgv;

const { values } = parseArgs({
  args: argv,
  options: {
    'reference-dir': { type: 'string', short: 'r' },
    'godot-dir': { type: 'string', short: 'g' },
    partial: { type: 'boolean', short: 'p', default: false },
    'out-file': { type: 'string', short: 'o', default: 'artifacts/diffs/parity-report.json' },
    threshold: { type: 'string', default: '0.1' },
    tolerance: { type: 'string', default: '0' },
  },
});

async function getLatestRunDir(parentDir: string): Promise<string | null> {
  if (!existsSync(parentDir)) return null;
  const entries = await readdir(parentDir, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => join(parentDir, e.name))
    .filter((p) => existsSync(join(p, 'manifest.json')));
  if (dirs.length === 0) return null;
  dirs.sort();
  return dirs[dirs.length - 1];
}

async function compareImages(
  path1: string,
  path2: string,
  diffPath: string,
  threshold = 0.1,
  maxAllowedDiff = 0,
): Promise<{ match: boolean; diffPixels: number }> {
  const img1 = PNG.sync.read(await readFile(path1));
  const img2 = PNG.sync.read(await readFile(path2));

  if (img1.width !== img2.width || img1.height !== img2.height) {
    throw new Error(
      `Dimensions mismatch: ${path1} (${img1.width}x${img1.height}) vs ${path2} (${img2.width}x${img2.height})`,
    );
  }

  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const diffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, {
    threshold,
  });

  const match = diffPixels <= maxAllowedDiff;
  if (!match) {
    await writeFile(diffPath, PNG.sync.write(diff));
  }

  return { match, diffPixels };
}

function findGodotMatch(refName: string, godotFiles: string[]): string | null {
  if (godotFiles.includes(refName)) return refName;

  // Custom mapping for Gallery mode
  if (refName === 'lobby.png') {
    const match = godotFiles.find((f) => f.includes('start') || f.includes('frame'));
    if (match) return match;
  }
  if (refName === 'deployment-with-hand.png') {
    const match = godotFiles.find(
      (f) => f.includes('deployment_0001_start') || f.includes('deployment'),
    );
    if (match) return match;
  }
  if (refName === 'attack-with-hand.png') {
    const match = godotFiles.find((f) => f.includes('combat') || f.includes('action'));
    if (match) return match;
  }
  if (refName === 'reinforce-phase.png') {
    const match = godotFiles.find((f) => f.includes('game-over') || f.includes('gameOver'));
    if (match) return match;
  }

  const stem = refName.split('.')[0];
  const match = godotFiles.find((f) => f.includes(stem));
  if (match) return match;

  return null;
}

async function main(): Promise<number> {
  const partial = values.partial ?? false;
  const outFile = values['out-file'] ?? 'artifacts/diffs/parity-report.json';
  const diffDir = join(process.cwd(), 'artifacts/diffs');
  const threshold = parseFloat(values.threshold ?? '0.1');
  const tolerance = parseInt(values.tolerance ?? '0', 10);

  // Auto-discover directories if not provided
  let refDir = values['reference-dir'];
  if (!refDir) {
    refDir = await getLatestRunDir('artifacts/playthrough-head2head');
    if (!refDir && existsSync('artifacts/gallery')) {
      refDir = 'artifacts/gallery';
    }
  }

  let godotDir = values['godot-dir'];
  if (!godotDir) {
    godotDir = await getLatestRunDir('artifacts/godot-playthrough');
  }

  if (!refDir) {
    console.error('❌ Error: Reference directory not found and artifacts/gallery is missing.');
    return 1;
  }

  if (!godotDir) {
    console.error('❌ Error: Godot playthrough directory not found.');
    return 1;
  }

  console.log(`Comparing Reference: ${refDir}`);
  console.log(`Comparing Godot:   ${godotDir}`);

  const manifestDiffs: ParityDiff[] = [];
  const checkpointDiffs: ParityDiff[] = [];
  const screenshotComparisons: ScreenshotComparison[] = [];

  let refManifest: any = null;
  let godotManifest: any = null;

  // 1. Parse Manifests if they exist
  try {
    const refManifestPath = join(refDir, 'manifest.json');
    if (existsSync(refManifestPath)) {
      refManifest = JSON.parse(await readFile(refManifestPath, 'utf8'));
    }
  } catch (err: any) {
    console.warn(`⚠️ Warning: Failed to parse reference manifest: ${err.message}`);
  }

  try {
    const godotManifestPath = join(godotDir, 'manifest.json');
    if (existsSync(godotManifestPath)) {
      godotManifest = JSON.parse(await readFile(godotManifestPath, 'utf8'));
    }
  } catch (err: any) {
    console.warn(`⚠️ Warning: Failed to parse Godot manifest: ${err.message}`);
  }

  // 2. Manifest Field Comparison
  if (refManifest && godotManifest) {
    const compareField = (field: string) => {
      const refVal = refManifest[field];
      const godotVal = godotManifest[field];
      if (refVal !== undefined && godotVal !== undefined && refVal !== godotVal) {
        manifestDiffs.push({
          type: 'manifest_field_mismatch',
          field,
          expected: refVal,
          actual: godotVal,
          message: `Field mismatch in "${field}": expected ${JSON.stringify(
            refVal,
          )}, actual ${JSON.stringify(godotVal)}`,
        });
      }
    };

    compareField('status');
    if (refManifest.status === 'success' && godotManifest.status === 'success') {
      compareField('winnerName');
      compareField('lifepointsText');
      compareField('turnCount');
    }
  }

  // 3. Required Godot Checkpoints Verification
  if (godotManifest) {
    const requiredCheckpoints = ['connected', 'hydrated', 'animation_idle'];
    const reachedCheckpoints = (godotManifest.checkpoints || []).map((c: any) => c.type);
    for (const req of requiredCheckpoints) {
      if (!reachedCheckpoints.includes(req)) {
        checkpointDiffs.push({
          type: 'missing_checkpoint',
          expected: req,
          actual: null,
          message: `Required Godot checkpoint "${req}" was not reached during the run`,
        });
      }
    }
  }

  // 4. Screenshot Visual Parity Checks
  const refScreenshotsDir = join(refDir, 'screenshots');
  const godotScreenshotsDir = join(godotDir, 'screenshots');

  let refPhotos: string[] = [];
  let refPhotosDir = refDir;
  if (existsSync(refScreenshotsDir)) {
    refPhotos = (await readdir(refScreenshotsDir)).filter((f) => f.endsWith('.png'));
    refPhotosDir = refScreenshotsDir;
  } else if (basename(refDir) === 'gallery') {
    refPhotos = (await readdir(refDir)).filter((f) => f.endsWith('.png'));
  }

  let godotPhotos: string[] = [];
  let godotPhotosDir = godotDir;
  if (existsSync(godotScreenshotsDir)) {
    godotPhotos = (await readdir(godotScreenshotsDir)).filter((f) => f.endsWith('.png'));
    godotPhotosDir = godotScreenshotsDir;
  }

  for (const name of refPhotos) {
    const godotMatch = findGodotMatch(name, godotPhotos);
    if (!godotMatch) {
      const msg = `Missing matching Godot screenshot for reference "${name}"`;
      if (!partial) {
        screenshotComparisons.push({
          name,
          refPath: join(refPhotosDir, name),
          godotPath: '',
          match: false,
          error: msg,
        });
      } else {
        console.log(`⚠️ Warning: ${msg} (skipped in partial mode)`);
      }
      continue;
    }

    const refPath = join(refPhotosDir, name);
    const godotPath = join(godotPhotosDir, godotMatch);
    const diffPath = join(diffDir, `diff-${name}`);

    try {
      const { match, diffPixels } = await compareImages(
        refPath,
        godotPath,
        diffPath,
        threshold,
        tolerance,
      );
      screenshotComparisons.push({
        name,
        refPath,
        godotPath,
        match,
        diffPixels,
      });
      if (match) {
        console.log(`✅ Visual match: ${name} <-> ${godotMatch}`);
      } else {
        console.log(
          `❌ Visual mismatch: ${name} <-> ${godotMatch} (${diffPixels}px different). Diff saved to ${diffPath}`,
        );
      }
    } catch (err: any) {
      screenshotComparisons.push({
        name,
        refPath,
        godotPath,
        match: false,
        error: err.message,
      });
      console.error(`❌ Visual error: Failed to compare ${name} vs ${godotMatch}: ${err.message}`);
    }
  }

  // 5. Final Report Compile
  const hasManifestErrors = manifestDiffs.length > 0;
  const hasCheckpointErrors = checkpointDiffs.length > 0;
  const hasVisualErrors = screenshotComparisons.some((s) => !s.match);

  const failed = !partial && (hasManifestErrors || hasCheckpointErrors || hasVisualErrors);
  const finalStatus = failed ? 'failure' : 'success';

  const report: ParityReport = {
    timestamp: new Date().toISOString(),
    referenceDir: refDir,
    godotDir,
    status: finalStatus,
    partial,
    manifestComparisons: manifestDiffs,
    checkpointComparisons: checkpointDiffs,
    screenshotComparisons,
  };

  await mkdir(diffDir, { recursive: true });
  await writeFile(outFile, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`\nParity comparison complete. Report saved to ${outFile}`);

  if (hasManifestErrors) {
    console.log(`\n❌ Manifest Failures (${manifestDiffs.length}):`);
    for (const d of manifestDiffs) console.log(`  - ${d.message}`);
  }

  if (hasCheckpointErrors) {
    console.log(`\n❌ Checkpoint Failures (${checkpointDiffs.length}):`);
    for (const d of checkpointDiffs) console.log(`  - ${d.message}`);
  }

  if (failed) {
    console.log('\n❌ Visual/Functional Parity Gate FAILED.');
    return 1;
  }

  console.log('\n✅ Visual/Functional Parity Gate PASSED.');
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('Fatal error during parity comparison:', err);
    process.exit(1);
  });
