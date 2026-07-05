#!/usr/bin/env tsx

/**
 * V2 (Godot) UI Screenshot Capture
 *
 * Launches Godot with seeded scenario (seed=12345) through the normal UI flow
 * (Lobby → Deployment → Combat) and captures screenshots at key moments.
 *
 * Uses Main.gd entry point with --capture-screenshots flag for proper UI rendering.
 *
 * Usage: pnpm qa:v2-baseline
 * Output: artifacts/v2-baseline/
 */

import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, copyFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';

const SEED = 12345;

async function spawnGodot(
  args: string[],
  homeDir: string,
  timeout: number = 120000,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn('godot', args, {
      env: { ...process.env, HOME: homeDir },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk: string | Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: string | Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      child.kill();
      resolve({ code: 124, stdout, stderr });
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

async function captureV2UI() {
  const projectDir = resolve('godot/client');
  const outDir = join(process.cwd(), 'artifacts/v2-baseline');
  await mkdir(outDir, { recursive: true });

  console.log(`📸 V2 (Godot) UI Capture (seed=${SEED})`);
  console.log(`Output: ${outDir}\n`);

  // Verify Godot exists
  try {
    const result = await spawnGodot(['--version'], tmpdir());
    if (result.code !== 0) {
      console.error("❌ Godot not found. Install Godot 4.x and ensure it's in PATH.");
      process.exit(1);
    }
  } catch {
    console.error('❌ Failed to spawn Godot process.');
    process.exit(1);
  }

  // Load seeded-baseline scenario
  const scenarioPath = join(process.cwd(), 'artifacts/seeded-baseline/scenario.json');
  if (!existsSync(scenarioPath)) {
    console.error(`❌ Scenario not found: ${scenarioPath}`);
    console.error('   Run: pnpm qa:seeded-baseline');
    process.exit(1);
  }

  const scenarioText = await readFile(scenarioPath, 'utf-8');
  const scenario = JSON.parse(scenarioText);

  // Use temp dir for Godot home and screenshots
  const runDir = await mkdtemp(join(tmpdir(), 'godot-v2-ui-'));
  const screenshotDir = join(runDir, 'screenshots');
  await mkdir(screenshotDir, { recursive: true });

  // Write scenario to temp file for input replay
  const inputPath = join(runDir, 'scenario.json');
  await writeFile(inputPath, JSON.stringify(scenario, null, 2));

  console.log('Launching Godot with UI...\n');

  // Launch Godot with normal UI flow, using input-replay to feed the scenario
  const godotArgs = [
    '--path',
    projectDir,
    '--disable-vsync',
    '--low-processor-mode',
    '--log-file',
    join(runDir, 'godot.log'),
    '--',
    '--input-replay',
    inputPath,
    '--capture-screenshots',
    '--artifact-dir',
    runDir,
  ];

  const result = await spawnGodot(godotArgs, runDir, 180000);

  if (result.stdout.trim()) console.log(result.stdout.trim());
  if (result.stderr.trim() && !result.stderr.includes('OpenGL')) {
    console.error(result.stderr.trim());
  }

  // Even if Godot exits with error, check for screenshots
  const screenshotSrc = screenshotDir;
  if (!existsSync(screenshotSrc)) {
    console.error(`\n⚠️  Screenshots directory not created: ${screenshotSrc}`);
    if (result.code !== 0) {
      console.error(`   Godot exited with code ${result.code}`);
    }
  } else {
    try {
      const files = await readdir(screenshotSrc);
      const pngFiles = files.filter((f) => f.endsWith('.png')).sort();

      if (pngFiles.length > 0) {
        console.log(`\n📸 Found ${pngFiles.length} screenshots:\n`);

        for (const file of pngFiles) {
          const src = join(screenshotSrc, file);
          const dest = join(outDir, file);
          await copyFile(src, dest);
          console.log(`  ✓ ${file}`);
        }
      } else {
        console.log('\n⚠️  No PNG screenshots found in screenshot directory');
      }
    } catch (err) {
      console.error(
        `⚠️  Error reading screenshots: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.log(`\n✅ V2 UI capture complete`);
  console.log(`Output: ${outDir}\n`);
  console.log('Next: pnpm qa:comparison-report (then refresh browser)\n');
}

captureV2UI().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
