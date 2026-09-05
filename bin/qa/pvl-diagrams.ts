#!/usr/bin/env tsx

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';

type ScenarioStatus = 'covered' | 'partially-covered' | 'inventory';
type DiagramStatus = 'declared' | 'observed' | 'unknown';

interface Scenario {
  id: string;
  title: string;
  surface: string;
  status: ScenarioStatus;
  steps: string[];
  layers: string[];
  identities: string[];
}

interface Catalog {
  project: { id: string; name: string; persona: string; environment: string };
  scenarios: Scenario[];
  sequence: Array<{ order: number; scenarioId: string; mode: 'automated' | 'inventory' }>;
}

interface GraphEdge {
  from: string;
  to: string;
  scenarioId: string;
  status: DiagramStatus;
  coverage: ScenarioStatus;
}

interface GraphModel {
  version: 1;
  generatedAt: string;
  project: Catalog['project'];
  nodes: string[];
  layerEdges: GraphEdge[];
  identityEdges: GraphEdge[];
  sequence: Catalog['sequence'];
}

const { values } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== '--'),
  options: {
    catalog: { type: 'string', default: 'qa/scenarios/pvl-auth-public.json' },
    out: { type: 'string', default: 'artifacts/pvl/pvl-diagrams' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help) {
  console.log(`PVL diagram generator

Usage:
  pnpm exec tsx bin/qa/pvl-diagrams.ts [options]

Options:
  --catalog <path>  Scenario catalog path
  --out <path>      Output basename (default: artifacts/pvl/pvl-diagrams)
`);
  process.exit(0);
}

const catalog = JSON.parse(await readFile(resolve(values.catalog as string), 'utf8')) as Catalog;
const scenariosById = new Map(catalog.scenarios.map((scenario) => [scenario.id, scenario]));
const orderedScenarios = catalog.sequence
  .slice()
  .sort((left, right) => left.order - right.order)
  .map((step) => scenariosById.get(step.scenarioId))
  .filter((scenario): scenario is Scenario => scenario !== undefined);

const diagramStatus = (scenario: Scenario): DiagramStatus =>
  scenario.status === 'covered' ? 'declared' : 'unknown';

const layerEdges = orderedScenarios.flatMap((scenario) =>
  scenario.layers.slice(0, -1).map((from, index) => ({
    from,
    to: scenario.layers[index + 1]!,
    scenarioId: scenario.id,
    status: diagramStatus(scenario),
    coverage: scenario.status,
  })),
);

const identityEdges = orderedScenarios.flatMap((scenario) =>
  scenario.identities.slice(0, -1).map((from, index) => ({
    from,
    to: scenario.identities[index + 1]!,
    scenarioId: scenario.id,
    status: diagramStatus(scenario),
    coverage: scenario.status,
  })),
);

const nodes = [
  ...new Set([
    ...orderedScenarios.flatMap((scenario) => scenario.layers),
    ...orderedScenarios.flatMap((scenario) => scenario.identities),
  ]),
];

const model: GraphModel = {
  version: 1,
  generatedAt: new Date().toISOString(),
  project: catalog.project,
  nodes,
  layerEdges,
  identityEdges,
  sequence: catalog.sequence,
};

function mermaidId(value: string): string {
  return `n_${value.toLowerCase().replaceAll(/[^a-z0-9]+/g, '_')}`;
}

function quote(value: string): string {
  return value.replaceAll('"', "'").replaceAll('\\', '/');
}

function flowDiagram(edges: GraphEdge[], title: string): string {
  const lines = [`### ${title}`, '', '```mermaid', 'flowchart LR'];
  for (const node of nodes) lines.push(`  ${mermaidId(node)}["${quote(node)}"]`);
  for (const edge of edges) {
    const label = `${edge.scenarioId} · ${edge.coverage}`;
    lines.push(`  ${mermaidId(edge.from)} -->|"${quote(label)}"| ${mermaidId(edge.to)}`);
  }
  lines.push('```', '');
  return lines.join('\n');
}

function scenarioSequence(scenario: Scenario): string {
  const lines = [
    `### ${scenario.id} · ${scenario.title}`,
    '',
    `Coverage: **${scenario.status}** · derived edges: **${diagramStatus(scenario)}**`,
    '',
    '```mermaid',
    'sequenceDiagram',
    '  actor Visitor as Standard User',
  ];
  for (const layer of scenario.layers) {
    lines.push(`  participant ${mermaidId(layer)} as ${quote(layer)}`);
  }
  const firstLayer = mermaidId(scenario.layers[0] ?? 'browser');
  lines.push(`  Visitor->>${firstLayer}: ${quote(scenario.steps[0] ?? 'begin')}`);
  for (let index = 0; index < scenario.layers.length - 1; index++) {
    const from = mermaidId(scenario.layers[index]!);
    const to = mermaidId(scenario.layers[index + 1]!);
    lines.push(`  ${from}->>${to}: scenario edge ${index + 1}`);
  }
  lines.push('```', '', '**Identity spine**', '', `\`${scenario.identities.join(' → ')}\``, '');
  return lines.join('\n');
}

const markdown = [
  `# ${catalog.project.name} · PVL interaction diagrams`,
  '',
  `Generated: ${model.generatedAt}`,
  '',
  'These diagrams are derived from the declared scenario interaction patterns.',
  'They are not proof of runtime behavior: inventory edges remain `unknown` until',
  'a local run attaches trace, replay, log, or query evidence.',
  '',
  flowDiagram(layerEdges, 'Layer flow'),
  flowDiagram(identityEdges, 'Identity continuity'),
  '### Ordered scenario sequence',
  '',
  '```mermaid',
  'flowchart TD',
  ...catalog.sequence
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((step, index) => {
      const scenario = scenariosById.get(step.scenarioId);
      const label = `${step.order}. ${step.scenarioId} · ${step.mode}`;
      const current = `sequence_${index}`;
      const next = index < catalog.sequence.length - 1 ? ` --> sequence_${index + 1}` : '';
      return `  ${current}["${quote(label)}"]${next}`;
    }),
  '```',
  '',
  ...orderedScenarios.map(scenarioSequence),
  '## Evidence legend',
  '',
  '- `declared`: the catalog defines the edge and an existing runner can target it.',
  '- `unknown`: the flow is inventoried but has no attached runtime evidence yet.',
  '- `observed`: reserved for a future merge of run-evidence/O2 attachments.',
  '',
].join('\n');

const outBase = resolve(values.out as string);
await mkdir(dirname(outBase), { recursive: true });
await writeFile(`${outBase}.md`, markdown, 'utf8');
await writeFile(`${outBase}.json`, `${JSON.stringify(model, null, 2)}\n`, 'utf8');
console.log(`PVL diagrams written: ${outBase}.md`);
console.log(`PVL graph model written: ${outBase}.json`);
