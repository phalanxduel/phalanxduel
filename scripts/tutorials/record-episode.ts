/**
 * scripts/tutorials/record-episode.ts
 *
 * Deterministic Playwright recorder for Phalanx Duel tutorial episodes (16:9 and 9:16).
 *
 * Usage:
 *   pnpm tutorial:record ep-01-welcome-and-objective [--base-url http://127.0.0.1:5173]
 */

import { chromium, type Page } from '@playwright/test';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { FORMAT_PROFILES, TutorialEpisodeScenarioSchema, type TutorialCueStep } from './schema.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');

interface RecordedCueSpan {
  id: string;
  label: string;
  startMs: number;
  endMs: number;
  keyframe: string;
}

async function runStep(page: Page, step: TutorialCueStep, baseUrl: string, playerName: string) {
  switch (step.action) {
    case 'goto': {
      const target = new URL(step.urlPath ?? '/', baseUrl).toString();
      await page.goto(target, { waitUntil: 'networkidle' });
      break;
    }
    case 'fill': {
      if (step.selector && step.value !== undefined) {
        await page.waitForSelector(step.selector, { timeout: 10_000 });
        await page.fill(step.selector, step.value);
      }
      break;
    }
    case 'click': {
      if (step.selector) {
        await page.waitForSelector(step.selector, { timeout: 10_000 });
        await page.click(step.selector);
      }
      break;
    }
    case 'waitForSelector': {
      if (step.selector) {
        await page.waitForSelector(step.selector, { timeout: 15_000 });
      }
      break;
    }
    case 'quickStart': {
      const nameInput = page.locator('#phx-lobby-name-input');
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill(playerName);
      }
      await page.click('#phx-lobby-quick-start-btn');
      await page.waitForSelector('#phx-phase-indicator', { timeout: 15_000 });
      break;
    }
    case 'deployFirstCard': {
      const handCard = page.locator('[id^="phx-card-hand-"]').first();
      await handCard.waitFor({ state: 'visible', timeout: 10_000 });
      await handCard.click();
      const targetCell = page.locator('#phx-cell-0-0');
      await targetCell.waitFor({ state: 'visible', timeout: 10_000 });
      await targetCell.click();
      break;
    }
    case 'highlight':
    case 'screenshot':
    case 'hold':
    default:
      break;
  }

  if (step.holdMs > 0) {
    await page.waitForTimeout(step.holdMs);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2).filter((a) => a !== '--');
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      'base-url': {
        type: 'string',
        default: process.env.PHALANX_BASE_URL ?? 'http://127.0.0.1:5173',
      },
      help: { type: 'boolean', default: false },
    },
  });

  const episodeId = positionals[0];
  if (values.help || !episodeId) {
    console.log('Usage: pnpm tutorial:record <episode-id> [--base-url http://127.0.0.1:5173]');
    process.exit(episodeId ? 0 : 1);
  }

  const scenarioPath = resolve(here, 'scenarios', `${episodeId}.json`);
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const raw = JSON.parse(await readFile(scenarioPath, 'utf8')) as unknown;
  const spec = TutorialEpisodeScenarioSchema.parse(raw);
  const profile = FORMAT_PROFILES[spec.format];

  const outDir = resolve(repoRoot, 'artifacts/tutorials', spec.id);
  const keyframeDir = join(outDir, 'keyframes');
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await mkdir(keyframeDir, { recursive: true });

  console.log(
    `[tutorial:record] Recording ${spec.id} (${spec.format}, ${profile.viewportWidth}x${profile.viewportHeight} -> ${profile.outputWidth}x${profile.outputHeight})`,
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: profile.viewportWidth, height: profile.viewportHeight },
    recordVideo: {
      dir: outDir,
      size: { width: profile.viewportWidth, height: profile.viewportHeight },
    },
  });

  const page = await context.newPage();
  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  const startedAt = Date.now();
  const recordedCues: RecordedCueSpan[] = [];

  try {
    for (const step of spec.cues) {
      const startMs = Date.now() - startedAt;
      await runStep(page, step, values['base-url'], spec.playerName);
      const keyframeName = `${step.id}.png`;
      await page.screenshot({ path: join(keyframeDir, keyframeName) });
      const endMs = Date.now() - startedAt;
      recordedCues.push({
        id: step.id,
        label: step.label,
        startMs,
        endMs,
        keyframe: `keyframes/${keyframeName}`,
      });
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const video = page.video();
  const rawVideoPath = join(outDir, 'raw.webm');
  if (video) {
    const tmpPath = await video.path();
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await rename(tmpPath, rawVideoPath);
  }

  const durationMs = Date.now() - startedAt;
  const footageManifest = {
    episodeId: spec.id,
    format: spec.format,
    renderFormat: spec.format === '9:16' ? 'short' : 'longform',
    file: rawVideoPath,
    durationMs,
    fps: profile.fps,
    outputResolution: { width: profile.outputWidth, height: profile.outputHeight },
    phases: recordedCues.map((c) => ({
      phase: c.id,
      label: c.label,
      startMs: c.startMs,
      endMs: c.endMs,
      keyframe: c.keyframe,
    })),
  };

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await writeFile(join(outDir, 'footage.json'), JSON.stringify(footageManifest, null, 2) + '\n');
  console.log(
    `[tutorial:record] Saved ${rawVideoPath} + footage.json (${recordedCues.length} cues)`,
  );
}

await main();
