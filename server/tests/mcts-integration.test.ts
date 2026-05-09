import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { type IMatchManager } from '../src/match.js';

describe('MCTS Bot Behavioral Integration (BDD)', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let matchManager: IMatchManager;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    // @ts-expect-error test access to shared match manager
    matchManager = app.matchManager;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Given a new game lobby', () => {
    describe('When a player creates a match with MCTS Hard difficulty', () => {
      it('Then the match should be initialized with 2000 iterations', async () => {
        const { matchId } = await matchManager.createMatch('Alice', null, {
          opponent: 'bot-mcts',
          botOptions: {
            opponent: 'bot-mcts',
            difficulty: 'hard',
            botConfig: { strategy: 'mcts', seed: Date.now(), mctsIterations: 2000 },
          },
        });

        const match = await matchManager.getMatch(matchId);
        expect(match).toBeDefined();
        expect(match!.players[1]?.playerName).toBe('Bot (MCTS)');
        expect(match!.botConfig?.strategy).toBe('mcts');
        expect(match!.botConfig?.mctsIterations).toBe(2000);
      });
    });

    describe('When a player creates a match with MCTS Easy difficulty', () => {
      it('Then the match should be initialized with 100 iterations', async () => {
        const { matchId } = await matchManager.createMatch('Bob', null, {
          opponent: 'bot-mcts',
          botOptions: {
            opponent: 'bot-mcts',
            difficulty: 'easy',
            botConfig: { strategy: 'mcts', seed: Date.now(), mctsIterations: 100 },
          },
        });

        const match = await matchManager.getMatch(matchId);
        expect(match).toBeDefined();
        expect(match!.botConfig?.mctsIterations).toBe(100);
      });
    });
  });

  describe('Under the Skin: MCTS Decision Making', () => {
    it('The MCTS bot successfully computes an action in a complex state', async () => {
      const { matchId } = await matchManager.createMatch('Charlie', null, {
        opponent: 'bot-mcts',
        botOptions: {
          opponent: 'bot-mcts',
          difficulty: 'medium',
          botConfig: { strategy: 'mcts', seed: 42, mctsIterations: 50 }, // Low iterations for test speed
        },
      });

      // The bot should have already made its first move if deployment was enabled and it's its turn
      // Or we can manually trigger an action if it's the bot's turn.
      const match = await matchManager.getMatch(matchId);
      expect(match).toBeDefined();

      // In LocalMatchManager, the bot usually reacts to events.
      // We'll wait a bit or check if an action was recorded.
      await new Promise((resolve) => setTimeout(resolve, 500));

      const updatedMatch = await matchManager.getMatch(matchId);
      // Depending on initiative, the bot might have deployed or passed.
      // We just want to ensure it doesn't crash.
      expect(updatedMatch!.actionHistory.length).toBeGreaterThan(0);
    });
  });
});
