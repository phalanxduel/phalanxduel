#!/usr/bin/env tsx

/**
 * V2 (Godot) Baseline Capture
 *
 * Uses godot-playthrough automation to capture game UI at key phases.
 * Copies relevant screenshots to v2-baseline for comparison with v1.
 *
 * Usage: pnpm qa:v2-baseline
 * Output: artifacts/v2-baseline/
 */

import { execSync } from 'node:child_process';
import { mkdir, readdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

async function captureV2Baseline() {
  console.log('📸 V2 (Godot) Baseline Capture\n');

  const outDir = join(process.cwd(), 'artifacts/v2-baseline');
  const godotOutDir = join(process.cwd(), 'artifacts/godot-playthrough');

  await mkdir(outDir, { recursive: true });

  try {
    // Run godot playthrough (existing automation that works)
    console.log('Running Godot playthrough automation...');
    try {
      execSync('pnpm qa:godot:playthrough', {
        stdio: 'pipe',
        timeout: 180000,
      });
    } catch {
      // Godot may exit non-zero but still produce artifacts
    }

    if (!existsSync(godotOutDir)) {
      throw new Error(
        `No godot-playthrough output found at ${godotOutDir}. Check if Godot ran successfully.`,
      );
    }

    const runs = await readdir(godotOutDir);
    const runDirs = runs.filter((f) => f.startsWith('godot-playthrough-'));
    if (runDirs.length === 0) {
      throw new Error(`No godot-playthrough run directories found in ${godotOutDir}`);
    }

    // Get most recent run directory
    const latestRun = runDirs.sort().pop();
    if (!latestRun) {
      throw new Error('Unable to find latest run');
    }

    const runPath = join(godotOutDir, latestRun, 'screenshots');
    if (!existsSync(runPath)) {
      console.log(`⚠️  No screenshots in ${runPath}`);
      console.log('✅ Baseline capture complete (no screenshots available)\n');
      return;
    }

    const files = await readdir(runPath);
    const pngFiles = files.filter((f) => f.endsWith('.png')).sort();

    if (pngFiles.length === 0) {
      throw new Error('No PNG files found');
    }

    console.log(`\nCopying ${pngFiles.length} screenshots from latest run...\n`);

    // Map game screenshots to phase names for v2.1 comparison
    // The automation captures at key game moments (lobby, deployment, combat, etc)
    const phaseMapping: Record<string, string> = {
      t0000_unknown: '01-lobby_v2.png',
      t0000_deployment: '02-deployment_v2.png',
      t0003_combat: '03-combat_v2.png',
      't0006_game-over': '04-gameover_v2.png',
    };

    let copied = 0;

    for (const file of pngFiles) {
      // Find matching phase in file name
      for (const [pattern, destName] of Object.entries(phaseMapping)) {
        if (file.includes(pattern)) {
          const src = join(runPath, file);
          const dest = join(outDir, destName);
          await copyFile(src, dest);
          console.log(`  ✓ ${destName}`);
          copied++;
          break;
        }
      }
    }

    if (copied === 0) {
      // Fallback: just copy first 3 screenshots
      console.log('  (copying first 3 available screenshots)');
      const names = ['01-lobby_v2.png', '02-deployment_v2.png', '03-combat_v2.png'];
      for (let i = 0; i < Math.min(3, pngFiles.length); i++) {
        const src = join(runPath, pngFiles[i]);
        const dest = join(outDir, names[i]);
        await copyFile(src, dest);
        console.log(`  ✓ ${names[i]}`);
      }
    }

    console.log(`\n✅ V2 baseline capture complete`);
    console.log(`Output: ${outDir}\n`);
    console.log('Next: pnpm qa:comparison-report\n');
  } catch (err) {
    console.error(`❌ Failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

captureV2Baseline();
