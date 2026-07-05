#!/usr/bin/env tsx

/**
 * Generate Visual Comparison Report
 *
 * Reads seeded scenario + v1-baseline PNGs to create an interactive HTML report
 * showing: Scenario (what happened) | V1 (reference rendering) | V2 (TODO)
 *
 * Output: artifacts/comparison-report.html
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

interface GameScenario {
  seed: number;
  turnCount: number;
  actions: Array<{
    type: string;
    column?: number;
    targetColumn?: number;
    playerIndex?: number;
  }>;
}

async function generateReport() {
  const scenarioPath = join(process.cwd(), 'artifacts/seeded-baseline/scenario.json');
  const v1BasePath = join(process.cwd(), 'artifacts/v1-baseline');
  const v2BasePath = join(process.cwd(), 'artifacts/v2-baseline');

  if (!existsSync(scenarioPath)) {
    console.error(`❌ Scenario not found: ${scenarioPath}`);
    console.error('   Run: pnpm qa:seeded-baseline');
    process.exit(1);
  }

  const scenarioText = await readFile(scenarioPath, 'utf-8');
  const scenario: GameScenario = JSON.parse(scenarioText);

  console.log(`📊 Generating comparison report (seed=${scenario.seed})\n`);

  // Check for v1-baseline PNGs
  const v1Files = [
    '01-lobby_desktop-hd.png',
    '02-deployment_desktop-hd.png',
    '03-attack_desktop-hd.png',
    '03-attack_desktop-hd.png', // used as endgame placeholder
  ];

  const v1CheckResults = v1Files.map((f) => {
    const exists = existsSync(join(v1BasePath, f));
    return { file: f, exists };
  });

  console.log('V1-Baseline Status:');
  v1CheckResults.forEach((r) => {
    console.log(`  ${r.exists ? '✓' : '✗'} ${r.file}`);
  });

  // Check for v2 screenshots
  const v2Files = ['01-lobby_v2.png', '02-attack_v2.png', '03-combat_v2.png'];
  const v2CheckResults = v2Files.map((f) => {
    const exists = existsSync(join(v2BasePath, f));
    return { file: f, exists };
  });

  console.log('\nV2-Baseline Status:');
  v2CheckResults.forEach((r) => {
    console.log(`  ${r.exists ? '✓' : '✗'} ${r.file}`);
  });

  // Generate HTML report
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>V1 vs V2 Comparison (seed=${scenario.seed})</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #1a1a1a;
      color: #e0e0e0;
      padding: 20px;
    }
    .header {
      max-width: 1400px;
      margin: 0 auto 30px;
      background: #2a2a2a;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #0066cc;
    }
    h1 { font-size: 24px; margin-bottom: 10px; }
    .meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      font-size: 14px;
    }
    .meta-item { display: flex; gap: 8px; }
    .meta-label { color: #888; min-width: 80px; }
    .meta-value { color: #fff; font-weight: 500; }

    .phases {
      max-width: 1400px;
      margin: 0 auto;
    }
    .phase-block {
      background: #2a2a2a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      display: grid;
      grid-template-columns: 300px 1fr 1fr;
      gap: 20px;
      align-items: start;
    }
    @media (max-width: 1200px) {
      .phase-block {
        grid-template-columns: 1fr;
      }
    }

    .phase-info {
      background: #1a1a1a;
      padding: 15px;
      border-radius: 4px;
      border-left: 3px solid #0066cc;
    }
    .phase-title {
      font-weight: 700;
      font-size: 16px;
      color: #0099ff;
      margin-bottom: 10px;
    }
    .phase-desc {
      font-size: 13px;
      line-height: 1.5;
      color: #aaa;
    }
    .actions {
      font-size: 12px;
      color: #666;
      margin-top: 10px;
    }

    .screenshot-col {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .screenshot-label {
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0099ff;
    }
    .screenshot-img {
      width: 100%;
      border: 1px solid #333;
      border-radius: 4px;
      background: #1a1a1a;
      max-height: 400px;
      object-fit: contain;
    }
    .screenshot-missing {
      width: 100%;
      height: 300px;
      background: #1a1a1a;
      border: 1px dashed #333;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      font-size: 12px;
    }

    .footer {
      max-width: 1400px;
      margin: 40px auto 0;
      padding-top: 20px;
      border-top: 1px solid #333;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎮 V1 vs V2 Comparison Report</h1>
    <div class="meta">
      <div class="meta-item">
        <span class="meta-label">Seed:</span>
        <span class="meta-value">${scenario.seed}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Turns:</span>
        <span class="meta-value">${scenario.turnCount}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Actions:</span>
        <span class="meta-value">${scenario.actions.length}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Reference:</span>
        <span class="meta-value">V1 (TypeScript)</span>
      </div>
    </div>
  </div>

  <div class="phases">
    <!-- Lobby Phase -->
    <div class="phase-block">
      <div class="phase-info">
        <div class="phase-title">📍 Lobby</div>
        <div class="phase-desc">
          Starting state. Player enters name, selects quick match.
        </div>
      </div>
      <div class="screenshot-col">
        <div class="screenshot-label">V1 (Desktop)</div>
        <img src="../v1-baseline/01-lobby_desktop-hd.png" alt="V1 Lobby" class="screenshot-img" />
      </div>
      <div class="screenshot-col">
        <div class="screenshot-label">V2 (Godot)</div>
        ${existsSync(join(v2BasePath, '01-lobby_v2.png')) ? '<img src="../v2-baseline/01-lobby_v2.png" alt="V2 Lobby" class="screenshot-img" />' : '<div class="screenshot-missing">V2 screenshots not yet captured</div>'}
      </div>
    </div>

    <!-- Deployment Phase -->
    <div class="phase-block">
      <div class="phase-info">
        <div class="phase-title">⚔️ Deployment</div>
        <div class="phase-desc">
          Player places cards on battlefield grid (4 columns, 2 rows).
        </div>
        <div class="actions">
          <strong>Actions:</strong> Deploy cards to each column
        </div>
      </div>
      <div class="screenshot-col">
        <div class="screenshot-label">V1 (Desktop)</div>
        <img src="../v1-baseline/02-deployment_desktop-hd.png" alt="V1 Deployment" class="screenshot-img" />
      </div>
      <div class="screenshot-col">
        <div class="screenshot-label">V2 (Godot)</div>
        <div class="screenshot-missing">Quick-start skips deployment phase</div>
      </div>
    </div>

    <!-- Attack Phase -->
    <div class="phase-block">
      <div class="phase-info">
        <div class="phase-title">🎯 Attack</div>
        <div class="phase-desc">
          Combat resolution. Cards attack opponent's grid.
        </div>
        <div class="actions">
          <strong>Turn Phases:</strong> Attack → Resolution → Reinforce → Draw
        </div>
      </div>
      <div class="screenshot-col">
        <div class="screenshot-label">V1 (Desktop)</div>
        <img src="../v1-baseline/03-attack_desktop-hd.png" alt="V1 Attack" class="screenshot-img" />
      </div>
      <div class="screenshot-col">
        <div class="screenshot-label">V2 (Godot)</div>
        ${existsSync(join(v2BasePath, '02-attack_v2.png')) ? '<img src="../v2-baseline/02-attack_v2.png" alt="V2 Attack" class="screenshot-img" />' : '<div class="screenshot-missing">V2 screenshots not yet captured</div>'}
      </div>
    </div>

    <!-- Combat Phase -->
    <div class="phase-block">
      <div class="phase-info">
        <div class="phase-title">⚡ Combat</div>
        <div class="phase-desc">
          Later combat turn. Compare rendering of active gameplay.
        </div>
      </div>
      <div class="screenshot-col">
        <div class="screenshot-label">V1 (Desktop)</div>
        <img src="../v1-baseline/03-attack_desktop-hd.png" alt="V1 Combat" class="screenshot-img" />
      </div>
      <div class="screenshot-col">
        <div class="screenshot-label">V2 (Godot)</div>
        ${existsSync(join(v2BasePath, '03-combat_v2.png')) ? '<img src="../v2-baseline/03-combat_v2.png" alt="V2 Combat" class="screenshot-img" />' : '<div class="screenshot-missing">V2 screenshots not yet captured</div>'}
      </div>
    </div>

    <!-- Game Over Phase -->
    <div class="phase-block">
      <div class="phase-info">
        <div class="phase-title">🏁 Game Over</div>
        <div class="phase-desc">
          Match concludes. Winner announced.
        </div>
      </div>
      <div class="screenshot-col">
        <div class="screenshot-label">V1 (Desktop)</div>
        <img src="../v1-baseline/gameover_desktop-hd.png" alt="V1 Game Over" class="screenshot-img" />
      </div>
      <div class="screenshot-col">
        <div class="screenshot-label">V2 (Godot)</div>
        <div class="screenshot-missing">Game over screenshot pending</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>
      <strong>How to use:</strong> Compare V1 (left) and V2 (right) renderings of the same game state.
      When V2 captures are available, refresh to see side-by-side diffs.
    </p>
    <p style="margin-top: 10px;">
      Scenario seed: ${scenario.seed} | Generated: ${new Date().toISOString()}
    </p>
  </div>
</body>
</html>`;

  const reportPath = join(process.cwd(), 'artifacts/comparison-report.html');
  await writeFile(reportPath, html, 'utf-8');

  console.log(`\n✅ Report generated: ${reportPath}`);
  console.log(`\nNext steps to add V2 screenshots:`);
  console.log(`  1. pnpm qa:v2-baseline`);
  console.log(`  2. Refresh comparison-report.html in browser`);
}

generateReport().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
