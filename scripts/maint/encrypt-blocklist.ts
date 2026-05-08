import { ContentFilterService } from '../../server/src/content-filter.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Usage:
 * BLOCKLIST_ENCRYPTION_KEY=your-secret npx tsx scripts/maint/encrypt-blocklist.ts path/to/plain-blocklist.txt
 */
async function main() {
  const secret = process.env.BLOCKLIST_ENCRYPTION_KEY;
  if (!secret) {
    console.error('ERROR: BLOCKLIST_ENCRYPTION_KEY environment variable is required.');
    process.exit(1);
  }

  const inputPath = process.argv[2];
  if (!inputPath || !existsSync(inputPath)) {
    console.error('Usage: npx tsx scripts/maint/encrypt-blocklist.ts <path-to-plain-text-file>');
    process.exit(1);
  }

  const content = readFileSync(inputPath, 'utf8');
  const terms = content
    .split('\n')
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !t.startsWith('#'));

  console.log(`Encrypting ${terms.length} terms...`);

  const encrypted = ContentFilterService.encryptList(terms, secret);
  const outputPath = join(__dirname, '../../server/config/blocklist.bin');

  writeFileSync(outputPath, encrypted);

  console.log(`✅ Success! Encrypted blocklist saved to: server/config/blocklist.bin`);
  console.log(`Safe to commit server/config/blocklist.bin to the repo.`);
}

main().catch(console.error);
