import '../../scripts/instrument-cli.js';
import { computeBotAction, createInitialState, applyAction } from '../../engine/src/index.ts';
import { checkVictory } from '../../engine/src/state.ts';
import { isGameOver } from '../../shared/src/index.ts';
import { computeStateHash } from '../../shared/src/hash.ts';

async function runMatch(seed: number, p1Strategy: 'heuristic' | 'mcts', p2Strategy: 'heuristic' | 'mcts') {
  const matchId = `bot-battle-${seed}`;
  const applyOptions = {
    hashFn: (s: unknown) => computeStateHash(s),
    allowSystemInit: true,
  };

  let state = createInitialState({
    matchId,
    players: [
      { id: 'bot-p1', name: `Bot-P1-${p1Strategy}` },
      { id: 'bot-p2', name: `Bot-P2-${p2Strategy}` },
    ],
    rngSeed: seed,
    gameOptions: {
      damageMode: 'classic',
      startingLifepoints: 10,
      classicDeployment: true,
      quickStart: true,
    },
    matchParams: {
      modePassRules: {
        maxConsecutivePasses: 2,
        maxTotalPassesPerPlayer: 3,
      },
    },
  });

  state = applyAction(state, { type: 'system:init', timestamp: new Date().toISOString() }, applyOptions);

  let turns = 0;
  const maxTurns = 200;

  while (!isGameOver(state) && turns < maxTurns) {
    const activeIdx = state.activePlayerIndex as 0 | 1;
    const strategy = activeIdx === 0 ? p1Strategy : p2Strategy;
    const action = computeBotAction(state, activeIdx, {
      strategy,
      seed: seed + state.turnNumber + activeIdx,
      mctsIterations: 600,
    });
    state = applyAction(state, action, applyOptions);
    turns++;
  }

  const victory = checkVictory(state);
  return {
    winnerIndex: victory?.winnerIndex ?? null,
    turns: state.turnNumber,
    victoryType: victory?.victoryType ?? 'draw',
  };
}

async function main() {
  const numMatches = 50;
  let mctsWins = 0;
  let heuristicWins = 0;
  let draws = 0;

  console.log(`Starting Bot Battle: MCTS (P1) vs Heuristic (P2) - ${numMatches} matches`);

  for (let i = 0; i < numMatches; i++) {
    const result = await runMatch(i + 1000, 'mcts', 'heuristic');
    if (result.winnerIndex === 0) mctsWins++;
    else if (result.winnerIndex === 1) heuristicWins++;
    else draws++;

    if ((i + 1) % 10 === 0) {
      console.log(`Played ${i + 1} matches: MCTS ${mctsWins}, Heuristic ${heuristicWins}, Draws ${draws}`);
    }
  }

  const winRate = (mctsWins / numMatches) * 100;
  console.log('\nFinal Results:');
  console.log(`MCTS Wins: ${mctsWins}`);
  console.log(`Heuristic Wins: ${heuristicWins}`);
  console.log(`Draws: ${draws}`);
  console.log(`MCTS Win Rate: ${winRate.toFixed(2)}%`);

  if (winRate >= 60) {
    console.log('✅ Acceptance Criterion met: MCTS win rate >= 60%');
    process.exit(0);
  } else {
    console.log('❌ Acceptance Criterion NOT met: MCTS win rate < 60%');
    process.exit(1);
  }
}

void main();
