#!/usr/bin/env tsx
import { writeFileSync } from 'node:fs';
import { generateScenario, GameScenarioSchema } from './scenario';

const argv = process.argv.slice(2).filter((a) => a !== '--');

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`
Generate Game Scenario

Usage:
  tsx bin/qa/generate-scenario.ts [options]

Options:
  --seed <n>         Seed for scenario generation (default: 1000)
  --help, -h         Show this help
`);
  process.exit(0);
}

import { parseArgs } from 'node:util';

const { values } = parseArgs({
  args: argv,
  options: {
    seed: { type: 'string', default: '1000' },
    help: { type: 'boolean', default: false },
  },
});

const seed = parseInt(values.seed as string, 10);
const scenario = GameScenarioSchema.parse(
  generateScenario(seed, 'classic', 20, 'bot-heuristic', 'bot-heuristic'),
);
writeFileSync(`artifacts/playthrough-api/scenario-${seed}.json`, JSON.stringify(scenario, null, 2));
console.log(`Generated scenario to artifacts/playthrough-api/scenario-${seed}.json`);
