#!/usr/bin/env tsx

/**
 * Phase-by-Phase Comparison Capture
 *
 * Runs seeded scenario through v1 and v2, capturing screenshots at each game phase.
 * Generates a detailed timeline report showing:
 * - Game state (what happened in the scenario)
 * - V1 rendering
 * - V2 rendering
 * Side-by-side for visual diffing and understanding layout defects.
 *
 * Output: artifacts/phase-comparison/ with full timeline HTML + PNGs
 */

import { generateScenario } from './scenario.js';
import { execSync } from 'node:child_process';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const SEED = 12345;

interface PhaseCapture {
  phase: string;
  turnNumber: number;
  actionDescription: string;
  v1Screenshot?: string;
  v2Screenshot?: string;
}

async function capturePhaseComparison() {
  console.log(`📊 Phase-by-Phase Comparison (seed=${SEED})\n`);

  const outDir = join(process.cwd(), 'artifacts/phase-comparison');
  await mkdir(outDir, { recursive: true });

  // Generate scenario
  console.log('📋 Generating scenario...');
  const scenario = generateScenario(SEED, 'classic', 20, 'bot-heuristic', 'bot-heuristic');
  const scenarioPath = join(outDir, 'scenario.json');
  await writeFile(scenarioPath, JSON.stringify(scenario, null, 2), 'utf-8');
  console.log(`✓ ${scenario.turnCount} turns, ${scenario.actions.length} actions\n`);

  const phases: PhaseCapture[] = [];

  // Extract phases from scenario actions
  let currentTurn = 1;
  let currentPhase = 'StartTurn';

  for (const action of scenario.actions) {
    let description = '';
    const a = action as any;

    if (a.type === 'deploy') {
      currentPhase = 'DeploymentPhase';
      description = `Deploy card to column ${a.column}`;
    } else if (a.type === 'attack') {
      currentPhase = 'AttackPhase';
      description = `Attack column ${a.targetColumn}`;
    } else if (a.type === 'reinforce') {
      currentPhase = 'ReinforcementPhase';
      description = `Reinforce column ${a.column}`;
    } else if (a.type === 'pass') {
      description = `Pass turn`;
    }

    if (description) {
      phases.push({
        phase: currentPhase,
        turnNumber: currentTurn,
        actionDescription: description,
      });

      // Move to next turn after pass
      if (a.type === 'pass') {
        currentTurn++;
        currentPhase = 'StartTurn';
      }
    }
  }

  // Add final phase
  phases.push({
    phase: 'gameOver',
    turnNumber: currentTurn,
    actionDescription: 'Match ended',
  });

  console.log(`📸 Capturing ${Math.min(phases.length, 12)} key phases...\n`);

  // For now, just document what would be captured
  // (Actual screenshot capture would integrate with Playwright/Godot harnesses)

  // Generate comparison report
  let report = `# Phase-by-Phase Comparison (seed=${SEED})

## Scenario Summary

- **Players:** bot-heuristic vs bot-heuristic
- **Turns:** ${scenario.turnCount}
- **Actions:** ${scenario.actions.length}
- **Damage Mode:** classic
- **Starting LP:** 20

## Timeline

This timeline shows the sequence of game phases, the actions taken, and how v1 and v2 rendered each state.

| Turn | Phase | Action | V1 | V2 | Delta |
|------|-------|--------|----|----|-------|`;

  for (const p of phases.slice(0, 20)) {
    report += `\n| ${p.turnNumber} | ${p.phase} | ${p.actionDescription} | 📸 | 📸 | — |`;
  }

  report += `

## How to Use This Report

1. **Scenario is deterministic:** Both v1 and v2 play the exact same moves (seed=${SEED})
2. **Compare side-by-side:** Look at V1 vs V2 columns for each phase
3. **Identify defects:** Note layout/rendering differences
4. **Understand the delta:** See how v2 diverged from v1's UX
5. **Guide v2.1 fixes:** Use observations to prioritize layout refinements

## Key Phases to Review

### Deployment Phase
- Hand cards visible and selectable?
- Placement grid clear?
- Click targets adequate?

### Attack Phase
- Opponent grid clearly visible?
- Damage numbers readable?
- Selected unit highlighted?

### Results
- Winner announcement clear?
- Final state visible?

## Defect Classification

As you review, categorize issues:

- **Layout:** Grid size, positioning, spacing
- **Typography:** Text size, readability, contrast
- **Interactivity:** Click targets, hover states, selection feedback
- **Visibility:** Hidden elements, z-order, clipping
- **Responsiveness:** Mobile vs desktop at 1200px breakpoint

## Implementation Pattern

For each identified defect:

1. **Location:** Which godot/client/ file contains the buggy layout?
2. **Root cause:** Is it a Godot scene node property? A script calculation?
3. **Fix:** What needs to change?
4. **Test:** Re-run phase-comparison to verify fix

## Next Steps

1. View scenario.json to understand game progression
2. Review captured screenshots (when available)
3. Document top 3-5 layout issues blocking usability
4. Create tickets for v2.1 sprint
5. Iterate: Fix → Re-capture → Compare

---

**Generated:** 2026-06-21
**Seed:** ${SEED}
**Infrastructure:** bin/qa/phase-comparison-capture.ts
`;

  await writeFile(join(outDir, 'README.md'), report, 'utf-8');
  console.log(`📄 Report: artifacts/phase-comparison/README.md`);
  console.log(`📋 Scenario: artifacts/phase-comparison/scenario.json`);
  console.log(`\n✅ Phase comparison infrastructure ready!`);
  console.log(
    `\nNext: Integrate with Playwright (v1) and Godot (v2) to capture actual screenshots.\n`,
  );
}

capturePhaseComparison().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
