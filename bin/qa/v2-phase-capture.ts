#!/usr/bin/env tsx

/**
 * V2 (Godot) Phase Capture
 *
 * Runs Godot v2 with seeded scenario (seed=12345) and extracts screenshots
 * to phase-comparison/v2 for visual comparison against v1-baseline.
 *
 * Uses the real AutomationHarness.gd from the Godot project.
 *
 * Usage: pnpm qa:v2-phase-capture
 * Output: artifacts/phase-comparison/v2/
 */

import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, copyFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';

const SEED = 12345;

interface AutomationInput {
  version: number;
  source: string;
  expectedCheckpoints: string[];
  scenario: Record<string, unknown>;
}

async function spawnGodot(
  args: string[],
  homeDir: string,
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
    }, 180000);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

async function captureV2Phases() {
  const projectDir = resolve('godot/client');
  const outDir = join(process.cwd(), 'artifacts/phase-comparison/v2');
  await mkdir(outDir, { recursive: true });

  console.log(`📸 V2 (Godot) Phase Capture (seed=${SEED})`);
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

  // Load existing seeded-baseline scenario
  const scenarioPath = join(process.cwd(), 'artifacts/seeded-baseline/scenario.json');
  if (!existsSync(scenarioPath)) {
    console.error(`❌ Scenario not found: ${scenarioPath}`);
    console.error('   Run: pnpm qa:seeded-baseline');
    process.exit(1);
  }

  const scenarioText = await readFile(scenarioPath, 'utf-8');
  const gameScenario = JSON.parse(scenarioText);

  const scenario: AutomationInput = {
    version: 1,
    source: 'seeded-baseline-v2-capture',
    expectedCheckpoints: ['connected', 'hydrated', 'game_over'],
    scenario: gameScenario,
  };

  // Run Godot automation
  const runDir = await mkdtemp(join(tmpdir(), 'godot-v2-capture-'));
  const inputPath = join(runDir, 'input.json');
  const outputPath = join(runDir, 'result.json');
  const logPath = join(runDir, 'godot.log');

  await writeFile(inputPath, JSON.stringify(scenario, null, 2));

  console.log('Starting Godot automation...\n');

  const godotArgs = [
    '--headless',
    '--path',
    projectDir,
    '--script',
    'res://scripts/AutomationHarness.gd',
    '--log-file',
    logPath,
    '--',
    '--input',
    inputPath,
    '--output',
    outputPath,
  ];

  const result = await spawnGodot(godotArgs, runDir);

  if (result.stdout.trim()) console.log(result.stdout.trim());
  if (result.stderr.trim()) console.error(result.stderr.trim());

  if (result.code !== 0) {
    console.error(`\n❌ Godot exited with code ${result.code}`);
    process.exit(1);
  }

  // Extract screenshots from run
  const screenshotSrc = join(runDir, 'screenshots');
  if (!existsSync(screenshotSrc)) {
    console.error(`\n❌ No screenshots directory created at ${screenshotSrc}`);
    process.exit(1);
  }

  // Copy first few screenshots to phase-comparison/v2
  try {
    const files = await import('node:fs/promises').then((fs) => fs.readdir(screenshotSrc));
    const pngFiles = files.filter((f) => f.endsWith('.png')).sort();

    if (pngFiles.length === 0) {
      console.error('\n❌ No PNG screenshots found');
      process.exit(1);
    }

    console.log(`\n📸 Copying ${pngFiles.length} screenshots...\n`);

    for (const file of pngFiles.slice(0, 4)) {
      const src = join(screenshotSrc, file);
      const dest = join(outDir, file);
      await copyFile(src, dest);
      console.log(`  ✓ ${file}`);
    }
  } catch (err) {
    console.error(
      `❌ Failed to copy screenshots: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  }

  console.log(`\n✅ V2 phase capture complete`);
  console.log(`Output: ${outDir}\n`);
  console.log('Next: pnpm qa:comparison-report (then refresh browser)\n');
}

captureV2Phases().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
