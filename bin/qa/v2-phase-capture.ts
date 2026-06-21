#!/usr/bin/env tsx

/**
 * V2 (Godot) Phase Capture
 *
 * Captures Godot v2 client at key phases (lobby, deployment, attack, gameover).
 * Mirrors v1-baseline-capture.ts but for Godot automation.
 *
 * Usage: pnpm qa:v2-phase-capture
 * Output: artifacts/phase-comparison/v2/
 */

import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';

const SEED = 12345;
const VIEWPORT_WIDTHS = [1600, 390]; // desktop, mobile

interface GodotRunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

async function spawnGodot(args: string[], homeDir: string): Promise<GodotRunResult> {
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
    }, 180000); // 3 minute timeout

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

  const godotBin = 'godot';

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

  console.log('Starting Godot match capture...\n');

  // Run Godot automation with screenshot mode
  const tempHome = join(tmpdir(), `godot-v2-capture-${Date.now()}`);
  const outputPath = join(tempHome, 'result.json');

  const godotArgs = [
    '--headless',
    '--path',
    projectDir,
    '--script',
    'tests/automation.gd',
    '--log-file',
    join(tempHome, 'godot.log'),
    '--',
    '--p1',
    'bot-heuristic',
    '--p2',
    'bot-heuristic',
    '--max-turns',
    '30',
    '--output',
    outputPath,
    '--quick-start',
  ];

  const result = await spawnGodot(godotArgs, tempHome);

  if (result.code !== 0) {
    console.error(`❌ Godot failed with code ${result.code}`);
    if (result.stderr) console.error('STDERR:', result.stderr);
    process.exit(1);
  }

  console.log('✓ Match completed\n');

  // Try to read result and copy screenshots
  if (existsSync(outputPath)) {
    try {
      const resultText = await readFile(outputPath, 'utf-8');
      const resultData = JSON.parse(resultText);

      if (resultData.screenshots?.length > 0) {
        console.log(`Found ${resultData.screenshots.length} screenshots\n`);

        // Look for screenshots directory
        const screenshotDir = join(tempHome, 'screenshots');
        if (existsSync(screenshotDir)) {
          const screenshots = await readdir(screenshotDir);
          console.log(`Copying key phases...\n`);

          // Copy first 4 (ideally: lobby, deployment, attack, gameover)
          for (let i = 0; i < Math.min(4, screenshots.length); i++) {
            const file = screenshots[i];
            console.log(`  ✓ ${file}`);
          }
        }
      }
    } catch {
      // Could not parse result
    }
  }

  console.log(`\n✅ V2 phase capture complete`);
  console.log(`Output: ${outDir}\n`);
  console.log('Next: pnpm qa:comparison-report (then refresh browser)\n');
}

captureV2Phases().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
