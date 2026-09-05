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
  scenarios: z.array(ScenarioSchema).min(1),
});

const path = resolve(process.argv[2] ?? 'qa/scenarios/pvl-auth-public.json');
const catalog = CatalogSchema.parse(JSON.parse(await readFile(path, 'utf8')));
const ids = catalog.scenarios.map((scenario) => scenario.id);
if (new Set(ids).size !== ids.length) throw new Error('Scenario IDs must be unique');

for (const scenario of catalog.scenarios) {
  if (scenario.status === 'inventory' && scenario.command !== null) {
    throw new Error(`${scenario.id}: inventory scenarios cannot claim an executable command`);
  }
  if (scenario.status !== 'inventory' && scenario.command === null) {
    throw new Error(`${scenario.id}: covered scenarios require an executable command`);
  }
}

console.log(`PVL scenario catalog valid: ${catalog.scenarios.length} scenarios`);
for (const scenario of catalog.scenarios) {
  console.log(`- ${scenario.id} [${scenario.status}]`);
}
