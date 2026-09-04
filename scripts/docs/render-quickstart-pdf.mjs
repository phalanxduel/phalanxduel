// Render the face-to-face quickstart HTML to its printable PDF.
//   node scripts/docs/render-quickstart-pdf.mjs
// Source:  scripts/docs/phalanx-duel-face-to-face-quickstart.html
// Output:  output/pdf/phalanx-duel-face-to-face-quickstart.pdf
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';

const src = resolve('scripts/docs/phalanx-duel-face-to-face-quickstart.html');
const out = resolve('output/pdf/phalanx-duel-face-to-face-quickstart.pdf');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 816, height: 1056 },
  deviceScaleFactor: 1,
});
await page.goto(`file://${src}`);
await page.pdf({
  path: out,
  format: 'Letter',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: '0in', right: '0in', bottom: '0in', left: '0in' },
});
await browser.close();
console.log(out);
