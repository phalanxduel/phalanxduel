#!/usr/bin/env tsx
/**
 * Generates exact Graphviz DOT + SVG visualizations directly from:
 *   1. The live TypeScript STATE_MACHINE in engine/src/state-machine.ts (default)
 *   2. Any match replay / trajectory JSON artifact (--replay <path.json>)
 *
 * Uses @viz-js/viz (WASM Graphviz already in devDependencies) — zero native binary required.
 *
 * Usage:
 *   node --import tsx scripts/docs/render-fsm-and-replay-dot.ts
 *   node --import tsx scripts/docs/render-fsm-and-replay-dot.ts --replay <path.json> [--out <path.svg>]
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { instance } from '@viz-js/viz';
import { GAME_PHASES, STATE_MACHINE } from '../../engine/src/state-machine.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DIR = path.join(ROOT_DIR, 'docs/diagrams');

function escapeDot(label: string): string {
  return label.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildFsmDot(): string {
  const lines: string[] = [
    'digraph PhalanxDuelFSM {',
    '  rankdir=LR;',
    '  bgcolor="#fffdf8";',
    '  node [fontname="Helvetica", fontsize=11, shape=box, style="rounded,filled", fillcolor="#f5f2eb", color="#172033", fontcolor="#172033"];',
    '  edge [fontname="Helvetica", fontsize=9, color="#566071", fontcolor="#172033"];',
  ];

  for (const phase of GAME_PHASES) {
    if (phase === 'gameOver') {
      lines.push(
        `  "${phase}" [shape=doubleoctagon, fillcolor="#172033", color="#d97706", fontcolor="#fffdf8"];`,
      );
    } else if (phase === 'AttackResolution') {
      lines.push(`  "${phase}" [fillcolor="#eff6ff", color="#2775a6"];`);
    } else {
      lines.push(`  "${phase}";`);
    }
  }

  // Group parallel triggers between the same (from, to) pair for legibility
  const grouped = new Map<string, string[]>();
  for (const edge of STATE_MACHINE) {
    const key = `${edge.from}->${edge.to}`;
    const triggers = grouped.get(key) ?? [];
    if (!triggers.includes(edge.trigger)) triggers.push(edge.trigger);
    grouped.set(key, triggers);
  }

  for (const [key, triggers] of grouped.entries()) {
    const [from, to] = key.split('->');
    const isForfeit = triggers.length === 1 && triggers[0] === 'forfeit';
    const attrs = isForfeit
      ? `label="${escapeDot(triggers.join(' | '))}", style=dashed, color="#c7374f", fontcolor="#c7374f"`
      : `label="${escapeDot(triggers.join(' | '))}"`;
    lines.push(`  "${from}" -> "${to}" [${attrs}];`);
  }

  lines.push('}');
  return `${lines.join('\n')}\n`;
}

interface ReplayFrameLike {
  turnNumber?: number;
  phase?: string;
  action?: { type?: string };
  stateHash?: string;
  postStateHash?: string;
  hash?: string;
}

function buildReplayDot(raw: unknown, title: string): string {
  const frames: ReplayFrameLike[] = Array.isArray(raw)
    ? raw
    : typeof raw === 'object' && raw !== null
      ? (((raw as Record<string, unknown>).frames as ReplayFrameLike[] | undefined) ??
        ((raw as Record<string, unknown>).turns as ReplayFrameLike[] | undefined) ??
        ((raw as Record<string, unknown>).actions as ReplayFrameLike[] | undefined) ??
        [])
      : [];

  const lines: string[] = [
    'digraph PhalanxReplayChain {',
    '  rankdir=LR;',
    '  bgcolor="#fffdf8";',
    `  label="${escapeDot(title)}";`,
    '  labelloc=t;',
    '  fontname="Helvetica";',
    '  node [fontname="Helvetica", fontsize=10, shape=record, style="rounded,filled", fillcolor="#f5f2eb", color="#172033"];',
    '  edge [fontname="Helvetica", fontsize=9, color="#2775a6"];',
  ];

  frames.slice(0, 60).forEach((frame, idx) => {
    const hash = (frame.postStateHash ?? frame.stateHash ?? frame.hash ?? 'unhashed').slice(0, 10);
    const turn = frame.turnNumber ?? idx;
    const phase = frame.phase ?? 'step';
    const action = frame.action?.type ?? 'transition';
    lines.push(
      `  n${idx} [label="{T${turn}: ${escapeDot(phase)} | ${escapeDot(action)} | #${escapeDot(hash)}}"];`,
    );
    if (idx > 0) {
      lines.push(`  n${idx - 1} -> n${idx};`);
    }
  });

  lines.push('}');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const replayIdx = args.indexOf('--replay');
  const outIdx = args.indexOf('--out');
  const viz = await instance();

  if (replayIdx !== -1 && args[replayIdx + 1]) {
    const replayPath = path.resolve(args[replayIdx + 1]!);
    const raw = JSON.parse(await readFile(replayPath, 'utf8'));
    const dot = buildReplayDot(raw, path.basename(replayPath));
    const svg = viz.renderString(dot, { format: 'svg', engine: 'dot' });
    const outPath =
      outIdx !== -1 && args[outIdx + 1]
        ? path.resolve(args[outIdx + 1]!)
        : replayPath.replace(/\.json$/i, '.replay-dag.svg');
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, svg, 'utf8');
    console.log(`Generated: ${path.relative(ROOT_DIR, outPath)}`);
    return;
  }

  const dot = buildFsmDot();
  const svg = viz.renderString(dot, { format: 'svg', engine: 'dot' });
  const dotOut = path.join(OUT_DIR, 'engine-fsm-verified.dot');
  const svgOut = path.join(OUT_DIR, 'svg/engine-fsm-verified.svg');
  await mkdir(path.dirname(svgOut), { recursive: true });
  await writeFile(dotOut, dot, 'utf8');
  await writeFile(svgOut, svg, 'utf8');
  console.log(`Generated: ${path.relative(ROOT_DIR, dotOut)}`);
  console.log(`Generated: ${path.relative(ROOT_DIR, svgOut)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
