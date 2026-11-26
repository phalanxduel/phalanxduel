import { chromium, expect as playwrightExpect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { randomBytes } from 'node:crypto';
import { GameAutomator } from '../../bin/qa/game-automator.js';
import { TutorialTerminal } from './tutorial-terminal.js';
import {
  FORMAT_PROFILES,
  TutorialEpisodeScenarioSchema,
  type TutorialAction,
  type TutorialEpisodeScenario,
} from './schema.js';

const expect = playwrightExpect.configure({ timeout: 20_000 });
const here = dirname(fileURLToPath(import.meta.url));
const arena = '[data-testid="game-layout"]';
const testId = (id: string) => `[data-testid="${id}"]`;
const hand = '[data-testid^="hand-card-"]';
const passiveOverlay =
  '.phx-modal-overlay, .cinematic-modal, .cinematic-overlay, .pz-splash-overlay, .nr-overlay, .help-overlay';
const uiError = '.error-banner, .toast-error';

function isAllowedCaptureHost(hostname: string): boolean {
  return (
    hostname === '127.0.0.1' ||
    hostname === 'localhost' ||
    hostname === 'lan.phalanxduel.com' ||
    hostname.endsWith('.lan.phalanxduel.com') ||
    hostname.endsWith('.phalanxduel.localhost')
  );
}

async function open(page: Page, url: URL): Promise<void> {
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  if (url.pathname !== '/') {
    await expect(page.locator('body')).toBeVisible();
    return;
  }
  await expect(page.locator('#app > *').first()).toBeVisible();
  const loadsAnotherScreen = ['action', 'match', 'matchId', 'watch', 'screen', 'profile'].some(
    (key) => url.searchParams.has(key),
  );
  if (!loadsAnotherScreen) {
    await expect(page.getByTestId('lobby-quick-match-btn')).toBeEnabled();
  }
}

async function runAction(
  page: Page,
  bot: GameAutomator,
  step: TutorialAction,
  baseUrl: string,
  spec: TutorialEpisodeScenario,
  terminal: TutorialTerminal,
): Promise<void> {
  const target = page.locator(step.selector ?? 'body').first();
  switch (step.action) {
    case 'goto': {
      const url = new URL(step.urlPath ?? '/', baseUrl);
      if (url.origin !== new URL(baseUrl).origin)
        throw new Error('Capture URL must stay same-origin');
      if (step.value === 'fresh') {
        await page.evaluate(() => sessionStorage.removeItem('phalanx_session'));
      }
      if (url.pathname === '/') {
        url.searchParams.set('seed', String(spec.seed));
      }
      await open(page, url);
      break;
    }
    case 'fill':
      await target.fill(step.value ?? '');
      break;
    case 'select':
      await target.selectOption(step.value ?? '');
      break;
    case 'click':
      await bot.clickTarget(target);
      break;
    case 'waitForSelector':
    case 'screenshot':
      await expect(target).toBeVisible();
      break;
    case 'highlight':
      await target.scrollIntoViewIfNeeded();
      await target.hover();
      break;
    case 'quickStart':
      await bot.startMatch({
        playerName: spec.playerName,
        mode: step.value ?? spec.mode,
        startingLp: spec.startingLp,
        startTestId: step.selector ?? 'lobby-quick-match-btn',
      });
      break;
    case 'deployFirstCard':
      await bot.deployFirstCard();
      break;
    case 'selectAttack': {
      if (!step.selector) throw new Error('selectAttack requires a forecast selector');
      if (step.value === 'searchTurns') {
        let matched = false;
        const attack = page.locator('[data-testid="player-battlefield"] .attack-playable').first();
        const reinforce = page.locator('[data-testid^="hand-card-"].reinforce-playable').first();
        const skip = page.getByTestId('inline-skip-reinforce-btn');
        const pass = page.getByTestId('inline-pass-btn');
        const end = page.getByTestId('game-over');
        for (let attempt = 0; attempt < 35; attempt++) {
          await expect(attack.or(reinforce).or(skip).or(pass).or(end).first()).toBeVisible({
            timeout: 15_000,
          });
          if (await end.isVisible()) break;
          if (await reinforce.isVisible()) {
            await bot.reinforceFirst();
            continue;
          }
          if (await skip.isVisible()) {
            await bot.clickTarget(skip);
            continue;
          }
          if (await attack.isVisible()) {
            try {
              await bot.selectAttackWithForecast(step.selector);
              matched = true;
              break;
            } catch {
              await bot.attackFirst();
              continue;
            }
          }
          if (await pass.isVisible()) {
            await bot.clickTarget(pass);
          }
        }
        if (!matched) {
          throw new Error(`No legal attack matching ${step.selector} found within 35 turns`);
        }
        break;
      }
      await bot.selectAttackWithForecast(step.selector);
      break;
    }
    case 'attack':
      await bot.attackFirst(step.selector, step.value);
      break;
    case 'reinforce':
      await bot.reinforceFirst();
      break;
    case 'joinOpponent': {
      const code = await bot.getWaitingMatchId();
      const browser = page.context().browser();
      if (!browser) throw new Error('No browser for the second player');
      const guest = await browser.newPage({ viewport: page.viewportSize() });
      const guestBot = new GameAutomator(guest, { hoverDelayMs: 280 });
      await open(guest, new URL('/', baseUrl));
      await guestBot.enterGuestOperativeId('TutorialRival');
      const invite = new URL('/', baseUrl);
      invite.searchParams.set('action', 'join');
      invite.searchParams.set('match', code);
      await guest.goto(invite.toString(), { waitUntil: 'domcontentloaded' });
      await expect(page.locator(arena)).toBeVisible();
      if (step.value === 'ensurePlayerTurn') {
        const localCard = page.locator(`${hand}.playable`).first();
        const remoteCard = guest.locator(`${hand}.playable`).first();
        const localStarts = await Promise.race([
          localCard.waitFor({ state: 'visible' }).then(() => true),
          remoteCard.waitFor({ state: 'visible' }).then(() => false),
        ]);
        if (!localStarts) await guestBot.deployFirstCard();
      }
      break;
    }
    case 'watchMatch': {
      const matchId = await page.locator(arena).getAttribute('data-match-id');
      if (!matchId) throw new Error('No live match to watch');
      await open(page, new URL(`/?watch=${matchId}`, baseUrl));
      await expect(page.locator(`${arena}[data-spectator="true"]`)).toBeVisible();
      break;
    }
    case 'reconnect': {
      const matchId = await page.locator(arena).getAttribute('data-match-id');
      if (!matchId) throw new Error('No match to reconnect to');
      await open(page, new URL(`/?match=${matchId}`, baseUrl));
      await expect(page.locator(arena)).toHaveAttribute('data-match-id', matchId);
      break;
    }
    case 'registerDemo': {
      if (!isAllowedCaptureHost(new URL(baseUrl).hostname)) {
        throw new Error('Demo accounts may only be created on loopback or local LAN hosts');
      }
      await bot.clickTarget(page.getByTestId('userbar-authorize-btn'));
      await bot.clickTarget(page.getByTestId('auth-toggle-mode-btn'));
      const suffix = randomBytes(4).toString('hex');
      await page.getByTestId('auth-gamertag-input').fill(`Training${suffix}`);
      await page.getByTestId('auth-email-input').fill(`training-${suffix}@example.invalid`);
      await page
        .getByTestId('auth-password-input')
        .fill(`Training!${randomBytes(12).toString('hex')}`);
      if (step.value !== 'form') {
        await bot.clickTarget(page.getByTestId('auth-submit-btn'));
        await expect(page.locator('.phx-user-info')).toBeVisible();
      }
      break;
    }
    case 'openReplay': {
      const matchId = await page.locator(arena).getAttribute('data-match-id');
      if (!matchId) throw new Error('No match ID for replay');
      await bot.playUntil(testId('game-over'));
      await bot.clickTarget(page.getByTestId('return-lobby-btn'));
      await open(page, new URL(`/?screen=rewatch&matchId=${matchId}&step=0`, baseUrl));
      await expect(page.getByTestId('rewatch-next-btn')).toBeEnabled();
      break;
    }
    case 'terminal':
      await terminal.run(page, step.value, baseUrl);
      break;
    case 'finishMatch':
      await bot.playUntil(testId('game-over'));
      break;
    case 'reachPosition':
      if (!step.selector) throw new Error('reachPosition requires a selector');
      await bot.playUntil(step.selector);
      break;
    case 'hold':
      break;
  }
}

async function shotBounds(page: Page, selectors: readonly string[] | undefined) {
  if (!selectors) return undefined;
  const boxes = [];
  for (const selector of selectors) {
    const target = page.locator(selector).first();
    await expect(target).toBeVisible();
    const box = await target.boundingBox();
    if (!box) throw new Error(`Focus target disappeared: ${selector}`);
    boxes.push(box);
  }
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Capture requires a fixed viewport');
  const left = Math.max(0, Math.floor(Math.min(...boxes.map((b) => b.x)) - 30));
  const top = Math.max(0, Math.floor(Math.min(...boxes.map((b) => b.y)) - 30));
  const right = Math.min(
    viewport.width,
    Math.ceil(Math.max(...boxes.map((b) => b.x + b.width)) + 30),
  );
  const bottom = Math.min(
    viewport.height,
    Math.ceil(Math.max(...boxes.map((b) => b.y + b.height)) + 30),
  );
  if (right <= left || bottom <= top) throw new Error('Focus region is outside the viewport');
  return { x: left, y: top, width: right - left, height: bottom - top };
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== '--'),
    allowPositionals: true,
    options: {
      'base-url': {
        type: 'string',
        default: process.env.PHALANX_BASE_URL ?? 'http://127.0.0.1:5173',
      },
      'output-dir': { type: 'string', default: 'artifacts/tutorials' },
      help: { type: 'boolean', default: false },
    },
  });
  const [episodeId] = positionals;
  const usage = 'Usage: pnpm tutorial:record <episode-id> [--base-url URL] [--output-dir PATH]';
  if (values.help) {
    console.log(usage);
    return;
  }
  if (!episodeId || !/^ep-\d{2}-[a-z0-9-]+$/.test(episodeId)) throw new Error(usage);

  const spec = TutorialEpisodeScenarioSchema.parse(
    JSON.parse(await readFile(join(here, 'scenarios', `${episodeId}.json`), 'utf8')),
  );
  const profile = FORMAT_PROFILES[spec.format];
  const outDir = resolve(here, '../..', values['output-dir'], spec.id);
  const keyframeDir = join(outDir, 'keyframes');
  await mkdir(keyframeDir, { recursive: true });

  const browser = await chromium.launch();
  const terminal = new TutorialTerminal();
  try {
    const viewport = { width: profile.viewportWidth, height: profile.viewportHeight };
    const context = await browser.newContext({
      viewport,
      colorScheme: 'dark',
      ignoreHTTPSErrors: true,
      recordVideo: { dir: outDir, size: viewport },
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    // Abort external font/analytics requests so offline/LAN captures never stall on page.screenshot().
    await context.route(
      /^https?:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|gc\.zgo\.at|stats\.phalanxduel\.com)\//,
      (route) => route.abort(),
    );
    await context.addInitScript(() => {
      document.addEventListener('pointerdown', (event) => {
        const marker = document.createElement('span');
        marker.style.cssText =
          `position:fixed;left:${event.clientX}px;top:${event.clientY}px;` +
          'width:28px;height:28px;border:2px solid #fff0a1;border-radius:50%;' +
          'box-shadow:0 0 0 2px #102132;transform:translate(-50%,-50%);' +
          'pointer-events:none;z-index:100000;';
        document.body.append(marker);
        setTimeout(() => marker.remove(), 420);
      });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    const bot = new GameAutomator(page, { hoverDelayMs: 280 });
    const video = page.video();
    if (!video) throw new Error('Playwright video unavailable');
    let unexpectedDialog = '';
    page.on('dialog', (dialog) => {
      unexpectedDialog = dialog.type();
      void dialog.dismiss();
    });
    const startedAt = performance.now();
    const phases = [];
    for (const cue of spec.cues) {
      console.log(`[tutorial:record] ${spec.id}/${cue.id}`);
      const actions = cue.actions ?? [{ ...cue, action: cue.action ?? 'hold' }];
      try {
        for (const step of cue.setup ?? []) {
          await runAction(page, bot, step, values['base-url'], spec, terminal);
        }
        let startMs = Math.round(performance.now() - startedAt);
        for (const step of actions) {
          await runAction(page, bot, step, values['base-url'], spec, terminal);
          if (
            step.action === 'reachPosition' ||
            step.action === 'goto' ||
            step.action === 'reconnect' ||
            (step.action === 'terminal' && step.value === 'admin-login') ||
            (step.action === 'finishMatch' && step.value !== 'show') ||
            step.action === 'openReplay'
          ) {
            startMs = Math.round(performance.now() - startedAt);
          }
        }
        if (!cue.expect || !cue.focus)
          throw new Error('Specify the expected visible result and shot focus');
        await expect(page.locator(cue.expect).first()).toBeVisible();
        if (cue.focus?.length === 1) {
          await page.locator(cue.focus[0]).first().scrollIntoViewIfNeeded();
        }
        if (unexpectedDialog) throw new Error(`Unexpected browser dialog: ${unexpectedDialog}`);
        await expect(page.locator(passiveOverlay)).toHaveCount(0);
        await expect(page.locator(uiError).first()).toBeHidden();
        const telemetry = await page.evaluate(() => {
          const board = document.querySelector('[data-testid="game-layout"]');
          const ruleIds = [
            ...new Set(
              Array.from(
                document.querySelectorAll('[data-testid="combat-math-log"] [data-rule-id]'),
              )
                .map((el) => el.getAttribute('data-rule-id'))
                .filter((id): id is string => Boolean(id)),
            ),
          ];
          return {
            colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light',
            bodyBg: getComputedStyle(document.body).backgroundColor,
            matchId: board?.getAttribute('data-match-id') ?? null,
            phase: board?.getAttribute('data-phase') ?? null,
            damageMode: board?.getAttribute('data-damage-mode') ?? null,
            actionCount: board?.getAttribute('data-action-count') ?? null,
            ruleIds,
          };
        });
        if (telemetry.colorScheme !== 'dark') {
          throw new Error(`Expected dark colorScheme, got ${telemetry.colorScheme}`);
        }
        const focus = await shotBounds(page, cue.focus);
        const resultMs = Math.round(performance.now() - startedAt);
        const keyframe = `keyframes/${cue.id}.png`;
        await page.screenshot({ path: join(outDir, keyframe) });
        await page.waitForTimeout(cue.holdMs);
        phases.push({
          phase: cue.id,
          label: cue.label,
          startMs,
          resultMs,
          endMs: Math.round(performance.now() - startedAt),
          keyframe,
          focus,
          telemetry,
        });
        // Keep an unedited handle so the next navigation cannot enter this shot's last frame.
        await page.waitForTimeout(500);
      } catch (error) {
        await page.screenshot({ path: join(outDir, 'failure.png') }).catch(() => undefined);
        throw new Error(`${spec.id}/${cue.id} failed`, { cause: error });
      }
    }

    if (spec.requiredRuleIds?.length) {
      const seen = new Set(phases.flatMap((p) => p.telemetry?.ruleIds ?? []));
      const missing = spec.requiredRuleIds.filter((r) => !seen.has(r));
      if (missing.length > 0) {
        throw new Error(
          `${spec.id} did not trigger required rule(s): ${missing.join(', ')} (seen: ${[...seen].join(', ') || 'none'})`,
        );
      }
    }

    await context.close();
    const file = join(outDir, 'raw.webm');
    await video.saveAs(file);
    await video.delete();
    await writeFile(
      join(outDir, 'footage.json'),
      JSON.stringify(
        {
          episodeId: spec.id,
          format: spec.format,
          file,
          fps: profile.fps,
          outputResolution: { width: profile.outputWidth, height: profile.outputHeight },
          phases,
        },
        null,
        2,
      ) + '\n',
    );
    console.log(`[tutorial:record] Saved ${file} (${phases.length} cues)`);
  } finally {
    await terminal.close();
    await browser.close();
  }
}

await main();
