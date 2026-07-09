#!/usr/bin/env tsx

/**
 * Design Flow Catalog Generator
 *
 * Reads a design-baseline manifest and produces an interactive HTML catalog:
 * - Columns flow left-to-right, one per screen
 * - Variants of each screen stack vertically within the column
 * - Desktop and mobile screenshots toggle or show side-by-side
 * - The HTML file + images are self-contained and can be fed to AI design tools
 *
 * Output: artifacts/design-baseline/<label>/catalog.html
 *
 * Usage:
 *   pnpm qa:design-catalog
 *   pnpm qa:design-catalog -- --label "before-redesign"
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';

const rawArgv = process.argv.slice(2);
const argv = rawArgv[0] === '--' ? rawArgv.slice(1) : rawArgv;

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`
Design Flow Catalog Generator

Usage:
  pnpm qa:design-catalog
  pnpm qa:design-catalog -- --label "before-redesign"

Options:
  --label <label>       Subdirectory label in artifacts (default: "current")
  --viewport <viewport> Filter to a specific viewport (default: "desktop")
  --help, -h            Show this help
`);
  process.exit(0);
}

const { values: opts } = parseArgs({
  args: argv,
  options: {
    label: { type: 'string', default: 'current' },
    viewport: { type: 'string', default: 'desktop' },
    help: { type: 'boolean', default: false },
  },
});

const LABEL = opts.label!;
const VP_FILTER = opts.viewport!;

interface CaptureEntry {
  screen: string;
  variant: string;
  viewport: string;
  path: string;
}

interface Manifest {
  label: string;
  capturedAt: string;
  baseUrl: string;
  viewports: Array<{ width: number; height: number; tag: string }>;
  captures: CaptureEntry[];
}

// ponytail: screen ordering is fixed — user flow is deterministic
const SCREEN_ORDER = [
  'lobby',
  'auth',
  'settings',
  'ladder',
  'public-lobby',
  'spectator-lobby',
  'game-deploy',
  'game-startturn',
  'game-attack',
  'game-resolution',
  'game-cleanup',
  'game-reinforce',
  'game-draw',
  'game-endturn',
  'game-over',
];

const SCREEN_LABELS: Record<string, string> = {
  lobby: '🏠 Lobby',
  auth: '🔑 Auth',
  settings: '⚙️ Settings',
  ladder: '🏆 Ladder',
  'public-lobby': '📢 Public Lobby',
  'spectator-lobby': '👁️ Spectator Lobby',
  'game-deploy': '🃏 Deployment',
  'game-startturn': '🔄 Start Turn',
  'game-attack': '⚔️ Attack',
  'game-resolution': '💥 Resolution',
  'game-cleanup': '🧹 Cleanup',
  'game-reinforce': '🛡️ Reinforce',
  'game-draw': '🎴 Draw',
  'game-endturn': '🔚 End Turn',
  'game-over': '🏁 Game Over',
};

async function main() {
  const baseDir = join(process.cwd(), 'artifacts/design-baseline', LABEL);
  const manifestPath = join(baseDir, 'manifest.json');

  if (!existsSync(manifestPath)) {
    console.error(`❌ No manifest found at ${manifestPath}`);
    console.error('   Run: pnpm qa:design-baseline');
    process.exit(1);
  }

  const manifest: Manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
  const captures = manifest.captures.filter((c) => c.viewport === VP_FILTER);

  // Group by screen
  const screenMap = new Map<string, CaptureEntry[]>();
  for (const cap of captures) {
    const list = screenMap.get(cap.screen) || [];
    list.push(cap);
    screenMap.set(cap.screen, list);
  }

  // Sort screens by flow order
  const orderedScreens = [...screenMap.keys()].sort((a, b) => {
    const ai = SCREEN_ORDER.indexOf(a);
    const bi = SCREEN_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  console.log(`📊 Generating flow catalog for "${LABEL}" (${VP_FILTER})`);
  console.log(`   ${orderedScreens.length} screens, ${captures.length} captures\n`);

  // Check if we have both viewports for toggle
  const allViewports = [...new Set(manifest.captures.map((c) => c.viewport))];
  const hasMultipleViewports = allViewports.length > 1;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Design Flow Catalog — ${LABEL}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #0a0a0a;
      color: #ccc;
      overflow-x: auto;
      overflow-y: auto;
    }

    /* --- Header --- */
    .catalog-header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(10, 10, 10, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid #222;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .catalog-title {
      font-size: 14px;
      font-weight: 700;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .catalog-meta {
      font-size: 11px;
      color: #666;
      display: flex;
      gap: 16px;
    }
    .catalog-meta span { white-space: nowrap; }

    .viewport-toggle {
      display: flex;
      gap: 4px;
      background: #1a1a1a;
      border-radius: 6px;
      padding: 2px;
    }
    .viewport-toggle button {
      font-family: inherit;
      font-size: 11px;
      font-weight: 500;
      padding: 4px 12px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: #888;
      cursor: pointer;
      transition: all 0.15s;
    }
    .viewport-toggle button.active {
      background: #333;
      color: #fff;
    }
    .viewport-toggle button:hover:not(.active) {
      color: #bbb;
    }

    /* --- Flow Container --- */
    .flow-container {
      display: flex;
      gap: 2px;
      padding: 16px;
      min-height: calc(100vh - 50px);
      align-items: flex-start;
    }

    /* --- Screen Column --- */
    .screen-column {
      flex: 0 0 auto;
      min-width: 280px;
      max-width: 400px;
      background: #111;
      border: 1px solid #1a1a1a;
      border-radius: 8px;
      overflow: hidden;
    }
    .screen-column:hover {
      border-color: #333;
    }

    .column-header {
      position: sticky;
      top: 50px;
      z-index: 10;
      background: rgba(17, 17, 17, 0.95);
      backdrop-filter: blur(8px);
      padding: 10px 12px;
      border-bottom: 1px solid #222;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .column-title {
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .column-count {
      font-size: 10px;
      color: #555;
      background: #1a1a1a;
      padding: 2px 6px;
      border-radius: 3px;
    }

    /* --- Variant Card --- */
    .variant-card {
      padding: 8px;
      border-bottom: 1px solid #1a1a1a;
    }
    .variant-card:last-child {
      border-bottom: none;
    }
    .variant-label {
      font-size: 10px;
      font-weight: 500;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
      padding: 0 4px;
    }
    .variant-img {
      width: 100%;
      border-radius: 4px;
      border: 1px solid #222;
      cursor: pointer;
      transition: border-color 0.15s, transform 0.15s;
      display: block;
    }
    .variant-img:hover {
      border-color: #0099ff;
      transform: scale(1.01);
    }

    /* --- Flow Arrows --- */
    .flow-arrow {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      padding: 0 4px;
      color: #333;
      font-size: 18px;
      align-self: flex-start;
      margin-top: 40px;
    }

    /* --- Lightbox --- */
    .lightbox {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.92);
      backdrop-filter: blur(4px);
      align-items: center;
      justify-content: center;
      cursor: zoom-out;
    }
    .lightbox.open { display: flex; }
    .lightbox img {
      max-width: 90vw;
      max-height: 90vh;
      border-radius: 8px;
      box-shadow: 0 0 60px rgba(0, 0, 0, 0.5);
    }
    .lightbox-label {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 12px;
      color: #888;
      background: rgba(0, 0, 0, 0.8);
      padding: 6px 16px;
      border-radius: 4px;
    }

    /* --- Responsive --- */
    @media (max-width: 900px) {
      .flow-container {
        flex-direction: column;
        gap: 12px;
      }
      .screen-column {
        max-width: 100%;
        min-width: unset;
      }
      .flow-arrow {
        transform: rotate(90deg);
        align-self: center;
        margin-top: 0;
      }
    }
  </style>
</head>
<body>
  <div class="catalog-header">
    <div style="display: flex; align-items: center; gap: 16px;">
      <span class="catalog-title">Design Flow Catalog</span>
      <div class="catalog-meta">
        <span>Label: <strong style="color: #fff">${LABEL}</strong></span>
        <span>${manifest.capturedAt.split('T')[0]}</span>
        <span>${captures.length} captures</span>
        <span>${orderedScreens.length} screens</span>
      </div>
    </div>
    ${
      hasMultipleViewports
        ? `
    <div class="viewport-toggle" id="vpToggle">
      ${allViewports.map((vp) => `<button data-vp="${vp}" class="${vp === VP_FILTER ? 'active' : ''}">${vp}</button>`).join('')}
    </div>`
        : ''
    }
  </div>

  <div class="flow-container" id="flowContainer">
    ${orderedScreens
      .map((screen, i) => {
        const variants = screenMap.get(screen)!;
        const label = SCREEN_LABELS[screen] || screen;
        return `
      ${i > 0 ? '<div class="flow-arrow">→</div>' : ''}
      <div class="screen-column" data-screen="${screen}">
        <div class="column-header">
          <span class="column-title">${label}</span>
          <span class="column-count">${variants.length}</span>
        </div>
        ${variants
          .map(
            (v) => `
        <div class="variant-card">
          <div class="variant-label">${v.variant}</div>
          <img
            class="variant-img"
            src="${v.path}"
            alt="${screen} — ${v.variant}"
            loading="lazy"
            onclick="openLightbox(this)"
          />
        </div>`,
          )
          .join('')}
      </div>`;
      })
      .join('\n')}
  </div>

  <div class="lightbox" id="lightbox" onclick="closeLightbox()">
    <img id="lightboxImg" src="" alt="" />
    <div class="lightbox-label" id="lightboxLabel"></div>
  </div>

  <script>
    function openLightbox(img) {
      const lb = document.getElementById('lightbox');
      document.getElementById('lightboxImg').src = img.src;
      document.getElementById('lightboxLabel').textContent = img.alt;
      lb.classList.add('open');
    }
    function closeLightbox() {
      document.getElementById('lightbox').classList.remove('open');
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });

    // Viewport toggle — reload with different viewport filter
    document.getElementById('vpToggle')?.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const vp = btn.dataset.vp;
      // Regenerate: this is a static file, so just note it for the user
      alert('Re-run: pnpm qa:design-catalog -- --viewport ' + vp);
    });
  </script>
</body>
</html>`;

  const catalogPath = join(baseDir, 'catalog.html');
  await writeFile(catalogPath, html, 'utf-8');

  console.log(`✅ Flow catalog generated: ${catalogPath}`);
  console.log(`   Open in browser to view the complete UI flow\n`);

  // Also generate a summary for AI design tools
  const summary = orderedScreens
    .map((screen) => {
      const variants = screenMap.get(screen)!;
      const label = SCREEN_LABELS[screen] || screen;
      return `## ${label}\n${variants.map((v) => `- **${v.variant}**: ${v.path}`).join('\n')}`;
    })
    .join('\n\n');

  const readmePath = join(baseDir, 'README.md');
  await writeFile(
    readmePath,
    `# Design Baseline: ${LABEL}

Captured: ${manifest.capturedAt}
Viewport: ${VP_FILTER}

Use these screenshots as reference images in AI design tools.
Each screen is shown with its variants — feed the relevant screenshots
as context when asking for redesigns.

${summary}
`,
  );
  console.log(`   README: ${readmePath}`);
}

main().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
