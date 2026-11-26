import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { promisify, stripVTControlCharacters } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Page } from '@playwright/test';

const terminalId = 'phx-tutorial-terminal';
const cliDir = fileURLToPath(new URL('../../clients/go/duel-cli/', import.meta.url));

function isAllowedCaptureHost(hostname: string): boolean {
  return (
    hostname === '127.0.0.1' ||
    hostname === 'localhost' ||
    hostname === 'lan.phalanxduel.com' ||
    hostname.endsWith('.lan.phalanxduel.com') ||
    hostname.endsWith('.phalanxduel.localhost')
  );
}

function resolveAdminUrl(base: URL): URL {
  if (base.hostname === 'lan.phalanxduel.com' || base.hostname.endsWith('.lan.phalanxduel.com')) {
    return new URL(`${base.protocol}//admin.lan.phalanxduel.com/`);
  }
  if (base.hostname.endsWith('.phalanxduel.localhost')) {
    return new URL(`${base.protocol}//admin.phalanxduel.localhost/`);
  }
  const admin = new URL('/', base);
  admin.port = '3103';
  return admin;
}

async function showTerminal(page: Page, lines: string, width = '100%'): Promise<void> {
  await page.evaluate(
    ({ id, lines, width }) => {
      const terminal = document.getElementById(id) ?? document.createElement('pre');
      terminal.id = id;
      terminal.setAttribute('aria-label', 'Terminal output');
      terminal.style.cssText =
        `position:fixed;inset:0 auto 0 0;width:${width};height:100%;margin:0;padding:42px;` +
        'box-sizing:border-box;background:#101827;color:#d4fff1;z-index:50000;' +
        'font:22px/1.45 ui-monospace,monospace;white-space:pre-wrap;overflow:auto;';
      terminal.textContent = lines;
      if (!terminal.isConnected) document.body.append(terminal);
    },
    { id: terminalId, lines, width },
  );
}

/** Run the real interactive Go client. The browser only renders its stdout for capture. */
export class TutorialTerminal {
  private cli: ChildProcessWithoutNullStreams | undefined;
  private buildDir: string | undefined;
  private output = '';
  private stderr = '';
  private failure: Error | undefined;

  private async waitForOutput(text: string, from = 0): Promise<void> {
    await expect
      .poll(
        () => {
          if (this.failure) throw this.failure;
          return this.output.slice(from);
        },
        { timeout: 45_000 },
      )
      .toContain(text);
  }

  async run(page: Page, operation: string | undefined, baseUrl: string): Promise<void> {
    const url = new URL(baseUrl);
    if (!isAllowedCaptureHost(url.hostname)) {
      throw new Error('Terminal capture requires a loopback or local LAN server');
    }
    switch (operation) {
      case 'health': {
        const healthUrl = new URL('/health', url).toString();
        const response = await page.request.get(healthUrl, { ignoreHTTPSErrors: true });
        if (!response.ok()) throw new Error(`Health probe failed: ${response.status()}`);
        const result = (await response.json()) as { status: string; version: string };
        if (result.status !== 'ok') throw new Error('Local game server is not ready');
        await showTerminal(
          page,
          `$ curl --fail ${healthUrl}\n\nHTTP ${response.status()}\nStatus: ${result.status}\nGame version: ${result.version}`,
        );
        break;
      }
      case 'admin-login': {
        const admin = resolveAdminUrl(url);
        await page.goto(admin.toString(), { waitUntil: 'domcontentloaded' });
        await expect(page.locator('input[type="password"]')).toBeVisible();
        break;
      }
      case 'cli-menu': {
        this.buildDir = await mkdtemp(join(tmpdir(), 'phx-tutorial-cli-'));
        const binary = join(this.buildDir, 'duel-cli');
        await promisify(execFile)('go', ['build', '-o', binary, '.'], { cwd: cliDir });
        this.cli = spawn(binary, [], {
          cwd: cliDir,
          env: { ...process.env, PHALANX_SERVER_URL: baseUrl },
        });
        this.cli.stdout.setEncoding('utf8').on('data', (chunk: string) => {
          this.output += stripVTControlCharacters(chunk);
        });
        this.cli.stderr.setEncoding('utf8').on('data', (chunk: string) => {
          this.stderr += stripVTControlCharacters(chunk);
        });
        this.cli.on('error', (error) => {
          this.failure = error;
        });
        this.cli.on('exit', (code) => {
          if (code)
            this.failure = new Error(`Duel CLI exited with status ${code}: ${this.stderr.trim()}`);
        });
        await this.waitForOutput('Player name:');
        this.cli.stdin.write('TerminalRival\n');
        await this.waitForOutput('Choice:');
        await showTerminal(page, `$ go run .\n\n${this.output}`);
        break;
      }
      case 'cli-join': {
        if (!this.cli) throw new Error('Start the CLI before joining');
        const code = await page.getByTestId('waiting-match-id').textContent();
        if (!code) throw new Error('Create a browser match before joining');
        this.cli.stdin.write(`2\n${code.trim()}\n`);
        await this.waitForOutput('== Turn');
        await expect(page.getByTestId('game-layout')).toBeVisible();
        const turn = this.output.indexOf('== Turn');
        const end = this.output.indexOf('Available actions:', turn);
        await showTerminal(page, this.output.slice(0, end < 0 ? undefined : end).trim());
        break;
      }
      case 'cli-turn': {
        if (!this.cli) throw new Error('Join the browser match first');
        await page.locator(`#${terminalId}`).evaluate((element) => element.remove());
        const browserCard = page.locator('[data-testid^="hand-card-"].playable').first();
        if (!(await this.waitForPlayerChoice(browserCard))) {
          await browserCard.click();
          await page.locator('[data-testid="player-battlefield"] .valid-target').first().click();
        }
        await this.waitForOutput('Action:');
        const listStart = this.output.lastIndexOf('Available actions:');
        const list = this.output.slice(listStart);
        const deploy = list.match(/^\s*(\d+)\. Deploy \S+ to column /im);
        if (listStart < 0 || !deploy) throw new Error('No deployment choice was printed');
        const [, number] = deploy;
        const choice = deploy[0]
          .trim()
          .replace(/Deploy \S+ to column/, 'Deploy selected card to column');
        await showTerminal(
          page,
          `Available actions (excerpt)\n${choice.trim()}\n\nAction: ${number}`,
          '58%',
        );
        await page.waitForTimeout(1800);
        this.cli.stdin.write(`${number}\n`);
        await expect(
          page.locator('[data-testid="opponent-battlefield"] .occupied').first(),
        ).toBeVisible({ timeout: 12_000 });
        await page.locator(`#${terminalId}`).evaluate((element) => element.remove());
        break;
      }
      default:
        throw new Error(`Unknown terminal operation: ${operation}`);
    }
  }

  private async waitForPlayerChoice(browserCard: ReturnType<Page['locator']>): Promise<boolean> {
    return Promise.race([
      this.waitForOutput('Action:').then(() => true),
      browserCard.waitFor({ state: 'visible' }).then(() => false),
    ]);
  }

  async close(): Promise<void> {
    this.cli?.stdin.end();
    this.cli?.kill();
    if (this.buildDir) await rm(this.buildDir, { recursive: true, force: true });
  }
}
