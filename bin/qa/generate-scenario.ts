#!/usr/bin/env tsx
import { writeFileSync } from 'node:fs';
import { generateScenario } from './scenario';

const seed = parseInt(process.argv[2] ?? '1000', 10);
const scenario = generateScenario(seed, 'classic', 20, 'bot-heuristic', 'bot-heuristic');
writeFileSync(`artifacts/playthrough-api/scenario-${seed}.json`, JSON.stringify(scenario, null, 2));
console.log(`Generated scenario to artifacts/playthrough-api/scenario-${seed}.json`);
