import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PlayerActionSchema } from '@phalanxduel/shared';
import { describe, expect, it, vi } from 'vitest';
import { registerGameplayTools } from './gameplay.js';

describe('MCP gameplay tools', () => {
  it('registers action_submit with the canonical player action schema', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' });
    const registerSpy = vi.spyOn(server, 'registerTool');

    registerGameplayTools(server);

    const registeredCalls = registerSpy.mock.calls as unknown as Array<[string, unknown]>;
    const actionSubmitCall = registeredCalls.find(([name]) => name === 'action_submit');
    const config = actionSubmitCall?.[1] as
      | { inputSchema?: { action?: typeof PlayerActionSchema } }
      | undefined;

    expect(config?.inputSchema?.action).toBe(PlayerActionSchema);
  });

  it('accepts every player action variant and rejects internal or incomplete actions', () => {
    const timestamp = '2026-01-01T00:00:00.000Z';
    const playerActions = [
      { type: 'deploy', playerIndex: 0, column: 0, cardId: 'card-1', timestamp },
      { type: 'quickDeploy', playerIndex: 0, strategy: 'defensive', timestamp },
      {
        type: 'attack',
        playerIndex: 0,
        attackingColumn: 0,
        defendingColumn: 1,
        timestamp,
      },
      { type: 'pass', playerIndex: 0, timestamp },
      { type: 'reinforce', playerIndex: 0, cardId: 'card-2', timestamp },
      { type: 'forfeit', playerIndex: 0, timestamp },
    ];

    for (const action of playerActions) {
      expect(PlayerActionSchema.safeParse(action).success, action.type).toBe(true);
    }

    expect(PlayerActionSchema.safeParse({ type: 'system:init', timestamp }).success).toBe(false);
    expect(
      PlayerActionSchema.safeParse({ type: 'attack', playerIndex: 0, timestamp }).success,
    ).toBe(false);
  });
});
