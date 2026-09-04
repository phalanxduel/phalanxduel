// Record raw footage for the narrated Phalanx Duel demo.
//
//   node scripts/video/record-demo.mjs                       # live: drive the client, record a full game
//   node scripts/video/record-demo.mjs --from-screenshots <dir>   # offline: assemble footage from a playthrough screenshot dir
//
// Live mode needs the dev stack up (pnpm dev:server + pnpm dev:client, or a
// running client at --base-url). Offline mode needs only ffmpeg and a
// screenshot directory whose files are named  t<turn>_<phase>_<seq>_<kind>.png
// (the layout bin/qa/api-playthrough.ts writes under artifacts/).
//
// Output (both modes):
//   scripts/video/build/demo-raw.webm
//   scripts/video/build/footage.json   { file, durationMs, fps, phases: [{phase, startMs, endMs}] }
//
// build-demo.mjs consumes footage.json and never cares which mode produced it.

import { execFile } from 'node:child_process';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const BUILD = join(here, 'build');
const RAW = join(BUILD, 'demo-raw.webm');
const FOOTAGE = join(BUILD, 'footage.json');
const W = 1280;
const H = 800;
const FPS = 30;

const { values } = parseArgs({
  options: {
    'from-screenshots': { type: 'string' },
    'base-url': { type: 'string' },
    'starting-lp': { type: 'string', default: '8' },
    'max-turns': { type: 'string', default: '120' },
    help: { type: 'boolean', default: false },
  },
});

if (values.help) {
  console.log('see header of scripts/video/record-demo.mjs');
  process.exit(0);
}

await rm(BUILD, { recursive: true, force: true });
await mkdir(BUILD, { recursive: true });

if (values['from-screenshots']) {
  await fromScreenshots(resolve(values['from-screenshots']));
} else {
  await fromLive();
}

// ---------------------------------------------------------------- offline mode

// Group a playthrough screenshot dir into phase runs, render each run to a short
// clip, concat them. Deployment plays fast, combat and reinforce slower so the
// narration has something to sit against.
async function fromScreenshots(dir) {
  const shotDir = existsSync(join(dir, 'screenshots')) ? join(dir, 'screenshots') : dir;
  const files = (await readdir(shotDir)).filter((f) => f.endsWith('.png')).sort();
  if (!files.length) throw new Error(`no screenshots in ${shotDir}`);

  const phaseOf = (f) => {
    const m = f.match(/^t\d+_([a-z]+)(?:-col-\d)?_/i);
    const p = (m?.[1] ?? 'other').toLowerCase();
    if (p === 'terminated') return 'outro';
    if (p === 'combat') return 'combat';
    if (p === 'reinforce') return 'reinforce';
    if (p === 'deployment') return 'deployment';
    return 'combat';
  };
  const holdOf = (phase) => (phase === 'deployment' ? 0.32 : phase === 'reinforce' ? 0.62 : 0.9);

  // Collapse consecutive same-phase frames into runs.
  const runs = [];
  for (const f of files) {
    const phase = phaseOf(f);
    const last = runs[runs.length - 1];
    if (last && last.phase === phase) last.frames.push(f);
    else runs.push({ phase, frames: [f] });
  }

  const phases = [];
  const listPath = join(BUILD, 'concat.txt');
  const lines = [];
  let tMs = 0;
  let clipIdx = 0;

  for (const run of runs) {
    const hold = holdOf(run.phase);
    const clip = join(BUILD, `seg-${String(clipIdx++).padStart(3, '0')}.webm`);
    const frameList = join(BUILD, `frames-${clipIdx}.txt`);
    await writeFile(
      frameList,
      run.frames.map((f) => `file '${join(shotDir, f)}'\nduration ${hold}`).join('\n') +
        `\nfile '${join(shotDir, run.frames[run.frames.length - 1])}'\n`,
    );
    // scale+pad every still to the target frame, constant fps.
    await exec('ffmpeg', [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      frameList,
      '-vf',
      `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x0f172a,fps=${FPS},format=yuv420p`,
      '-an',
      '-c:v',
      'libvpx-vp9',
      '-b:v',
      '0',
      '-crf',
      '32',
      clip,
    ]);
    const durMs = Math.round(run.frames.length * hold * 1000);
    const merged = phases[phases.length - 1];
    if (merged && merged.phase === run.phase) merged.endMs = tMs + durMs;
    else phases.push({ phase: run.phase, startMs: tMs, endMs: tMs + durMs });
    tMs += durMs;
    lines.push(`file '${clip}'`);
  }

  await writeFile(listPath, lines.join('\n') + '\n');
  await exec('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', RAW]);
  await writeFile(
    FOOTAGE,
    JSON.stringify({ file: RAW, durationMs: tMs, fps: FPS, phases }, null, 2),
  );
  console.log(
    `[record-demo] offline footage: ${RAW}  (${(tMs / 1000).toFixed(1)}s, ${phases.length} phase spans)`,
  );
}

// ----------------------------------------------------------------- live mode

async function fromLive() {
  const { chromium } = await import('@playwright/test');
  const BASE_URL = values['base-url'] || process.env.PHALANX_BASE_URL || 'http://127.0.0.1:5173';
  const MAX_TURNS = Math.max(1, Number.parseInt(values['max-turns'], 10) || 120);

  const browser = await chromium.launch({ headless: true, slowMo: 120 });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    recordVideo: { dir: BUILD, size: { width: W, height: H } },
  });
  await context.addInitScript(() => {
    for (const k of [
      'phx_welcome_v1_seen',
      'phx_onboarding_deploy_seen',
      'phx_onboarding_combat_seen',
    ])
      localStorage.setItem(k, '1');
    localStorage.setItem('phx:helpOpen', 'false');
  });
  const page = await context.newPage();
  page.on('dialog', (d) => d.accept());

  const marks = [];
  let recStart = 0;
  const mark = (phase) => {
    const tMs = Date.now() - recStart;
    const last = marks[marks.length - 1];
    if (last && last.phase === phase) return;
    if (last) last.endMs = tMs;
    marks.push({ phase, startMs: tMs, endMs: tMs });
  };

  let completed = false;
  let videoPath;
  try {
    recStart = Date.now();
    await page.goto(BASE_URL);
    mark('title');

    const nameInput = page.locator('[data-testid="lobby-name-input"]');
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false))
      await nameInput.fill('DemoPlayer');
    await page.waitForSelector('[data-testid="lobby-bot-btn-easy"]', { timeout: 10000 });
    await page.waitForTimeout(1200);

    const advToggle = page.locator('[data-testid="advanced-options-toggle"]');
    if (await advToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await advToggle.click();
      const lp = page.locator('[data-testid="lobby-starting-lp"]');
      if (await lp.isVisible({ timeout: 2000 }).catch(() => false))
        await lp.fill(values['starting-lp']);
    }

    await page.click('[data-testid="lobby-bot-btn-easy"]');
    await page.waitForSelector('[data-testid="game-layout"]', { timeout: 15000 });
    await page.waitForTimeout(1200);

    for (let i = 0; i < MAX_TURNS; i++) {
      const phase =
        (await page
          .locator('[data-testid="game-layout"]')
          .getAttribute('data-phase')
          .catch(() => null)) || '';
      const over = await page
        .locator('[data-testid="game-over"], [data-phase="GameOver"]')
        .isVisible()
        .catch(() => false);
      if (over || /TERMINATED|GAMEOVER/i.test(phase)) {
        await page
          .waitForSelector('[data-testid="game-over"]', { state: 'visible', timeout: 60_000 })
          .catch(() => {});
        mark('outro');
        completed = true;
        await page.waitForTimeout(3500);
        break;
      }
      if (/deploy/i.test(phase)) mark('deployment');
      else if (/reinforce/i.test(phase)) mark('reinforce');
      else if (/attack|combat/i.test(phase)) mark(i < 4 ? 'turn' : 'combat');
      await playTurn(page, i);
    }
    if (!completed) throw new Error(`demo game did not finish in ${MAX_TURNS} turns`);
    const endMs = Date.now() - recStart;
    if (marks.length) marks[marks.length - 1].endMs = endMs;
    videoPath = await page.video()?.path();
  } finally {
    await context.close();
    await browser.close();
  }
  if (!videoPath) throw new Error('no video recorded');

  const { rename } = await import('node:fs/promises');
  await rename(videoPath, RAW);
  const durationMs = marks.length ? marks[marks.length - 1].endMs : 0;
  await writeFile(
    FOOTAGE,
    JSON.stringify({ file: RAW, durationMs, fps: FPS, phases: dedupe(marks) }, null, 2),
  );
  console.log(
    `[record-demo] live footage: ${RAW}  (${(durationMs / 1000).toFixed(1)}s, ${marks.length} phase spans)`,
  );
}

function dedupe(marks) {
  return marks.filter((m) => m.endMs - m.startMs > 400);
}

async function playTurn(page, idx) {
  const phaseText =
    (await page
      .locator('[data-testid="phase-indicator"]')
      .textContent({ timeout: 1500 })
      .catch(() => null)) || '';
  const p = phaseText.toLowerCase();

  if (p.includes('deploy')) {
    const cards = page.locator('.hand-card.playable');
    if ((await cards.count()) > 0) {
      await cards.first().click();
      await page.waitForTimeout(400);
      const t = page.locator('[data-testid^="player-cell-"].bf-cell.valid-target');
      if ((await t.count()) > 0) {
        await t.first().click();
        await page.waitForTimeout(1000);
      }
    }
    return;
  }
  if (p.includes('reinforce')) {
    const rc = page.locator('.hand-card.reinforce-playable');
    if ((await rc.count()) > 0) {
      await rc.first().click();
      await page.waitForTimeout(400);
      const t = page.locator(
        '.bf-cell.is-reinforce-col.valid-target, .bf-cell.reinforce-col.valid-target',
      );
      if ((await t.count()) > 0) {
        await t.first().click();
        await page.waitForTimeout(900);
        return;
      }
    }
    await clickCmd(page, 'combat-skip-reinforce-btn', 'SKIP');
    await page.waitForTimeout(700);
    return;
  }
  if (p.includes('attack') || p.includes('combat')) {
    const a = page.locator(
      '[data-qa-attackable="true"], [data-testid^="player-cell-r0-c"].bf-cell.attack-playable',
    );
    if ((await a.count()) > 0) {
      await a.first().click();
      await page.waitForTimeout(500);
      const t = page.locator('[data-testid^="opponent-cell-r0-c"].bf-cell.valid-target').first();
      if ((await t.count()) > 0) {
        await t.click();
        await page.waitForTimeout(2000);
        return;
      }
    }
    await clickCmd(page, 'combat-pass-btn', 'PASS');
    await page.waitForTimeout(700);
  }
}

async function clickCmd(page, testId, label) {
  const drawer = page.locator('.phx-command-drawer').first();
  if (await drawer.isVisible().catch(() => false)) {
    const open = await drawer.evaluate((el) => el.classList.contains('is-open')).catch(() => true);
    if (!open)
      await page
        .locator('.phx-drawer-handle')
        .first()
        .click()
        .catch(() => {});
    await page.waitForTimeout(150);
  }
  await page
    .locator(`[data-testid="${testId}"], .phx-drawer-content button:has-text("${label}")`)
    .first()
    .click({ timeout: 1500 })
    .catch(() => {});
}
