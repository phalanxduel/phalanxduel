import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type Metric = {
  total: number;
  covered: number;
  skipped?: number;
  pct: number;
};

type CoverageSummary = {
  total: {
    lines: Metric;
    statements: Metric;
    functions: Metric;
    branches: Metric;
  };
};

const PACKAGES = ['shared', 'engine', 'server'] as const;

function readSummary(pkg: (typeof PACKAGES)[number]): CoverageSummary {
  const path = join(pkg, 'coverage', 'coverage-summary.json');
  return JSON.parse(readFileSync(path, 'utf8')) as CoverageSummary;
}

function pct(covered: number, total: number): number {
  return total === 0 ? 100 : Number(((covered / total) * 100).toFixed(2));
}

function fmt(metric: Metric): string {
  return `${metric.pct.toFixed(2)}% (${metric.covered}/${metric.total})`;
}

const aggregate = {
  lines: { total: 0, covered: 0 },
  statements: { total: 0, covered: 0 },
  functions: { total: 0, covered: 0 },
  branches: { total: 0, covered: 0 },
};

console.log('Coverage report (unit/integration suites only)');
console.log('');

for (const pkg of PACKAGES) {
  const summary = readSummary(pkg);
  const { lines, statements, functions, branches } = summary.total;

  aggregate.lines.total += lines.total;
  aggregate.lines.covered += lines.covered;
  aggregate.statements.total += statements.total;
  aggregate.statements.covered += statements.covered;
  aggregate.functions.total += functions.total;
  aggregate.functions.covered += functions.covered;
  aggregate.branches.total += branches.total;
  aggregate.branches.covered += branches.covered;

  console.log(`${pkg}:`);
  console.log(`  lines:      ${fmt(lines)}`);
  console.log(`  statements: ${fmt(statements)}`);
  console.log(`  functions:  ${fmt(functions)}`);
  console.log(`  branches:   ${fmt(branches)}`);
  console.log('');
}

console.log('aggregate:');
console.log(`  lines:      ${pct(aggregate.lines.covered, aggregate.lines.total).toFixed(2)}% (${aggregate.lines.covered}/${aggregate.lines.total})`);
console.log(`  statements: ${pct(aggregate.statements.covered, aggregate.statements.total).toFixed(2)}% (${aggregate.statements.covered}/${aggregate.statements.total})`);
console.log(`  functions:  ${pct(aggregate.functions.covered, aggregate.functions.total).toFixed(2)}% (${aggregate.functions.covered}/${aggregate.functions.total})`);
console.log(`  branches:   ${pct(aggregate.branches.covered, aggregate.branches.total).toFixed(2)}% (${aggregate.branches.covered}/${aggregate.branches.total})`);
