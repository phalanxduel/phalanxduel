#!/usr/bin/env tsx
/**
 * Repo-local agent integration audit.
 *
 * This command is intentionally read-only. It separates project-blocking state
 * from workstation service noise so agents can make better decisions before
 * starting work.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

type Level = 'ok' | 'warn' | 'fail';
type TaskStatus =
  | 'To Do'
  | 'Backlog'
  | 'Ready'
  | 'In Progress'
  | 'Verification'
  | 'Done'
  | 'Icebox'
  | string;

interface Finding {
  level: Level;
  message: string;
}

interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  priority?: string;
  file: string;
}

interface ZsvcHealth {
  healthy: boolean;
  services: {
    name: string;
    state: string;
    health: string;
    detail?: string;
    endpoint?: string;
  }[];
}

const PROJECT_BLOCKING_SERVICES = new Set(['otel']);
const CONTAINER_BLOCKING_SERVICES = new Set(['colima']);
const WORKSTATION_ONLY_SERVICES = new Set([
  'llama',
  'embed',
  'o2',
  'nginx',
  'postgres',
  'redis',
  'worker',
  'status',
]);

function readText(relPath: string): string | null {
  try {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  } catch {
    return null;
  }
}

function walkFiles(dir: string, predicate: (file: string) => boolean): string[] {
  const absDir = path.join(ROOT, dir);
  const out: string[] = [];
  if (!fs.existsSync(absDir)) return out;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const abs = path.join(absDir, entry.name);
    const rel = path.relative(ROOT, abs);
    if (entry.isDirectory()) out.push(...walkFiles(rel, predicate));
    else if (predicate(rel)) out.push(rel);
  }
  return out.sort();
}

function parseFrontmatter(text: string): Record<string, string> {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  const fields: Record<string, string> = {};
  if (!match) return fields;
  for (const line of match[1]!.split('\n')) {
    const field = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!field) continue;
    fields[field[1]!] = field[2]!.replace(/^['"]|['"]$/g, '').trim();
  }
  return fields;
}

function normalizeTaskStatus(status: string): string {
  const normalized = status.toLowerCase().replace(/[^a-z]/g, '');
  if (normalized === 'done' || normalized === 'completed') return 'Done';
  return status;
}

function parseStatusConfig(): string[] {
  const config = readText('backlog/config.yml') ?? '';
  const match = config.match(/^statuses:\s*\[(.*)\]/m);
  if (!match) return [];
  return match[1]!
    .split(',')
    .map((status) => status.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function readTasks(): TaskSummary[] {
  return walkFiles('backlog/tasks', (file) => file.endsWith('.md')).flatMap((file) => {
    const text = readText(file);
    if (!text) return [];
    const frontmatter = parseFrontmatter(text);
    if (!frontmatter.id || !frontmatter.title || !frontmatter.status) return [];
    return [
      {
        id: frontmatter.id,
        title: frontmatter.title,
        status: normalizeTaskStatus(frontmatter.status),
        priority: frontmatter.priority,
        file,
      },
    ];
  });
}

function gitStatus(paths: string[]): string[] {
  try {
    return execFileSync('git', ['status', '--short', '--', ...paths], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

function runJsonCommand<T>(command: string, args: string[], timeout = 10000): T | null {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout,
  });
  const output = result.stdout.trim();
  if (!output) return null;
  try {
    return JSON.parse(output) as T;
  } catch {
    return null;
  }
}

function instructionFindings(): Finding[] {
  const files = [
    'AGENTS.md',
    'CODEX.md',
    'CLAUDE.md',
    'GEMINI.md',
    '.github/copilot-instructions.md',
  ];
  const stalePatterns = [
    /treat\s+`?TASK-\d+`?\s+as\s+the\s+live\s+next\s+step/i,
    /current implementation task:\s*\n\s*-\s*`?TASK-\d+/i,
    /We have migrated the UI to Godot 4\.x/i,
    /Godot 4\.x client is the primary UI/i,
    /Use `godot\/client\/` for development/i,
  ];
  const findings: Finding[] = [];
  for (const file of files) {
    const text = readText(file);
    if (text == null) continue;
    const hits = stalePatterns.filter((pattern) => pattern.test(text));
    if (hits.length > 0) {
      findings.push({ level: 'fail', message: `${file} contains stale active-task/UI guidance` });
    }
  }
  if (findings.length === 0) {
    findings.push({ level: 'ok', message: 'agent instruction files have no known stale guidance' });
  }
  return findings;
}

function backlogFindings(tasks: TaskSummary[], configuredStatuses: string[]): Finding[] {
  const findings: Finding[] = [];
  const statusSet = new Set(configuredStatuses);
  const unknownStatuses = [
    ...new Set(tasks.map((task) => task.status).filter((s) => !statusSet.has(s))),
  ];
  if (configuredStatuses.length === 0) {
    findings.push({ level: 'fail', message: 'backlog/config.yml statuses could not be parsed' });
  } else if (unknownStatuses.length > 0) {
    findings.push({
      level: 'fail',
      message: `task statuses missing from backlog/config.yml: ${unknownStatuses.join(', ')}`,
    });
  } else {
    findings.push({
      level: 'ok',
      message: `backlog statuses are configured: ${configuredStatuses.join(', ')}`,
    });
  }
  const active = tasks.filter((task) =>
    ['Ready', 'In Progress', 'Verification'].includes(task.status),
  );
  if (active.length === 0) {
    findings.push({
      level: 'ok',
      message: 'no tasks are currently Ready/In Progress/Verification',
    });
  } else {
    for (const task of active) {
      findings.push({ level: 'warn', message: `${task.status}: ${task.id} - ${task.title}` });
    }
  }
  return findings;
}

function generatedArtifactFindings(): Finding[] {
  const dirty = gitStatus(['playwright-report', 'artifacts', '.artifacts']);
  if (dirty.length === 0) {
    return [{ level: 'ok', message: 'generated QA artifact paths are clean or ignored' }];
  }
  return dirty.map((line) => ({
    level: 'warn',
    message: `generated artifact has git status entry: ${line}`,
  }));
}

function serviceFindings(): Finding[] {
  const health =
    runJsonCommand<ZsvcHealth>('zsvc', ['health', '--json']) ??
    runJsonCommand<ZsvcHealth>('rtk', ['zsvc', 'health', '--json']) ??
    runJsonCommand<ZsvcHealth>('/opt/homebrew/bin/rtk', ['zsvc', 'health', '--json']);
  if (!health) {
    return [
      {
        level: 'warn',
        message: 'zsvc health unavailable; skipping workstation service classification',
      },
    ];
  }
  const findings: Finding[] = [];
  for (const service of health.services) {
    if (service.health === 'ok') continue;
    if (PROJECT_BLOCKING_SERVICES.has(service.name)) {
      findings.push({
        level: 'fail',
        message: `project service unhealthy: ${service.name} (${service.detail ?? service.health})`,
      });
    } else if (CONTAINER_BLOCKING_SERVICES.has(service.name)) {
      findings.push({
        level: 'warn',
        message: `container verification service unhealthy: ${service.name} (${service.state})`,
      });
    } else if (WORKSTATION_ONLY_SERVICES.has(service.name)) {
      findings.push({
        level: 'warn',
        message: `workstation-only service unhealthy: ${service.name} (${service.detail ?? service.health})`,
      });
    } else {
      findings.push({
        level: 'warn',
        message: `unclassified service unhealthy: ${service.name} (${service.detail ?? service.health})`,
      });
    }
  }
  if (findings.length === 0) return [{ level: 'ok', message: 'zsvc services are healthy' }];
  return findings;
}

function icon(level: Level): string {
  switch (level) {
    case 'ok':
      return 'OK';
    case 'warn':
      return 'WARN';
    case 'fail':
      return 'FAIL';
  }
}

function printSection(title: string, findings: Finding[]): void {
  console.log(`\n${title}`);
  for (const finding of findings) {
    console.log(`  [${icon(finding.level)}] ${finding.message}`);
  }
}

const tasks = readTasks();
const configuredStatuses = parseStatusConfig();
const backlog = backlogFindings(tasks, configuredStatuses);
const instructions = instructionFindings();
const generatedArtifacts = generatedArtifactFindings();
const services = serviceFindings();

console.log('Phalanx Duel Agent Audit');
printSection('Backlog', backlog);
printSection('Instruction Drift', instructions);
printSection('Generated Artifacts', generatedArtifacts);
printSection('Service Classification', services);

const hardFailures = [...backlog, ...instructions, ...generatedArtifacts, ...services].filter(
  (finding) => finding.level === 'fail',
);

if (hardFailures.length > 0) {
  console.error(`\nAgent audit found ${hardFailures.length} blocking issue(s).`);
  process.exit(1);
}
