import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { generateScenario, GameScenarioSchema, loadScenario } from '../../bin/qa/scenario';

describe('QA scenario contract', () => {
  it('generates a schema-valid scenario with deterministic action content', () => {
    const scenario = generateScenario(42, 'classic', 20, 'bot-random', 'bot-heuristic');
    const parsed = GameScenarioSchema.parse(scenario);

    expect(parsed.version).toBe(1);
    expect(parsed.seed).toBe(42);
    expect(parsed.damageMode).toBe('classic');
    expect(parsed.startingLifepoints).toBe(20);
    expect(parsed.p1).toBe('bot-random');
    expect(parsed.p2).toBe('bot-heuristic');
    expect(parsed.actions.length).toBeGreaterThan(0);
    expect(parsed.actions[0]?.type).toBeDefined();
  });

  it('loads and validates a scenario file from disk', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'phx-scenario-'));
    const scenarioPath = join(tempDir, 'scenario.json');
    const scenario = generateScenario(7, 'cumulative', 100, 'bot-heuristic', 'bot-heuristic');

    try {
      await writeFile(scenarioPath, `${JSON.stringify(scenario, null, 2)}\n`, 'utf8');

      const loaded = await loadScenario(scenarioPath);
      expect(loaded).toEqual(GameScenarioSchema.parse(scenario));
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
