import { describe, it, expect } from 'vitest';
import { MatchManager, ActionError } from '../src/match.js';

describe('MatchManager.handleAction — defensive branches', () => {
  it('throws ActionError for unknown matchId', async () => {
    const manager = new MatchManager();
    await expect(
      manager.handleAction('00000000-0000-0000-0000-000000000000', 'any', {
        type: 'pass',
        playerIndex: 0,
        timestamp: new Date().toISOString(),
      }),
    ).rejects.toThrow(ActionError);
  });
});
