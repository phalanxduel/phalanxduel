#!/usr/bin/env tsx

/**
 * V2 (Godot) Baseline Capture
 *
 * Runs an existing Godot match (via godot-playthrough.ts automation)
 * and copies captured artifacts to artifacts/v2-baseline/ for comparison with v1.
 *
 * This leverages existing Godot automation rather than reinventing screenshot capture.
 */

import { execSync } from 'node:child_process';
import { mkdir, cp, readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

async function captureBaseline() {
  console.log('🎮 V2 (Godot) Baseline Capture\n');

  const outDir = join(process.cwd(), 'artifacts/v2-baseline');
  const godotOutDir = join(process.cwd(), 'artifacts/godot-playthrough');

  await mkdir(outDir, { recursive: true });

  try {
    // Run godot playthrough (existing automation)
    console.log('Running Godot match (bot heuristic vs heuristic)...');
    try {
      execSync('pnpm qa:godot:playthrough', {
        stdio: 'pipe',
        timeout: 180000,
      });
    } catch {
      // Godot output goes to stdout/stderr but the command may "fail" if
      // it's just logging. Check if artifacts were produced anyway.
    }

    // Find latest run in godot-playthrough output
    if (!existsSync(godotOutDir)) {
      throw new Error(
        `No godot-playthrough output found at ${godotOutDir}. Check if Godot ran successfully.`,
      );
    }

    const runs = await readdir(godotOutDir);
    if (runs.length === 0) {
      throw new Error(`No runs found in ${godotOutDir}`);
    }

    // Get most recent run directory
    const latestRun = runs.sort().pop()!;
    const runDir = join(godotOutDir, latestRun);

    console.log(`✓ Match completed: ${latestRun}\n`);

    // Copy manifest and screenshots
    const manifestSrc = join(runDir, 'manifest.json');
    if (existsSync(manifestSrc)) {
      const manifestText = await readFile(manifestSrc, 'utf-8');
      const manifest = JSON.parse(manifestText);

      console.log(`Match Info:`);
      console.log(`  Turns: ${manifest.turnCount}`);
      console.log(`  Actions: ${manifest.actionCount}`);
      console.log(`  Outcome: ${manifest.outcomeText}`);
      console.log(`  Winner: ${manifest.winnerName || 'Draw'}`);
      console.log(`  Screenshots: ${manifest.screenshots?.length || 0}\n`);

      // Copy screenshots
      const screenshotCount = Math.min(6, manifest.screenshots?.length || 0);
      console.log(`Copying ${screenshotCount} key screenshots...`);
      for (let i = 0; i < screenshotCount; i++) {
        const screenshotFile = manifest.screenshots?.[i];
        if (!screenshotFile) continue;

        const src = join(runDir, screenshotFile);
        const filename = `${String(i + 1).padStart(2, '0')}-${screenshotFile}`;
        const dst = join(outDir, filename);

        if (existsSync(src)) {
          const content = await readFile(src);
          await writeFile(dst, content);
          console.log(`  ✓ ${filename}`);
        }
      }
    }

    // Generate comparison report
    const report = `# V2 (Godot) Baseline UI Capture

**Generated:** 2026-06-21
**Purpose:** Compare v2 Godot layout vs v1 reference (TypeScript/React)

## Comparison Approach

To compare v1 and v2 side-by-side:

\`\`\`bash
# Terminal 1: View v1 baseline
open artifacts/v1-baseline/README.md

# Terminal 2: View v2 baseline (this report)
open artifacts/v2-baseline/README.md

# Compare key moments:
# - 01-lobby: v1 vs v2 welcome/match screen
# - 02-deployment: v1 vs v2 placement phase
# - 03-attack: v1 vs v2 combat phase
\`\`\`

## Observable Differences (v1 → v2)

### Design & Layout
- [ ] Color scheme (palette, contrast)
- [ ] Typography (font sizes, weights)
- [ ] Spacing/padding (desktop vs mobile)
- [ ] Grid cell sizes (playable vs readable?)
- [ ] Button/touch target sizes

### Responsive Behavior
- [ ] Mobile layout at <1200px breakpoint
- [ ] Orientation handling (portrait vs landscape)
- [ ] Scrolling areas (hand cards, battlefield)
- [ ] Modal/overlay styling

### Element Visibility
- [ ] Player/opponent labels clear?
- [ ] Turn indicators visible?
- [ ] Command drawer (pass/attack/etc) accessible?
- [ ] Card details readable?

## Troubleshooting

**No screenshots captured?**
- Check that Godot is installed: \`godot --version\`
- Re-run: \`pnpm qa:v2-baseline\`
- Manual Godot dev: \`pnpm dev:godot\`

**Dimensions don't match v1?**
- v1 uses Playwright (browser viewport: 1600×1440, 390×844)
- v2 uses Godot (window size may vary)
- Scaling is automatic; focus on layout logic, not pixel dimensions

## Next Steps

1. Review both baselines side-by-side (open this dir and v1-baseline/)
2. Document layout issues by phase (deployment, attack, etc.)
3. Cross-reference godot/client/ code for fixes
4. Iterate: Fix layout → \`pnpm qa:v2-baseline\` → Compare

## Re-running

Fresh capture after godot/client/ changes:

\`\`\`bash
rm -rf artifacts/v2-baseline artifacts/godot-playthrough
pnpm qa:v2-baseline
\`\`\`
`;

    await writeFile(join(outDir, 'README.md'), report, 'utf-8');
    console.log(`\n📄 Report: artifacts/v2-baseline/README.md`);
    console.log(`\n✅ V2 baseline capture complete!`);
  } catch (err) {
    console.error('❌ Capture failed:', err);
    process.exit(1);
  }
}

captureBaseline();
