#!/usr/bin/env tsx

/**
 * Seeded Baseline Capture
 *
 * Generates a fixed scenario (seed=12345) and runs it through both v1 (TypeScript) and v2 (Godot)
 * clients, capturing screenshots at identical game states for true UI/UX comparison.
 *
 * Output:
 * - artifacts/seeded-baseline/v1/    — v1 (Playwright) screenshots
 * - artifacts/seeded-baseline/v2/    — v2 (Godot) screenshots
 * - artifacts/seeded-baseline/README.md — side-by-side comparison
 */

import { generateScenario } from './scenario.js';
import { execSync } from 'node:child_process';
import { mkdir, writeFile, readdir, cp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const SEED = 12345;
const SCENARIO_CONFIG = {
  seed: SEED,
  damageMode: 'classic' as const,
  startingLifepoints: 20,
  p1: 'bot-heuristic' as const,
  p2: 'bot-heuristic' as const,
};

async function captureSeededBaseline() {
  console.log(`🎮 Seeded Baseline Capture (seed=${SEED})\n`);

  const outDir = join(process.cwd(), 'artifacts/seeded-baseline');
  const v1Dir = join(outDir, 'v1');
  const v2Dir = join(outDir, 'v2');

  await mkdir(v1Dir, { recursive: true });
  await mkdir(v2Dir, { recursive: true });

  // Generate scenario
  console.log('📋 Generating fixed scenario...');
  const scenario = generateScenario(
    SCENARIO_CONFIG.seed,
    SCENARIO_CONFIG.damageMode,
    SCENARIO_CONFIG.startingLifepoints,
    SCENARIO_CONFIG.p1,
    SCENARIO_CONFIG.p2,
  );

  const scenarioPath = join(outDir, 'scenario.json');
  await writeFile(scenarioPath, JSON.stringify(scenario, null, 2), 'utf-8');
  console.log(`✓ Scenario: ${scenario.turnCount} turns, ${scenario.actions.length} actions\n`);

  // Run V1 (Playwright)
  console.log('▶️  V1 (TypeScript/Playwright) with seed...');
  try {
    execSync(`pnpm qa:playthrough:ui -- --seed ${SEED} --window-width 1600 --window-height 1440`, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 180000,
    });
  } catch {
    // Command may "fail" but still produce output. Check for artifacts.
  }

  // Copy v1 screenshots
  const v1Source = join(process.cwd(), 'artifacts/playwright-playthrough');
  if (existsSync(v1Source)) {
    const runs = await readdir(v1Source);
    if (runs.length > 0) {
      const latestRun = runs.sort().pop()!;
      const screenshotDir = join(v1Source, latestRun);
      if (existsSync(screenshotDir)) {
        console.log(`✓ V1 completed\n`);
        // Copy key screenshots
        const screenshots = await readdir(screenshotDir);
        for (const file of screenshots.filter((f) => f.endsWith('.png')).slice(0, 6)) {
          const src = join(screenshotDir, file);
          const dst = join(v1Dir, file);
          await cp(src, dst);
        }
      }
    }
  }

  // Run V2 (Godot with same scenario)
  console.log('▶️  V2 (Godot) with same scenario...');
  try {
    execSync(
      `pnpm qa:godot:automation -- --seed ${SEED} --damage-mode ${SCENARIO_CONFIG.damageMode} --starting-lps ${SCENARIO_CONFIG.startingLifepoints} --p1 ${SCENARIO_CONFIG.p1} --p2 ${SCENARIO_CONFIG.p2}`,
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 180000,
      },
    );
  } catch {
    // Similar: may produce output despite exit code
  }

  // Copy v2 screenshots
  const v2Source = join(process.cwd(), 'artifacts/godot-automation');
  if (existsSync(v2Source)) {
    const runs = await readdir(v2Source);
    if (runs.length > 0) {
      const latestRun = runs.sort().pop()!;
      const manifestPath = join(v2Source, latestRun, 'manifest.json');
      if (existsSync(manifestPath)) {
        const manifestText = await readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestText);
        console.log(`✓ V2 completed\n`);
        // Copy key screenshots
        for (const screenshot of (manifest.screenshots || []).slice(0, 6)) {
          const src = join(v2Source, latestRun, screenshot);
          const dst = join(v2Dir, screenshot);
          if (existsSync(src)) {
            await cp(src, dst);
          }
        }
      }
    }
  }

  // Generate comparison report
  const report = `# Seeded Baseline Comparison

**Seed:** ${SEED}
**Scenario:** ${SCENARIO_CONFIG.p1} vs ${SCENARIO_CONFIG.p2}
**Starting LP:** ${SCENARIO_CONFIG.startingLifepoints}
**Damage Mode:** ${SCENARIO_CONFIG.damageMode}
**Turns:** ${scenario.turnCount}
**Actions:** ${scenario.actions.length}

## Purpose

Both v1 (TypeScript) and v2 (Godot) play the **identical scenario** with the same seed.
This isolates UI/layout differences from gameplay variance.

## Screenshots

### V1 (TypeScript/React - Playwright)

Location: \`artifacts/seeded-baseline/v1/\`

Desktop 1600×1440 captures during match. Key moments:
- Lobby/setup
- Deployment phase
- Attack phase
- End of match

### V2 (Godot)

Location: \`artifacts/seeded-baseline/v2/\`

Captures from same match. Godot window size may vary; focus on layout logic, not pixel dimensions.

## Comparison Checklist

### Layout & Spacing
- [ ] Grid cell sizes consistent?
- [ ] Player/opponent labels visible?
- [ ] Hand cards (if shown) properly positioned?
- [ ] Command buttons accessible?

### Responsive Breakpoint (1200px)
- [ ] Mobile layout (<1200px) working in both?
- [ ] Desktop layout (≥1200px) working in both?
- [ ] Scaling proportional?

### Colors & Typography
- [ ] Text readable at all sizes?
- [ ] Contrast sufficient?
- [ ] Font rendering similar?

### Interactive Elements
- [ ] Buttons/touch targets ≥44px on mobile?
- [ ] Card click areas clear?
- [ ] Status indicators visible?

## Iteration Workflow

1. Note differences from checklist above
2. Cross-reference \`godot/client/\` layout code
3. Fix identified issues
4. Re-run: \`pnpm qa:seeded-baseline\`
5. Compare new screenshots

## Regenerating

Fresh capture with same seed:

\`\`\`shell
rm -rf artifacts/seeded-baseline artifacts/playwright-playthrough artifacts/godot-automation
pnpm qa:seeded-baseline
\`\`\`
`;

  await writeFile(join(outDir, 'README.md'), report, 'utf-8');
  console.log(`📄 Report: artifacts/seeded-baseline/README.md`);
  console.log(`📸 V1 screenshots: artifacts/seeded-baseline/v1/`);
  console.log(`📸 V2 screenshots: artifacts/seeded-baseline/v2/\n`);
  console.log(`✅ Seeded baseline complete!`);
}

captureSeededBaseline().catch((err) => {
  console.error('❌ Capture failed:', err);
  process.exit(1);
});
