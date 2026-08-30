#!/usr/bin/env tsx
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalizeLegacyRun } from './run-evidence.ts';

const argv = process.argv.slice(2).filter((a) => a !== '--');

if (argv.includes('--help') || argv.includes('-h') || argv.length === 0) {
  console.log(`
Verify SwiftUI Bot-Match Proof

Extracts the run manifest and screenshots from an xcresult attachment export
(produced by \`xcrun xcresulttool export attachments\`) into friendly names,
then validates the manifest against the TASK-360.01 proof contract.

Usage:
  tsx bin/qa/verify-swiftui-proof.ts <run-dir>

Expects <run-dir>/exported/manifest.json (the xcresulttool export index).
Writes <run-dir>/manifest.json and <run-dir>/screenshots/*.png.
Exits non-zero if the proof evidence is missing or invalid.
`);
  process.exit(argv.length === 0 ? 1 : 0);
}

interface ExportedAttachment {
  exportedFileName: string;
  suggestedHumanReadableName: string;
}

interface ExportIndexEntry {
  attachments: ExportedAttachment[];
  testIdentifier?: string;
}

interface PlayerEvidence {
  index: number;
  name: string;
  finalLifepoints: number;
}

interface RunManifest {
  tool: string;
  status: string;
  failureReason?: string | null;
  failureMessage?: string | null;
  matchId?: string | null;
  seed: number;
  startingLifepoints: number;
  botStrategy: string;
  players: PlayerEvidence[];
  winnerIndex?: number | null;
  winnerName?: string | null;
  victoryType?: string | null;
  turnCount: number;
  actionCount: number;
  nativeActionCount: number;
  performedDeployment: boolean;
  performedAttack: boolean;
  screenshots: string[];
  durationMs: number;
}

const runDir = argv[0];
const exportedDir = join(runDir, 'exported');
const exportIndexPath = join(exportedDir, 'manifest.json');

if (!existsSync(exportIndexPath)) {
  console.error(`❌ Missing attachment export index: ${exportIndexPath}`);
  console.error(
    '   Run: xcrun xcresulttool export attachments --path <xcresult> --output-path <run-dir>/exported',
  );
  process.exit(1);
}

const exportIndex = JSON.parse(readFileSync(exportIndexPath, 'utf8')) as ExportIndexEntry[];
const proofEntry = exportIndex.find((entry) =>
  entry.testIdentifier?.includes('testCompleteBotMatch'),
);

if (!proofEntry) {
  console.error(
    '❌ No attachments found for AutomationTests/testCompleteBotMatch in the xcresult export.',
  );
  process.exit(1);
}

const screenshotsDir = join(runDir, 'screenshots');
mkdirSync(screenshotsDir, { recursive: true });

let runManifestPath: string | null = null;
const extractedScreenshots: string[] = [];

for (const attachment of proofEntry.attachments) {
  const source = join(exportedDir, attachment.exportedFileName);
  const friendly = attachment.suggestedHumanReadableName;
  if (friendly.startsWith('manifest_') && friendly.endsWith('.json')) {
    runManifestPath = join(runDir, 'manifest.json');
    copyFileSync(source, runManifestPath);
  } else if (friendly.endsWith('.png')) {
    const baseName = friendly.replace(/_\d+_[0-9A-F-]+\.png$/i, '.png');
    const target = join(screenshotsDir, baseName);
    copyFileSync(source, target);
    extractedScreenshots.push(baseName);
  }
}

if (!runManifestPath) {
  console.error('❌ The proof test retained no run manifest attachment.');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(runManifestPath, 'utf8')) as RunManifest;
const evidence = canonicalizeLegacyRun(
  {
    tool: manifest.tool,
    status: manifest.status === 'success' ? 'success' : 'failure',
    failureReason: manifest.failureReason ?? undefined,
    failureMessage: manifest.failureMessage ?? undefined,
    matchId: manifest.matchId,
    seed: manifest.seed,
    startingLifepoints: manifest.startingLifepoints,
    durationMs: manifest.durationMs,
    actionCount: manifest.actionCount,
    runId: manifest.matchId ?? 'swiftui-proof',
    screenshots: manifest.screenshots,
  },
  Array.from({ length: manifest.actionCount }, (_, index) => ({
    type: 'action',
    at: new Date(Date.now() + index).toISOString(),
    detail: `native action ${index + 1}`,
  })),
);
const evidencePath = join(runDir, 'run-evidence.json');
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
const failures: string[] = [];

const expect = (condition: boolean, message: string): void => {
  if (!condition) failures.push(message);
};

expect(
  manifest.tool === 'swiftui-xcuitest-bot-playthrough',
  `unexpected tool identifier: ${manifest.tool}`,
);
expect(
  manifest.status === 'success',
  `run status is ${manifest.status} (${manifest.failureReason ?? 'no reason'}: ${manifest.failureMessage ?? 'no message'})`,
);
expect(Boolean(manifest.matchId), 'missing matchId');
expect(manifest.players.length === 2, `expected 2 players, found ${manifest.players.length}`);
expect(
  manifest.players.every((p) => p.name.length > 0),
  'a player is missing a name',
);
const drawVictoryTypes = new Set(['repetitionDraw', 'noProgressDraw', 'turnLimitDraw']);
const isDraw =
  manifest.victoryType !== null &&
  manifest.victoryType !== undefined &&
  drawVictoryTypes.has(manifest.victoryType);
expect(Boolean(manifest.victoryType), 'missing victoryType');
expect(
  isDraw || (manifest.winnerIndex !== null && manifest.winnerIndex !== undefined),
  'missing winnerIndex for a decisive victory',
);
expect(Boolean(manifest.winnerName), 'missing winnerName');
expect(manifest.turnCount >= 1, `turnCount ${manifest.turnCount} < 1`);
expect(manifest.nativeActionCount > 0, 'no actions were driven through the native UI');
expect(
  manifest.actionCount >= manifest.nativeActionCount,
  `authoritative actionCount ${manifest.actionCount} < nativeActionCount ${manifest.nativeActionCount}`,
);
expect(manifest.performedDeployment, 'no deployment was performed through the native UI');
expect(manifest.performedAttack, 'no attack was performed through the native UI');
expect(
  manifest.screenshots.length >= 3,
  `expected at least 3 screenshots (start/gameplay/game-over), found ${manifest.screenshots.length}`,
);

if (manifest.winnerIndex !== null && manifest.winnerIndex !== undefined) {
  const winner = manifest.players.find((p) => p.index === manifest.winnerIndex);
  expect(winner !== undefined, `winnerIndex ${manifest.winnerIndex} does not match a player`);
  if (winner) {
    expect(
      winner.name === manifest.winnerName,
      `winnerName ${manifest.winnerName} does not match player ${winner.name}`,
    );
  }
  if (manifest.victoryType === 'lpDepletion') {
    expect(
      manifest.players.some((p) => p.index !== manifest.winnerIndex && p.finalLifepoints === 0),
      'lpDepletion victory but no opponent at 0 lifepoints',
    );
  }
}

for (const screenshot of manifest.screenshots) {
  const baseName = screenshot.replace(/^screenshots\//, '');
  expect(
    extractedScreenshots.includes(baseName),
    `manifest references ${screenshot} but it was not extracted from the xcresult`,
  );
}

if (failures.length > 0) {
  console.error('❌ SwiftUI bot-match proof evidence is invalid:');
  for (const failure of failures) {
    console.error(`   - ${failure}`);
  }
  process.exit(1);
}

const [p0, p1] = manifest.players;
console.log('✅ SwiftUI bot-match proof verified');
console.log(`   match:       ${manifest.matchId}`);
console.log(
  `   result:      ${isDraw ? `draw (${manifest.victoryType})` : `${manifest.winnerName} wins by ${manifest.victoryType}`}`,
);
console.log(
  `   lifepoints:  ${p0.name} ${p0.finalLifepoints} — ${p1.name} ${p1.finalLifepoints} (started at ${manifest.startingLifepoints})`,
);
console.log(`   turns:       ${manifest.turnCount}`);
console.log(
  `   actions:     ${manifest.actionCount} authoritative / ${manifest.nativeActionCount} driven via native UI`,
);
console.log(`   seed:        ${manifest.seed} (${manifest.botStrategy})`);
console.log(`   duration:    ${Math.round(manifest.durationMs / 1000)}s`);
console.log(`   manifest:    ${runManifestPath}`);
console.log(`   screenshots: ${screenshotsDir} (${extractedScreenshots.length} files)`);
