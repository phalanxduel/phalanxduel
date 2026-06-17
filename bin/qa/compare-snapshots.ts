import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Visual Regression Comparator
 * Compares Godot (v2) screenshots against Browser (v1) baselines.
 */

async function compareImages(path1: string, path2: string, diffPath: string) {
  const img1 = PNG.sync.read(await readFile(path1));
  const img2 = PNG.sync.read(await readFile(path2));

  if (img1.width !== img2.width || img1.height !== img2.height) {
    throw new Error(
      `Dimensions mismatch: ${path1} (${img1.width}x${img1.height}) vs ${path2} (${img2.width}x${img2.height})`,
    );
  }

  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, {
    threshold: 0.1,
  });

  if (numDiffPixels > 0) {
    await writeFile(diffPath, PNG.sync.write(diff));
    console.log(`❌ Mismatch found: ${numDiffPixels} pixels different. Diff saved to ${diffPath}`);
    return false;
  }

  console.log(`✅ Matches baseline: ${path2}`);
  return true;
}

async function main() {
  const v1Base = 'artifacts/gallery'; // Browser baselines
  const v2Snapshots = 'artifacts/godot-playthrough/screenshots';
  const diffDir = 'artifacts/diffs';
  await mkdir(diffDir, { recursive: true });

  const snapshots = [
    'lobby.png',
    'deployment-with-hand.png',
    'attack-with-hand.png',
    'reinforce-phase.png',
  ];
  let failed = false;

  for (const name of snapshots) {
    console.log(`Comparing ${name}...`);
    const match = await compareImages(
      join(v1Base, name),
      join(v2Snapshots, name),
      join(diffDir, `diff-${name}`),
    );
    if (!match) failed = true;
  }

  if (failed) process.exit(1);
  console.log('Visual Regression Passed.');
}

main().catch(console.error);
