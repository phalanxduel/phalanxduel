#!/usr/bin/env tsx

/** Render an existing Phalanx Duel capture as a self-contained Panoramic View. */
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { canonicalizeLegacyRun } from './run-evidence.ts';

interface Manifest {
  seed?: number;
  startAt?: string;
  durationMs?: number;
  status?: string;
  failureReason?: string;
  failureMessage?: string;
  turnCount?: number;
  actionCount?: number;
  screenshotCount?: number;
  screenshots?: string[];
  o2Correlation?: { file?: string; attachedAt?: string };
  qaRunId?: string;
  matchId?: string;
}
interface CaptureEvent {
  at: string;
  type: string;
  detail: string;
}
interface ReplayFrame {
  phase?: string;
  turnNumber?: number;
  transactionLog?: unknown[];
}
interface O2Correlation {
  attachedAt?: string;
  source?: string;
  payload?: unknown;
}
type Lane = 'experience' | 'server' | 'engine' | 'evidence' | 'diagnostics';
interface TimelineEvent {
  id: number;
  lane: Lane;
  atMs: number;
  title: string;
  detail: string;
  status: 'observed' | 'unknown' | 'absence';
  source: string;
  trailIds?: string[];
}
interface Trail {
  id: string;
  label: string;
  description: string;
  lanes: Lane[];
  eventIds: number[];
  status: TimelineEvent['status'];
  color: string;
}

const argv = process.argv.slice(2).filter((arg) => arg !== '--');
const { values } = parseArgs({
  args: argv,
  options: {
    run: { type: 'string' },
    out: { type: 'string' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});
if (values.help || !values.run) {
  console.log('Usage: pnpm qa:panoramic -- --run <capture-dir> [--out <file>]');
  if (!values.run) process.exit(values.help ? 0 : 64);
}
const runDir = resolve(values.run as string);
const outputPath = resolve(
  (values.out as string | undefined) ?? join(runDir, 'panoramic-view.html'),
);

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
function laneFor(type: string): Lane {
  if (type === 'action') return 'experience';
  if (type === 'state') return 'server';
  if (type === 'error' || type === 'failure') return 'diagnostics';
  return 'evidence';
}
function normalize(
  events: CaptureEvent[],
  manifest: Manifest,
  replay: ReplayFrame[],
): TimelineEvent[] {
  const start = Date.parse(manifest.startAt ?? events[0]?.at ?? '') || Date.now();
  const result = events.map((event, id) => ({
    id,
    lane: laneFor(event.type),
    atMs: Math.max(0, Date.parse(event.at) - start),
    title: event.type.toUpperCase(),
    detail: event.detail,
    status: (event.type === 'failure' || event.type === 'error'
      ? 'unknown'
      : 'observed') as TimelineEvent['status'],
    source: 'events.ndjson',
  })) satisfies TimelineEvent[];
  const actionEvents = result.filter((event) => event.lane === 'experience');
  for (const [index, event] of actionEvents.entries()) {
    result.push({
      id: result.length,
      lane: 'engine',
      atMs: event.atMs + 1,
      title: 'ENGINE APPLY',
      detail: `transition after action ${index + 1}: ${event.detail}`,
      status: 'observed',
      source: 'engine transition boundary',
    });
  }
  const screenshots = manifest.screenshots ?? [];
  const captureDuration = Math.max(manifest.durationMs ?? 0, result.at(-1)?.atMs ?? 0, 1);
  for (const [index, screenshot] of screenshots.entries()) {
    result.push({
      id: result.length,
      lane: 'evidence',
      atMs: Math.round((index / Math.max(screenshots.length - 1, 1)) * captureDuration),
      title: 'SCREENSHOT',
      detail: screenshot,
      status: 'observed',
      source: 'manifest.json',
    });
  }
  const atMs = result.at(-1)?.atMs ?? 0;
  result.push({
    id: result.length,
    lane: 'evidence',
    atMs,
    title: 'REPLAY EVIDENCE',
    detail: `${replay.length} replay frames; final phase ${replay.at(-1)?.phase ?? 'unknown'}`,
    status: replay.length > 0 ? 'observed' : 'absence',
    source: 'replay_frames.json',
  });
  result.push({
    id: result.length,
    lane: 'diagnostics',
    atMs,
    title: 'O2 CORRELATION',
    detail: manifest.o2Correlation
      ? `Attached O2 snapshot: ${manifest.o2Correlation.file ?? 'o2-correlation.json'}`
      : 'Local collector emission was enabled; an exported O2 query result is not part of this capture.',
    status: manifest.o2Correlation ? 'observed' : 'unknown',
    source: manifest.o2Correlation ? 'o2-correlation.json' : 'capture boundary',
  });
  if (manifest.status === 'failure')
    result.push({
      id: result.length,
      lane: 'diagnostics',
      atMs,
      title: 'HARNESS CLASSIFICATION',
      detail: `${manifest.failureReason ?? 'failure'}: ${manifest.failureMessage ?? 'no message'}`,
      status: 'unknown',
      source: 'manifest.json',
    });
  return result;
}
function deriveTrails(events: TimelineEvent[]): Trail[] {
  const first = (lane: Lane) => events.find((event) => event.lane === lane);
  const last = (lane: Lane) => [...events].reverse().find((event) => event.lane === lane);
  const firstNamed = (title: string) => events.find((event) => event.title === title);
  const lastNamed = (title: string) => [...events].reverse().find((event) => event.title === title);
  const build = (
    id: string,
    label: string,
    description: string,
    candidates: (TimelineEvent | undefined)[],
    color: string,
  ): Trail => {
    const eventIds = [...new Set(candidates.filter(Boolean).map((event) => event!.id))];
    const trailEvents = eventIds.map((eventId) => events[eventId]);
    const status = trailEvents.some((event) => event.status === 'unknown')
      ? 'unknown'
      : trailEvents.some((event) => event.status === 'absence')
        ? 'absence'
        : 'observed';
    return {
      id,
      label,
      description,
      lanes: (['experience', 'server', 'engine', 'evidence', 'diagnostics'] as Lane[]).filter(
        (lane) => trailEvents.some((event) => event.lane === lane),
      ),
      eventIds,
      status,
      color,
    };
  };
  const actionEvents = events.filter((event) => event.lane === 'experience');
  const engineEvents = events.filter((event) => event.lane === 'engine');
  const stateEvents = events.filter((event) => event.lane === 'server');
  const trails = [
    build(
      'match-bootstrap',
      'MATCH BOOTSTRAP',
      'lobby interaction → server state → engine boundary → first evidence',
      [first('experience'), first('server'), first('engine'), first('evidence')],
      '#55d6be',
    ),
    build(
      'turn-cascade',
      'TURN CASCADE',
      'user actions → engine applications → authoritative server projections',
      [...actionEvents, ...engineEvents, ...stateEvents].sort((a, b) => a.atMs - b.atMs),
      '#e2a93b',
    ),
    build(
      'terminal-proof',
      'TERMINAL PROOF',
      'final action → final engine boundary → replay evidence → diagnostics',
      [last('experience'), last('engine'), lastNamed('REPLAY EVIDENCE'), last('diagnostics')],
      '#ff7f66',
    ),
    build(
      'observability-correlation',
      'OBSERVABILITY CORRELATION',
      'first experience signal → replay record → O2 correlation boundary',
      [first('experience'), firstNamed('REPLAY EVIDENCE'), firstNamed('O2 CORRELATION')],
      '#9d8cff',
    ),
  ];
  for (const trail of trails) {
    for (const eventId of trail.eventIds) {
      const event = events[eventId];
      event.trailIds = [...(event.trailIds ?? []), trail.id];
    }
  }
  return trails.filter((trail) => trail.eventIds.length > 0);
}
function eventMarkup(event: TimelineEvent, duration: number): string {
  const left = Math.min(98, (event.atMs / duration) * 100);
  const trailIds = event.trailIds?.join(',') ?? '';
  return `<button class="event ${event.status}" style="left:${left}%" data-event-id="${event.id}" data-trails="${trailIds}" title="${escapeHtml(event.detail)}">${escapeHtml(event.title)}</button>`;
}
function trailMarkup(
  trail: Trail,
  duration: number,
  lanes: Lane[],
  events: TimelineEvent[],
): string {
  const points = trail.eventIds
    .map((eventId) => {
      const event = events[eventId];
      return `${Math.min(98, (event.atMs / duration) * 100)},${lanes.indexOf(event.lane) * 58 + 29}`;
    })
    .join(' ');
  const markers = trail.eventIds
    .map((eventId) => {
      const event = events[eventId];
      const x = Math.min(98, (event.atMs / duration) * 100);
      const y = lanes.indexOf(event.lane) * 58 + 29;
      return `<circle cx="${x}" cy="${y}" r="3" fill="${trail.color}"/>`;
    })
    .join('');
  return `<g class="trail-path" data-trail-id="${trail.id}" data-status="${trail.status}"><polyline points="${points}" fill="none" stroke="${trail.color}" stroke-width="0.45" vector-effect="non-scaling-stroke"/>${markers}</g>`;
}
function html(
  manifest: Manifest,
  events: TimelineEvent[],
  replay: ReplayFrame[],
  trails: Trail[],
): string {
  const duration = Math.max(manifest.durationMs ?? 0, ...events.map((event) => event.atMs), 1);
  const lanes: Lane[] = ['experience', 'server', 'engine', 'evidence', 'diagnostics'];
  const data = JSON.stringify({ manifest, events, replay, trails }).replaceAll('<', '\\u003c');
  const tracks = lanes
    .map(
      (lane) =>
        `<section class="lane"><h2>${lane}</h2><div class="track">${events
          .filter((e) => e.lane === lane)
          .map((e) => eventMarkup(e, duration))
          .join('')}</div></section>`,
    )
    .join('');
  const metric = (name: string, value: string | number | undefined) =>
    `<div><dt>${name}</dt><dd>${value ?? '—'}</dd></div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Phalanx Duel — Panoramic View</title><style>
:root{color-scheme:dark;--ink:#e8eef2;--muted:#91a2ac;--line:#29404b;--bg:#071015;--panel:#0d1b22;--accent:#e2a93b}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 50% 0,#17323d,var(--bg) 55%);color:var(--ink);font:14px/1.45 ui-monospace,monospace}main{max-width:1500px;margin:auto;padding:28px}header{border-bottom:1px solid var(--line);padding-bottom:18px}h1{font:900 30px system-ui;margin:0}h1 small{display:block;color:var(--accent);font:12px monospace;margin-top:6px}.subtitle,.legend{color:var(--muted);margin-top:8px}dl{display:flex;flex-wrap:wrap;gap:8px 24px;margin:22px 0}.metric{min-width:120px}dt{color:var(--muted);font-size:11px;text-transform:uppercase}dd{margin:2px 0;color:var(--accent);font-size:18px}.controls{display:flex;gap:12px;align-items:center;margin:18px 0}.control{background:var(--panel);border:1px solid var(--line);color:var(--ink);padding:8px 12px;cursor:pointer}input{flex:1;accent-color:var(--accent)}.timeline{border:1px solid var(--line);background:#050c10aa;padding:15px;overflow:hidden}.lane{display:grid;grid-template-columns:125px minmax(650px,1fr);min-height:58px;border-bottom:1px solid #29404b88}.lane:last-child{border:0}h2{color:var(--muted);font-size:12px;text-transform:uppercase;text-align:right;margin:18px 15px 0 0}.track{position:relative;min-height:58px;background:linear-gradient(90deg,transparent 49.9%,#29404b55 50%,transparent 50.1%)}.track:after{content:"";position:absolute;left:0;right:0;top:29px;border-top:1px solid var(--line)}.event{position:absolute;top:10px;z-index:2;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:1px solid;border-radius:3px;padding:5px 7px;cursor:pointer;font:10px monospace}.observed{background:#143b42;border-color:#2e9b9d;color:#c9f2ed}.unknown{background:#463524;border-color:#b68138;color:#ffe1a2}.absence{background:#292e32;border-color:#66737a;color:#c3cbd0}.playhead{position:absolute;top:0;bottom:0;width:2px;background:#ffcf59;z-index:3;pointer-events:none}.detail{min-height:48px;border-left:3px solid var(--accent);padding:10px 12px;margin-top:15px;background:var(--panel)}@media(max-width:800px){main{padding:16px}.lane{grid-template-columns:85px 1fr}h2{font-size:10px}.event{max-width:120px}}
</style></head><body><main><header><h1>PHALANX DUEL<small>ELECTRIC PANORAMIC · RUNTIME REALITY</small></h1><div class="subtitle">One scenario interwoven across experience, server, engine, evidence, and diagnostics.</div></header><dl>${metric('status', manifest.status)}${metric('seed', manifest.seed)}${metric('turns', manifest.turnCount)}${metric('actions', manifest.actionCount)}${metric('duration', `${manifest.durationMs ?? 0} ms`)}${metric('replay frames', replay.length)}${metric('screenshots', manifest.screenshotCount ?? manifest.screenshots?.length)}</dl><div class="controls"><button class="control" id="play" type="button">▶ play sweep</button><input id="scrub" type="range" min="0" max="${duration}" value="0"><output id="clock">0 ms</output></div><div class="timeline" id="timeline"><div class="playhead" id="playhead"></div>${tracks}</div><div class="detail" id="detail">Select an event or start the sweep.</div><div class="legend">Observed evidence is green. Unknown or incomplete evidence is amber; absence is gray.</div></main><script>const D=${data},duration=${duration},scrub=document.getElementById('scrub'),head=document.getElementById('playhead'),clock=document.getElementById('clock'),detail=document.getElementById('detail');let playing=false,offset=0,started=0;function select(id){const e=D.events.find(x=>x.id===id);if(e)detail.innerHTML='<strong>'+e.title+'</strong> · '+e.detail+' <em>['+e.source+']</em>'}function draw(v){const n=Number(v);scrub.value=String(n);head.style.left=(n/duration*100)+'%';clock.textContent=Math.round(n)+' ms';const e=D.events.filter(x=>x.atMs<=n).at(-1);if(e)select(e.id)}document.getElementById('timeline').addEventListener('click',e=>{const t=e.target.closest('[data-event-id]');if(t)select(Number(t.dataset.eventId))});scrub.addEventListener('input',e=>draw(e.target.value));document.getElementById('play').addEventListener('click',()=>{playing=!playing;document.getElementById('play').textContent=playing?'⏸ pause':'▶ play sweep';if(playing){offset=Number(scrub.value);started=performance.now();requestAnimationFrame(step)}});function step(now){if(!playing)return;const n=offset+(now-started)*1.4;if(n>=duration){draw(duration);playing=false;document.getElementById('play').textContent='▶ play sweep';return}draw(n);requestAnimationFrame(step)}draw(0);</script></body></html>`;
}
function decoratePanoramicHtml(
  rendered: string,
  trails: Trail[],
  events: TimelineEvent[],
  duration: number,
  lanes: Lane[],
): string {
  const trailHeight = lanes.length * 58;
  const trailControls = trails
    .map(
      (trail) =>
        `<button class="trail-control ${trail.status}" data-trail-id="${trail.id}" title="${escapeHtml(trail.description)}"><span class="trail-swatch" style="background:${trail.color}"></span>${escapeHtml(trail.label)}</button>`,
    )
    .join('');
  const trailPaths = trails.map((trail) => trailMarkup(trail, duration, lanes, events)).join('');
  const trailScript = `document.querySelector('.trail-bar').addEventListener('click',e=>{const t=e.target.closest('[data-trail-id]');if(!t)return;const trail=D.trails.find(x=>x.id===t.dataset.trailId);if(!trail)return;document.querySelectorAll('[data-trail-id]').forEach(x=>x.classList.toggle('active',x.dataset.trailId===trail.id));document.querySelectorAll('.event').forEach(x=>x.classList.toggle('trail-focus',trail.eventIds.includes(Number(x.dataset.eventId))));detail.innerHTML='<strong>'+trail.label+'</strong> · '+trail.description+' <em>['+trail.lanes.join(' → ')+']</em>'});`;
  return rendered
    .replace(
      '</style>',
      '.trail-bar{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.trail-control{background:var(--panel);border:1px solid var(--line);color:var(--muted);padding:7px 9px;cursor:pointer;font:11px monospace}.trail-control.active,.trail-control:hover{color:var(--ink);border-color:var(--accent)}.trail-swatch{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px}.timeline{position:relative}.trail-overlay{position:absolute;left:140px;right:15px;top:15px;width:calc(100% - 155px);height:' +
        trailHeight +
        'px;z-index:1;pointer-events:none;opacity:.28}.trail-path{transition:opacity .15s}.trail-path.active{opacity:1;filter:drop-shadow(0 0 4px currentColor)}.event.trail-focus{box-shadow:0 0 0 2px var(--accent),0 0 14px var(--accent);z-index:4}</style>',
    )
    .replace(
      '<div class="timeline" id="timeline"><div class="playhead"',
      '<nav class="trail-bar" aria-label="Panoramic trails">' +
        trailControls +
        '</nav><div class="timeline" id="timeline"><svg class="trail-overlay" viewBox="0 0 100 ' +
        trailHeight +
        '" preserveAspectRatio="none" aria-hidden="true">' +
        trailPaths +
        '</svg><div class="playhead"',
    )
    .replace('Select an event or start the sweep.', 'Select an event, trail, or start the sweep.')
    .replace('draw(0);</script>', trailScript + 'draw(0);</script>');
}
function scenarioReport(
  manifest: Manifest,
  events: CaptureEvent[],
  replay: ReplayFrame[],
  trails: Trail[],
): string {
  const phases = [
    ...new Set(events.map((event) => event.detail.match(/phase=([A-Z_]+)/)?.[1]).filter(Boolean)),
  ];
  const actionEvents = events.filter((event) => event.type === 'action');
  const stateEvents = events.filter((event) => event.type === 'state');
  const unknowns = [
    manifest.status === 'failure'
      ? `Harness classified the run as ${manifest.failureReason ?? 'failure'}: ${manifest.failureMessage ?? 'no message'}`
      : null,
    manifest.o2Correlation
      ? null
      : 'An exported O2 query result is not embedded in this capture; collector emission must be verified separately.',
  ].filter((value): value is string => value !== null);
  const list = (items: string[]) =>
    items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- None recorded';
  return `# Phalanx Duel Scenario Report

Generated from the captured run; this report describes observed evidence and
does not infer facts that the capture did not record.

## Run identity

| Field | Value |
| --- | --- |
| Status | ${manifest.status ?? 'unknown'} |
| Seed | ${manifest.seed ?? 'unknown'} |
| QA run ID | ${manifest.qaRunId ?? 'unknown'} |
| Match ID | ${manifest.matchId ?? 'unknown'} |
| Duration | ${manifest.durationMs ?? 0} ms |
| Turns | ${manifest.turnCount ?? 'unknown'} |
| Actions | ${manifest.actionCount ?? 'unknown'} |
| Event records | ${events.length} |
| Replay frames | ${replay.length} |
| Screenshots | ${manifest.screenshotCount ?? manifest.screenshots?.length ?? 0} |

## Discrete flow coverage

| Flow | Observed evidence |
| --- | --- |
| Experience actions | ${actionEvents.length} action records |
| Server state updates | ${stateEvents.length} state records |
| Engine transitions | ${actionEvents.length} derived application boundaries |
| Replay/evidence | ${replay.length} frames |
| Phases | ${phases.join(', ') || 'none recorded'} |

## Derived match fingerprint

- Action-to-state ratio: ${stateEvents.length > 0 ? (actionEvents.length / stateEvents.length).toFixed(2) : 'not available'}.
- Screenshot coverage: ${manifest.screenshots?.length ?? manifest.screenshotCount ?? 0} checkpoints.
- Terminal evidence: ${replay.at(-1)?.phase ?? 'not recorded'}.
- O2 correlation: ${manifest.o2Correlation ? `attached (${manifest.o2Correlation.file ?? 'o2-correlation.json'})` : 'not attached; local collector emission was enabled'}.

## Marked panoramic trails

${trails.map((trail) => `- **${trail.label}** (${trail.status}): ${trail.description}; layers: ${trail.lanes.join(' → ')}; marked events: ${trail.eventIds.length}.`).join('\n') || '- None recorded'}

## Unknowns and follow-up

${list(unknowns)}

## Reproduction

\`\`\`bash
pnpm qa:panoramic -- --run <this-run-directory>
\`\`\`

The companion \`panoramic-view.html\` is the temporal map; this report is the
compact written index of the same run.
`;
}
async function main(): Promise<void> {
  const manifest = await readJson<Manifest>(join(runDir, 'manifest.json'));
  const lines = (await readFile(join(runDir, 'events.ndjson'), 'utf8')).split('\n').filter(Boolean);
  const events = lines.map((line) => JSON.parse(line) as CaptureEvent);
  const replay = await readJson<ReplayFrame[]>(join(runDir, 'replay_frames.json'));
  try {
    manifest.o2Correlation = await readJson<O2Correlation>(join(runDir, 'o2-correlation.json'));
  } catch {
    // O2 attachment is optional; the report preserves this as an explicit unknown.
  }
  const evidence = canonicalizeLegacyRun(manifest, events, 'replay_frames.json');
  const timelineEvents = normalize(events, manifest, replay);
  const trails = deriveTrails(timelineEvents);
  const lanes: Lane[] = ['experience', 'server', 'engine', 'evidence', 'diagnostics'];
  const duration = Math.max(
    manifest.durationMs ?? 0,
    ...timelineEvents.map((event) => event.atMs),
    1,
  );
  await writeFile(join(runDir, 'run-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  await writeFile(
    outputPath,
    decoratePanoramicHtml(
      html(manifest, timelineEvents, replay, trails),
      trails,
      timelineEvents,
      duration,
      lanes,
    ),
  );
  await writeFile(
    join(resolve(outputPath, '..'), 'scenario-report.md'),
    scenarioReport(manifest, events, replay, trails),
  );
  console.log(`Panoramic View: ${outputPath}`);
  console.log(`Scenario report: ${join(resolve(outputPath, '..'), 'scenario-report.md')}`);
}
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
