// Assemble the narrated Phalanx Duel demo from:
//   scripts/video/demo-narration.md      the voiceover script + title-card text
//   scripts/video/build/footage.json     raw footage + phase spans (from record-demo.mjs)
//
//   node scripts/video/build-demo.mjs
//
// Produces:
//   output/video/phalanx-duel-demo.mp4     H.264 / AAC, shareable
//   output/video/phalanx-duel-demo.webm    VP9 / Opus
//   output/video/phalanx-duel-demo.vtt     captions, one cue per narration segment
//
// Voice: macOS `say` with "Zoe (Premium)" (must be installed:
// System Settings, Accessibility, Spoken Content, System Voice, Manage Voices).
// Title cards are rendered with headless Chromium, so no ffmpeg drawtext needed.

import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
const BUILD = join(here, 'build');
const SEG = join(BUILD, 'seg');
const NARRATION = join(here, 'demo-narration.md');
const FOOTAGE = join(BUILD, 'footage.json');
const OUT_DIR = join(repoRoot, 'output/video');
const QUICKSTART_PDF = join(repoRoot, 'output/pdf/phalanx-duel-face-to-face-quickstart.pdf');

const W = 1280;
const H = 800;
const FPS = 30;
const CARD_SECS = 1.9; // title card hold at the head of each segment
const LEAD_SECS = 0.35; // silence before narration starts in a segment
const TAIL_SECS = 0.5; // footage after narration ends

const VOICE = 'Zoe (Premium)';

if (!existsSync(FOOTAGE)) {
  console.error(
    `missing ${FOOTAGE} — run: node scripts/video/record-demo.mjs [--from-screenshots <dir>]`,
  );
  process.exit(1);
}

const footage = JSON.parse(await readFile(FOOTAGE, 'utf8'));
const { cues, front } = parseNarration(await readFile(NARRATION, 'utf8'));

await rm(SEG, { recursive: true, force: true });
await mkdir(SEG, { recursive: true });
await mkdir(OUT_DIR, { recursive: true });

// suits scene uses the printed quickstart's combat page as a still.
const SUITS_STILL = join(BUILD, 'suits-still.png');
if (!existsSync(SUITS_STILL) && existsSync(QUICKSTART_PDF)) {
  await exec('gs', [
    '-sDEVICE=png16m',
    '-r150',
    '-dFirstPage=2',
    '-dLastPage=2',
    '-o',
    SUITS_STILL,
    '-dNOPAUSE',
    '-dBATCH',
    QUICKSTART_PDF,
  ]).catch(() => {});
}

const { chromium } = await import('@playwright/test');
const browser = await chromium.launch({ headless: true });
const cardPage = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 2,
});

const segFiles = [];
const vtt = ['WEBVTT', ''];
let timeline = 0;

for (let i = 0; i < cues.length; i++) {
  const cue = cues[i];
  const tag = String(i).padStart(2, '0');

  // 1. narration audio
  const wav = join(SEG, `n${tag}.wav`);
  const spoken = applyLexicon(oneLine(cue.text), front.pronunciation);
  const aiff = join(SEG, `n${tag}.aiff`);
  await exec('say', ['-v', VOICE, '-o', aiff, spoken]);
  await exec('ffmpeg', ['-y', '-i', aiff, '-ar', '48000', '-ac', '2', wav]);
  const speech = await duration(wav);

  // 2. title card
  const cardPng = join(SEG, `c${tag}.png`);
  await renderCard(cardPage, cue, `${i + 1} / ${cues.length}`, cardPng);

  // 3. segment layout: card for CARD_SECS, then content; narration always
  //    starts at CARD_SECS + LEAD_SECS and the content runs long enough to hold it.
  const cardOnly = cue.scene === 'title' || cue.scene === 'outro';
  const contentSecs = Math.max(cardOnly ? 0.6 : 1, LEAD_SECS + speech + TAIL_SECS);
  const footSecs = cardOnly ? 0 : contentSecs;
  const segSecs = CARD_SECS + contentSecs;

  // 4. video: card hold, then footage (or extended card hold for card-only cues)
  const cardClip = join(SEG, `cv${tag}.webm`);
  await exec('ffmpeg', [
    '-y',
    '-loop',
    '1',
    '-t',
    String(cardOnly ? segSecs : CARD_SECS),
    '-i',
    cardPng,
    '-vf',
    `scale=${W}:${H},fps=${FPS},format=yuv420p`,
    '-an',
    '-c:v',
    'libvpx-vp9',
    '-b:v',
    '0',
    '-crf',
    '30',
    cardClip,
  ]);

  const parts = [cardClip];
  if (!cardOnly) {
    const foot = join(SEG, `fv${tag}.webm`);
    await footageClip(cue.scene, footSecs, foot);
    parts.push(foot);
  }

  // 5. concat video parts
  const vlist = join(SEG, `v${tag}.txt`);
  await writeFile(vlist, parts.map((p) => `file '${p}'`).join('\n') + '\n');
  const segVideo = join(SEG, `sv${tag}.webm`);
  await exec('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', vlist, '-c', 'copy', segVideo]);

  // 6. mux narration (delayed, padded to segment length)
  const seg = join(SEG, `seg${tag}.webm`);
  await exec('ffmpeg', [
    '-y',
    '-i',
    segVideo,
    '-i',
    wav,
    '-filter_complex',
    `[1:a]adelay=${Math.round((CARD_SECS + LEAD_SECS) * 1000)}|${Math.round((CARD_SECS + LEAD_SECS) * 1000)},apad[a]`,
    '-map',
    '0:v',
    '-map',
    '[a]',
    '-t',
    String(segSecs),
    '-c:v',
    'copy',
    '-c:a',
    'libopus',
    '-b:a',
    '96k',
    seg,
  ]);
  segFiles.push(seg);

  // 7. caption for this segment (narration window only)
  const start = timeline + CARD_SECS + LEAD_SECS;
  vtt.push(`${vttTime(start)} --> ${vttTime(start + speech)}`, oneLine(cue.text), '');
  timeline += segSecs;
}

await cardPage.close();
await browser.close();

// concat all segments
const list = join(BUILD, 'segments.txt');
await writeFile(list, segFiles.map((p) => `file '${p}'`).join('\n') + '\n');
const webmOut = join(OUT_DIR, 'phalanx-duel-demo.webm');
await exec('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', webmOut]);

// mp4 for sharing
const mp4Out = join(OUT_DIR, 'phalanx-duel-demo.mp4');
await exec('ffmpeg', [
  '-y',
  '-i',
  webmOut,
  '-c:v',
  'libx264',
  '-preset',
  'slow',
  '-crf',
  '20',
  '-pix_fmt',
  'yuv420p',
  '-c:a',
  'aac',
  '-b:a',
  '160k',
  '-movflags',
  '+faststart',
  mp4Out,
]);

await writeFile(join(OUT_DIR, 'phalanx-duel-demo.vtt'), vtt.join('\n') + '\n');

console.log(`\n[build-demo] ${(timeline / 60).toFixed(1)} min`);
for (const f of [mp4Out, webmOut, join(OUT_DIR, 'phalanx-duel-demo.vtt')]) console.log(`  ${f}`);

// ---------------------------------------------------------------- helpers

async function footageClip(scene, secs, out) {
  const spans = footage.phases;
  const pick = {
    deployment: () => spans.find((s) => s.phase === 'deployment'),
    turn: () => spans.find((s) => s.phase === 'turn') || spans.find((s) => s.phase === 'combat'),
    attack: () => longest(spans.filter((s) => s.phase === 'combat')),
    combat: () => longest(spans.filter((s) => s.phase === 'combat')),
    reinforce: () => spans.find((s) => s.phase === 'reinforce'),
    winning: () => [...spans].reverse().find((s) => s.phase === 'combat'),
    suits: () => null,
  }[scene]?.();

  if (scene === 'suits' && existsSync(SUITS_STILL)) {
    await exec('ffmpeg', [
      '-y',
      '-loop',
      '1',
      '-t',
      String(secs),
      '-i',
      SUITS_STILL,
      '-vf',
      `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x0f172a,fps=${FPS},format=yuv420p`,
      '-an',
      '-c:v',
      'libvpx-vp9',
      '-b:v',
      '0',
      '-crf',
      '30',
      out,
    ]);
    return;
  }

  // Phase spans mark where a phase begins; footage runs continuously, so pull
  // `secs` of motion from the span start rather than stopping at span end.
  const totalS = footage.durationMs / 1000;
  const span = pick || spans[0];
  let startS = Math.max(0, span.startMs / 1000);
  if (scene === 'winning') startS = Math.max(0, totalS - secs - 1.5);
  const take = Math.min(secs, Math.max(0.5, totalS - startS));
  const freeze = secs - take;
  const vf = [
    `scale=${W}:${H}:force_original_aspect_ratio=decrease`,
    `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x0f172a`,
    `fps=${FPS}`,
    freeze > 0.05 ? `tpad=stop_mode=clone:stop_duration=${freeze.toFixed(2)}` : null,
    'format=yuv420p',
  ]
    .filter(Boolean)
    .join(',');
  await exec('ffmpeg', [
    '-y',
    '-ss',
    startS.toFixed(2),
    '-t',
    take.toFixed(2),
    '-i',
    footage.file,
    '-vf',
    vf,
    '-an',
    '-c:v',
    'libvpx-vp9',
    '-b:v',
    '0',
    '-crf',
    '30',
    out,
  ]);
}

function longest(list) {
  return list.sort((a, b) => b.endMs - b.startMs - (a.endMs - a.startMs))[0];
}

async function duration(file) {
  const { stdout } = await exec('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'csv=p=0',
    file,
  ]);
  return parseFloat(stdout.trim());
}

async function renderCard(context, cue, index, out) {
  const page = await context.newPage();
  await page.setContent(cardHtml(cue, index), { waitUntil: 'load' });
  await page.screenshot({ path: out });
  await page.close();
}

function cardHtml(cue, index) {
  const esc = (s) =>
    String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  return `<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden}
  body{background:#0f172a;color:#fffdf8;
    font-family:'Avenir Next','Helvetica Neue',Arial,sans-serif;
    display:flex;flex-direction:column;justify-content:center;padding:0 120px}
  .bar{position:absolute;top:0;left:0;right:0;height:10px;
    background:linear-gradient(90deg,#0f766e 0 68%,#d97706 68% 100%)}
  .idx{position:absolute;top:44px;right:56px;font-size:20px;letter-spacing:.22em;color:#8b96a5}
  .kicker{font-size:22px;letter-spacing:.34em;text-transform:uppercase;color:#4bb3a7;margin-bottom:26px}
  .title{font-size:76px;font-weight:700;line-height:1.05;max-width:14ch}
  .rule{margin-top:34px;width:120px;height:5px;background:#d97706;border-radius:3px}
</style><div class="bar"></div><div class="idx">${esc(index)}</div>
<div class="kicker">${esc(cue.kicker || 'Phalanx Duel')}</div>
<div class="title">${esc(cue.title || '')}</div><div class="rule"></div>`;
}

function applyLexicon(text, map) {
  let out = text;
  for (const [k, v] of Object.entries(map || {})) {
    out = out.replace(new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), v);
  }
  return out;
}

function oneLine(t) {
  return t.replace(/\s*\n\s*/g, ' ').trim();
}

function vttTime(s) {
  const ms = Math.round(s * 1000);
  const hh = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const mm = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  const mmm = String(ms % 1000).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${mmm}`;
}

// Parse frontmatter + `<!-- cue: id | kicker: "x" | title: "y" | scene: z -->` blocks.
function parseNarration(md) {
  const fm = md.match(/^---\n([\s\S]*?)\n---\n/);
  const front = { pronunciation: {} };
  if (fm) {
    let section = null;
    for (const raw of fm[1].split('\n')) {
      const m = raw.match(/^(\w[\w-]*):\s*(.*)$/);
      if (m && raw === raw.trimStart()) {
        section = null;
        if (m[1] === 'pronunciation' && m[2] === '') section = 'pronunciation';
        else front[m[1]] = m[2].replace(/^["']|["']$/g, '');
      } else if (section === 'pronunciation') {
        const p = raw.match(/^\s+([\w.-]+):\s*"?([^"]+)"?\s*$/);
        if (p) front.pronunciation[p[1]] = p[2];
      }
    }
  }

  const cues = [];
  const re = /<!--\s*cue:\s*([^|]+?)\s*((?:\|[^>]+?)*)-->\n([\s\S]*?)(?=\n<!--\s*cue:|\n#|\s*$)/g;
  let m;
  while ((m = re.exec(md))) {
    const meta = { id: m[1].trim(), scene: 'combat' };
    for (const pair of m[2].split('|')) {
      const kv = pair.match(/^\s*([\w-]+):\s*"?([^"]*?)"?\s*$/);
      if (kv) meta[kv[1]] = kv[2];
    }
    const text = m[3]
      .split('\n')
      .filter((l) => l.trim() && !l.startsWith('<!--'))
      .join('\n')
      .trim();
    if (text) cues.push({ ...meta, text });
  }
  if (!cues.length) throw new Error('no cues parsed from demo-narration.md');
  return { cues, front };
}
