import { describe, expect, it } from 'vitest';
import { GameplayTrajectorySchema } from '../src/schema.ts';

const hash = 'a'.repeat(64);
const base = {
  kind: 'phalanx-duel.trajectory' as const,
  version: 1 as const,
  match: {
    matchId: 'trajectory-test',
    drawTimestamp: '2026-08-30T00:00:00.000Z',
    seed: 42,
    damageMode: 'classic' as const,
    startingLifepoints: 20,
    players: [
      { id: 'p1', name: 'Player One' },
      { id: 'p2', name: 'Player Two' },
    ],
  },
  strategies: ['manual', 'random'] as ['manual', 'random'],
  actions: [],
  checkpoints: [
    {
      actionIndex: 0,
      stateHash: hash,
      phase: 'DeploymentPhase' as const,
      turnNumber: 1,
      eventTypes: [],
    },
  ],
  terminalStateHash: hash,
};

describe('GameplayTrajectorySchema', () => {
  it('accepts an initial checkpoint for an empty trajectory', () => {
    expect(GameplayTrajectorySchema.parse(base)).toEqual(base);
  });

  it('rejects checkpoint count, order, and terminal hash drift', () => {
    expect(() =>
      GameplayTrajectorySchema.parse({
        ...base,
        checkpoints: [],
      }),
    ).toThrow();
    expect(() =>
      GameplayTrajectorySchema.parse({
        ...base,
        checkpoints: [{ ...base.checkpoints[0], actionIndex: 1 }],
      }),
    ).toThrow();
    expect(() =>
      GameplayTrajectorySchema.parse({
        ...base,
        terminalStateHash: 'b'.repeat(64),
      }),
    ).toThrow();
  });

  it('accepts an explicit historical rules version for compatibility replay', () => {
    const trajectory = GameplayTrajectorySchema.parse({
      ...base,
      match: { ...base.match, specVersion: '1.0' },
    });
    expect(trajectory.match.specVersion).toBe('1.0');
  });
});
