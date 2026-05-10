import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const skillsDir = join(repoRoot, 'docs', 'agents', 'skills');

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

  // Skills index — lists all available skill URIs
  server.registerResource(
    'skills',
    'game://skills',
    { mimeType: 'text/markdown', description: 'Index of agent skill playbooks (game://skills/*)' },
    () => {
      const files = readdirSync(skillsDir).filter((f) => f.endsWith('.md'));
      const lines = files.map((f) => {
        const slug = basename(f, '.md');
        return `- \`game://skills/${slug}\``;
      });
      const text = `# Phalanx Duel Agent Skills\n\nAvailable skill playbooks:\n\n${lines.join('\n')}\n\nRead any skill with: \`game://skills/<slug>\`\n`;
      return { contents: [{ uri: 'game://skills', mimeType: 'text/markdown', text }] };
    },
  );

  // Individual skill files — one resource per markdown file in docs/agents/skills/
  const skillFiles = readdirSync(skillsDir).filter((f) => f.endsWith('.md'));
  for (const file of skillFiles) {
    const slug = basename(file, '.md');
    const uri = `game://skills/${slug}`;
    server.registerResource(
      `skills/${slug}`,
      uri,
      { mimeType: 'text/markdown', description: `Agent skill playbook: ${slug}` },
      () => {
        const text = readFileSync(join(skillsDir, file), 'utf8');
        return { contents: [{ uri, mimeType: 'text/markdown', text }] };
      },
    );
  }
}
