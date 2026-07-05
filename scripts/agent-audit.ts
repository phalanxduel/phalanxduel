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
  rawStatus: string;
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

const ACTIVE_TASK_STATUSES = new Set(['To Do', 'Ready', 'In Progress', 'Verification']);
const STABILIZATION_HARDENING_RE =
  /\b(stabili[sz](?:e|es|ed|ing|ation)|harden(?:ing|s|ed)?|archive|archival|quarantine|alignment|consolidat(?:e|es|ed|ing|ion))\b/i;
const GODOT_V2_RE = /\b(?:godot|v2)\b/i;
const GODOT_V2_SKILL_PROMOTION_PATTERNS = [
  /\buse when\b.*\b(?:godot|v2)\b/i,
  /\bwhen working on\b.*\b(?:godot|v2)\b/i,
  /\b(?:godot|v2)\b.*\b(?:should|must|run|use|match|parity)\b/i,
  /\b(?:oracle|source of truth|primary ui|active ui)\b.*\b(?:godot|v2)\b/i,
  /\b(?:godot|v2)\b.*\b(?:oracle|source of truth|primary ui|active ui)\b/i,
];
const ACTIVE_PATH_EXCLUDE_RE =
  /^(?:archive|docs\/archive|node_modules|dist|build|coverage|playwright-report|artifacts|\.artifacts|sdk|\.git)\//;
const CANONICAL_DOC_REF_RE =
  /(?:^|[\s([`])((?:docs|backlog|clients|\.github)\/[^\s)`'"]+\.(?:md|yaml|yml|json))/g;
const STALE_WORKFLOW_STATUSES = ['Planned', 'Human Review'];
const COMMAND_BLOCK_START_RE = /^```\s*(?:bash|sh|shell|zsh)?\s*$/;
const COMMAND_BLOCK_END_RE = /^```\s*$/;
const RAW_COMMAND_RE = /^(?:pnpm|npm|yarn|tsx|vitest|backlog|\.\/bin\/check|bin\/check)\b/;

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

function activeFiles(dirs: string | string[], predicate: (file: string) => boolean): string[] {
  const dirList = Array.isArray(dirs) ? dirs : [dirs];
  return dirList.flatMap((dir) =>
    walkFiles(dir, (file) => !ACTIVE_PATH_EXCLUDE_RE.test(file) && predicate(file)),
  );
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
        rawStatus: frontmatter.status,
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

function canonicalDocReferenceFindings(files: { file: string; text: string }[]): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();
  for (const source of files) {
    for (const match of source.text.matchAll(CANONICAL_DOC_REF_RE)) {
      const referencedPath = match[1]!;
      if (ACTIVE_PATH_EXCLUDE_RE.test(referencedPath)) continue;
      if (fs.existsSync(path.join(ROOT, referencedPath))) continue;
      const key = `${source.file}:${referencedPath}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({
        level: 'fail',
        message: `${source.file} references missing canonical doc ${referencedPath}`,
      });
    }
  }
  if (findings.length === 0) {
    findings.push({ level: 'ok', message: 'canonical docs referenced by agent guidance exist' });
  }
  return findings;
}

function workflowStatusDriftFindings(
  workflowText: string | null,
  configuredStatuses: string[],
): Finding[] {
  if (workflowText == null) {
    return [{ level: 'fail', message: 'docs/tutorials/ai-agent-workflow.md could not be read' }];
  }
  const findings: Finding[] = [];
  const configured = new Set(configuredStatuses);
  for (const status of STALE_WORKFLOW_STATUSES) {
    if (configured.has(status) || !workflowText.includes(status)) continue;
    findings.push({
      level: 'fail',
      message: `docs/tutorials/ai-agent-workflow.md mentions stale Backlog status "${status}" not present in backlog/config.yml`,
    });
  }
  if (findings.length === 0) {
    findings.push({ level: 'ok', message: 'workflow docs use configured Backlog statuses' });
  }
  return findings;
}

function nestedAgentCommandFindings(files: { file: string; text: string }[]): Finding[] {
  const findings: Finding[] = [];
  for (const source of files.filter((candidate) => candidate.file !== 'AGENTS.md')) {
    let inCommandBlock = false;
    const lines = source.text.split('\n');
    lines.forEach((line, index) => {
      if (COMMAND_BLOCK_START_RE.test(line)) {
        inCommandBlock = true;
        return;
      }
      if (COMMAND_BLOCK_END_RE.test(line)) {
        inCommandBlock = false;
        return;
      }
      const command = line.trim();
      if (!inCommandBlock || command === '' || command.startsWith('#')) return;
      if (command === 'pnpm check:quick' || command.startsWith('pnpm check:quick ')) {
        findings.push({
          level: 'fail',
          message: `${source.file}:${index + 1} references stale pnpm check:quick; use rtk pnpm verify:quick`,
        });
        return;
      }
      if (RAW_COMMAND_RE.test(command) && !command.startsWith('rtk ')) {
        findings.push({
          level: 'fail',
          message: `${source.file}:${index + 1} has raw command example "${command}"; prefix repo shell examples with rtk`,
        });
      }
    });
  }
  if (findings.length === 0) {
    findings.push({ level: 'ok', message: 'nested AGENTS.md command examples use rtk' });
  }
  return findings;
}

function dockerComposeConventionFindings(files: { file: string; text: string }[]): Finding[] {
  const findings: Finding[] = [];
  for (const source of files) {
    const lines = source.text.split('\n');
    lines.forEach((line, index) => {
      if (!/\bdocker compose\b/.test(line)) return;
      findings.push({
        level: 'fail',
        message: `${source.file}:${index + 1} uses "docker compose"; use "docker-compose" for this repo`,
      });
    });
  }
  if (findings.length === 0) {
    findings.push({ level: 'ok', message: 'active docs/scripts use docker-compose spelling' });
  }
  return findings;
}

function integrationDriftFindings(configuredStatuses: string[]): Finding[] {
  const instructionFiles = [
    'AGENTS.md',
    'CODEX.md',
    'CLAUDE.md',
    'GEMINI.md',
    '.github/copilot-instructions.md',
  ].flatMap((file) => {
    const text = readText(file);
    return text == null ? [] : [{ file, text }];
  });
  const nestedAgentFiles = ['clients/AGENTS.md'].flatMap((file) => {
    const text = readText(file);
    return text == null ? [] : [{ file, text }];
  });
  const conventionFiles = [
    ...activeFiles('docs', (file) => {
      if (!file.endsWith('.md')) return false;
      return file !== 'docs/system/KNIP_REPORT.md' && file !== 'docs/reference/pnpm-scripts.md';
    }),
    ...activeFiles('scripts', (file) => {
      if (file === 'scripts/agent-audit.ts' || file.endsWith('.test.ts')) return false;
      return /\.(?:ts|js|sh|md)$/.test(file);
    }),
    ...activeFiles('bin', (file) => /\.(?:ts|js|sh|md)$/.test(file)),
    'AGENTS.md',
    'CODEX.md',
    'CLAUDE.md',
    'package.json',
  ].flatMap((file) => {
    const text = readText(file);
    return text == null ? [] : [{ file, text }];
  });

  return [
    ...canonicalDocReferenceFindings(instructionFiles),
    ...workflowStatusDriftFindings(
      readText('docs/tutorials/ai-agent-workflow.md'),
      configuredStatuses,
    ),
    ...nestedAgentCommandFindings(nestedAgentFiles),
    ...dockerComposeConventionFindings(conventionFiles),
  ];
}

function backlogFindings(tasks: TaskSummary[], configuredStatuses: string[]): Finding[] {
  const findings: Finding[] = [];
  const statusSet = new Set(configuredStatuses);
  const rawNonCanonicalStatuses = tasks.filter(
    (task) => !statusSet.has(task.rawStatus) && statusSet.has(task.status),
  );
  const unknownStatuses = [
    ...new Set(tasks.map((task) => task.status).filter((s) => !statusSet.has(s))),
  ];
  if (configuredStatuses.length === 0) {
    findings.push({ level: 'fail', message: 'backlog/config.yml statuses could not be parsed' });
  } else {
    for (const task of rawNonCanonicalStatuses) {
      findings.push({
        level: 'fail',
        message: `${task.file} uses non-canonical status "${task.rawStatus}"; change it to "${task.status}" through Backlog tooling`,
      });
    }
    if (unknownStatuses.length > 0) {
      findings.push({
        level: 'fail',
        message: `task statuses missing from backlog/config.yml: ${unknownStatuses.join(', ')}`,
      });
    }
    if (rawNonCanonicalStatuses.length === 0 && unknownStatuses.length === 0) {
      findings.push({
        level: 'ok',
        message: `backlog statuses are configured: ${configuredStatuses.join(', ')}`,
      });
    }
  }
  const active = tasks.filter((task) => ACTIVE_TASK_STATUSES.has(task.status));
  if (active.length === 0) {
    findings.push({
      level: 'ok',
      message: 'no tasks are currently To Do/Ready/In Progress/Verification',
    });
  } else {
    for (const task of active) {
      findings.push({ level: 'warn', message: `${task.status}: ${task.id} - ${task.title}` });
      if (!STABILIZATION_HARDENING_RE.test(`${task.id} ${task.title} ${task.file}`)) {
        findings.push({
          level: 'fail',
          message: `${task.status}: ${task.id} is active but not stabilization/hardening (${task.file}); move it to Icebox/Backlog/Done or retitle/scope it as stabilization/hardening`,
        });
      }
    }
  }
  return findings;
}

function rootQaScriptFindings(packageJsonText: string | null): Finding[] {
  if (packageJsonText == null) {
    return [{ level: 'fail', message: 'package.json could not be read for root qa:* audit' }];
  }
  let packageJson: { scripts?: Record<string, unknown> };
  try {
    packageJson = JSON.parse(packageJsonText) as { scripts?: Record<string, unknown> };
  } catch {
    return [{ level: 'fail', message: 'package.json could not be parsed for root qa:* audit' }];
  }

  const qaScriptFindings = Object.entries(packageJson.scripts ?? {})
    .filter(([name, command]) => name.startsWith('qa:') && typeof command === 'string')
    .filter(([name, command]) => GODOT_V2_RE.test(`${name} ${command as string}`))
    .map(([name, command]) => ({
      level: 'fail' as const,
      message: `package.json script "${name}" references Godot/V2 (${command}); archive/rename it outside root qa:* or remove the stale command`,
    }));

  if (qaScriptFindings.length === 0) {
    return [{ level: 'ok', message: 'root qa:* scripts do not reference Godot/V2' }];
  }
  return qaScriptFindings;
}

function lineNumberForPattern(text: string, pattern: RegExp): number {
  const lines = text.split('\n');
  const index = lines.findIndex((line) => pattern.test(line));
  return index === -1 ? 1 : index + 1;
}

function agentSkillAlignmentFindings(skills: { file: string; text: string }[]): Finding[] {
  const findings: Finding[] = [];
  for (const skill of skills) {
    const pattern = GODOT_V2_SKILL_PROMOTION_PATTERNS.find((candidate) =>
      candidate.test(skill.text),
    );
    if (!pattern) continue;
    findings.push({
      level: 'fail',
      message: `${skill.file}:${lineNumberForPattern(skill.text, pattern)} promotes Godot/V2 workflow; update the active skill to v1/browser guidance or move it out of .agents/skills`,
    });
  }
  if (findings.length === 0) {
    findings.push({
      level: 'ok',
      message: 'active .agents/skills SKILL.md files do not promote Godot/V2',
    });
  }
  return findings;
}

function v1AlignmentFindings(): Finding[] {
  const qaScripts = rootQaScriptFindings(readText('package.json'));
  const skillFiles = walkFiles('.agents/skills', (file) => file.endsWith('/SKILL.md')).flatMap(
    (file) => {
      const text = readText(file);
      return text == null ? [] : [{ file, text }];
    },
  );
  return [...qaScripts, ...agentSkillAlignmentFindings(skillFiles)];
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

function main(): void {
  const tasks = readTasks();
  const configuredStatuses = parseStatusConfig();
  const backlog = backlogFindings(tasks, configuredStatuses);
  const instructions = instructionFindings();
  const integrationDrift = integrationDriftFindings(configuredStatuses);
  const v1Alignment = v1AlignmentFindings();
  const generatedArtifacts = generatedArtifactFindings();
  const services = serviceFindings();

  console.log('Phalanx Duel Agent Audit');
  printSection('Backlog', backlog);
  printSection('Instruction Drift', instructions);
  printSection('Integration Drift', integrationDrift);
  printSection('V1 Alignment', v1Alignment);
  printSection('Generated Artifacts', generatedArtifacts);
  printSection('Service Classification', services);

  const hardFailures = [
    ...backlog,
    ...instructions,
    ...integrationDrift,
    ...v1Alignment,
    ...generatedArtifacts,
    ...services,
  ].filter((finding) => finding.level === 'fail');

  if (hardFailures.length > 0) {
    console.error(`\nAgent audit found ${hardFailures.length} blocking issue(s).`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  agentSkillAlignmentFindings,
  backlogFindings,
  canonicalDocReferenceFindings,
  dockerComposeConventionFindings,
  integrationDriftFindings,
  nestedAgentCommandFindings,
  rootQaScriptFindings,
  workflowStatusDriftFindings,
  type Finding,
  type TaskSummary,
};
