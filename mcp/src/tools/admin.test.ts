import { describe, it, expect, vi } from 'vitest';

vi.mock('../db.js', () => ({
  db: {
    execute: vi.fn(),
    select: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
  },
}));

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAdminTools } from './admin.js';

describe('MCP Admin Tools', () => {
  it('registers storage_hygiene tool on McpServer', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' });
    const registerSpy = vi.spyOn(server, 'registerTool');

    registerAdminTools(server);

    const toolCalls = registerSpy.mock.calls.map((call) => call[0]);
    expect(toolCalls).toContain('storage_hygiene');
    expect(toolCalls).toContain('pipeline_status');
    expect(toolCalls).toContain('match_purge');
    expect(toolCalls).toContain('user_search');
  });
});
