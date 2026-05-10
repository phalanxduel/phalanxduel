import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export function registerResources(server: McpServer): void {
  server.registerResource(
    'rules',
    'game://rules',
    { mimeType: 'text/markdown', description: 'Canonical Phalanx Duel rules specification' },
    () => {
      const text = readFileSync(join(repoRoot, 'docs', 'gameplay', 'rules.md'), 'utf8');
      return { contents: [{ uri: 'game://rules', mimeType: 'text/markdown', text }] };
    },
  );

  server.registerResource(
    'development',
    'game://development',
    {
      mimeType: 'text/markdown',
      description: 'Development guide: setup, inner loop, package structure',
    },
    () => {
      const text = readFileSync(join(repoRoot, 'docs', 'development.md'), 'utf8');
      return { contents: [{ uri: 'game://development', mimeType: 'text/markdown', text }] };
    },
  );
}
