#!/usr/bin/env tsx

import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

interface Scenario {
  id: string;
  title: string;
  status: 'covered' | 'partially-covered' | 'inventory';
  command: string | null;
}
interface Workflow {
  id: string;
  title: string;
  automode: 'covered';
  stopOnFailure: boolean;
  scenarioIds: string[];
}
interface Catalog {
  scenarios: Scenario[];
  workflows: Workflow[];
}

const { values } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== '--'),
  options: {
    workflow: { type: 'string' },
    mode: { type: 'string', default: 'plan' },
    catalog: { type: 'string', default: 'qa/scenarios/pvl-auth-public.json' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help) {
  console.log(`PVL workflow runner

Usage:
  pnpm exec tsx bin/qa/pvl-workflow.ts [options]

Options:
  --workflow <id>    Run or plan one workflow (default: all)
  --mode plan|run    Plan commands or execute covered commands (default: plan)
  --catalog <path>   Catalog path
`);
  process.exit(0);
}

const catalog = JSON.parse(await readFile(resolve(values.catalog as string), 'utf8')) as Catalog;
const scenarios = new Map(catalog.scenarios.map((scenario) => [scenario.id, scenario]));
const workflows = catalog.workflows.filter(
  (workflow) => !values.workflow || workflow.id === values.workflow,
);
if (workflows.length === 0) throw new Error(`No PVL workflow matched ${values.workflow ?? 'all'}`);
if (values.mode !== 'plan' && values.mode !== 'run') {
  throw new Error(`Unsupported mode: ${values.mode}. Use plan or run.`);
}

function commandFor(scenario: Scenario): string | null {
  if (!scenario.command) return null;
  if (
    !/^pnpm qa:playthrough:ui -- --scenario (auth-pvb|guest-pvb) --no-devtools$/.test(
      scenario.command,
    )
  ) {
    throw new Error(`${scenario.id}: command is outside the safe automode allowlist`);
  }
  return scenario.command;
}

function runCovered(scenario: Scenario): Promise<number> {
  const command = commandFor(scenario);
  if (!command) return Promise.resolve(0);
  const match = command.match(/--scenario (auth-pvb|guest-pvb)/);
  if (!match) throw new Error(`${scenario.id}: command scenario could not be parsed`);
  return new Promise((resolveRun) => {
    const child = spawn(
      'pnpm',
      ['qa:playthrough:ui', '--', '--scenario', match[1], '--no-devtools'],
      {
        stdio: 'inherit',
        env: process.env,
      },
    );
    child.on('exit', (code, signal) => resolveRun(code ?? (signal ? 1 : 0)));
  });
}

let failures = 0;
for (const workflow of workflows) {
  console.log(`\n${workflow.title} · ${workflow.id} · automode=${workflow.automode}`);
  for (const scenarioId of workflow.scenarioIds) {
    const scenario = scenarios.get(scenarioId);
    if (!scenario) throw new Error(`${workflow.id}: unknown scenario ${scenarioId}`);
    const command = commandFor(scenario);
    if (!command) {
      console.log(`  ⏭ ${scenario.id} [${scenario.status}] — inventory only`);
      continue;
    }
    if (values.mode === 'plan') {
      console.log(`  ▶ ${scenario.id} [${scenario.status}] — ${command}`);
      continue;
    }
    console.log(`  ▶ ${scenario.id} [${scenario.status}]`);
    const exitCode = await runCovered(scenario);
    if (exitCode !== 0) {
      failures += 1;
      console.error(`  ✖ ${scenario.id} exited ${exitCode}`);
      if (workflow.stopOnFailure) break;
    } else {
      console.log(`  ✔ ${scenario.id}`);
    }
  }
}

if (failures > 0) process.exitCode = 1;
