#!/usr/bin/env tsx

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';

const ScenarioSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]+$/),
  title: z.string().min(1),
  surface: z.string().min(1),
  status: z.enum(['covered', 'partially-covered', 'inventory']),
  entrypoint: z.string().min(1),
  runner: z.literal('browser-ui'),
  command: z.string().min(1).nullable(),
  steps: z.array(z.string().min(1)).min(2),
  layers: z.array(z.string().min(1)).min(1),
  identities: z.array(z.string().min(1)).min(1),
  evidence: z.object({
    expected: z.array(z.string().min(1)).min(1),
    unknown_until_run: z.array(z.string().min(1)),
  }),
});

const CatalogSchema = z.object({
  version: z.literal(1),
  initiative: z.literal('PVL'),
  project: z.object({
    id: z.literal('phalanxduel'),
    name: z.literal('Phalanx Duel'),
    persona: z.literal('standard-user'),
    environment: z.literal('local-development'),
  }),
  workflows: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        title: z.string().min(1),
        automode: z.literal('covered'),
        stopOnFailure: z.boolean(),
        scenarioIds: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1),
  sequence: z
    .array(
      z.object({
        order: z.number().int().positive(),
        scenarioId: z.string().min(1),
        mode: z.enum(['automated', 'inventory']),
      }),
    )
    .min(1),
  scenarios: z.array(ScenarioSchema).min(1),
});

const path = resolve(process.argv[2] ?? 'qa/scenarios/pvl-auth-public.json');
const catalog = CatalogSchema.parse(JSON.parse(await readFile(path, 'utf8')));
const ids = catalog.scenarios.map((scenario) => scenario.id);
if (new Set(ids).size !== ids.length) throw new Error('Scenario IDs must be unique');
const knownIds = new Set(ids);
for (const workflow of catalog.workflows) {
  for (const scenarioId of workflow.scenarioIds) {
    if (!knownIds.has(scenarioId)) {
      throw new Error(`${workflow.id}: unknown scenario ${scenarioId}`);
    }
  }
}
const sequenceOrders = catalog.sequence.map((step) => step.order);
if (new Set(sequenceOrders).size !== sequenceOrders.length) {
  throw new Error('PVL sequence order values must be unique');
}
for (const step of catalog.sequence) {
  if (!knownIds.has(step.scenarioId)) {
    throw new Error(`sequence: unknown scenario ${step.scenarioId}`);
  }
}

for (const scenario of catalog.scenarios) {
  if (scenario.status === 'inventory' && scenario.command !== null) {
    throw new Error(`${scenario.id}: inventory scenarios cannot claim an executable command`);
  }
  if (scenario.status !== 'inventory' && scenario.command === null) {
    throw new Error(`${scenario.id}: covered scenarios require an executable command`);
  }
}

console.log(`PVL scenario catalog valid: ${catalog.scenarios.length} scenarios`);
console.log(`PVL workflows valid: ${catalog.workflows.length} automode workflows`);
console.log(`PVL sequence valid: ${catalog.sequence.length} ordered steps`);
for (const scenario of catalog.scenarios) {
  console.log(`- ${scenario.id} [${scenario.status}]`);
}
