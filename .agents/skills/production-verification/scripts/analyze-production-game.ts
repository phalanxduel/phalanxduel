import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';

interface LogEntry {
  turnNumber: number;
  action?: { type: string };
  cause?: string;
}

/**
 * Reusable utility to extract tactical insights from the latest production playthrough.
 */
function analyzeLatestGame() {
  const artifactsDir = path.resolve('artifacts/playthrough-api');
  if (!fs.existsSync(artifactsDir)) {
    console.error(chalk.red('Error: No artifacts directory found at artifacts/playthrough-api'));
    return;
  }

  const dirs = fs
    .readdirSync(artifactsDir)
    .filter((d) => d.startsWith('api-'))
    .map((d) => ({
      name: d,
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      time: fs.statSync(path.join(artifactsDir, d)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  if (dirs.length === 0) {
    console.error(chalk.red('Error: No playthrough artifacts found.'));
    return;
  }

  const latestDir = path.join(artifactsDir, dirs[0]!.name);
  const gameFile = path.join(latestDir, 'game-1.json');

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (!fs.existsSync(gameFile)) {
    console.error(chalk.red(`Error: Final game state not found at ${gameFile}`));
    return;
  }

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const data = JSON.parse(fs.readFileSync(gameFile, 'utf8'));
  const log: LogEntry[] = data.transactionLog || [];

  console.log(chalk.cyan(`\n📊 Tactical Event Insights: ${dirs[0]!.name}`));
  console.log(chalk.gray(`--------------------------------------------------`));

  let found = 0;
  log.forEach((entry: LogEntry) => {
    if (entry.cause) {
      found++;
      const turn = entry.turnNumber;
      const action = entry.action?.type || 'unknown';
      const cause = entry.cause;

      let causeColor = chalk.yellow;
      if (cause === 'HEART SHIELD') causeColor = chalk.magenta;
      if (cause === 'COLUMN_DESTRUCTION') causeColor = chalk.red;

      console.log(
        `[Turn ${turn.toString().padStart(2)}] ${chalk.blue(action.padEnd(10))} → ${causeColor(cause)}`,
      );
    }
  });

  if (found === 0) {
    console.log(chalk.gray('No specific tactical causes found in this game.'));
  }
  console.log(chalk.gray(`--------------------------------------------------`));
  console.log(chalk.green(`Analysis complete. Found ${found} tactical events.\n`));
}

analyzeLatestGame();
