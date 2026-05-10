export interface HeuristicWeights {
  attackBias: number;
  defenseBias: number;
  columnDestructionBias: number;
  speedBias: number;
}

export type BotTier =
  | 'scout'
  | 'grunt'
  | 'soldier'
  | 'veteran'
  | 'destroyer'
  | 'sentinel'
  | 'blitz'
  | 'champion';

export interface TierConfig {
  strategy: 'random' | 'heuristic' | 'mcts';
  mctsIterations: number;
  weights: HeuristicWeights;
  description: string;
}

const NEUTRAL: HeuristicWeights = {
  attackBias: 1.0,
  defenseBias: 1.0,
  columnDestructionBias: 1.0,
  speedBias: 1.0,
};

export const TIER_CONFIG: Record<BotTier, TierConfig> = {
  scout: {
    strategy: 'random',
    mctsIterations: 0,
    weights: { ...NEUTRAL },
    description: 'Random moves — baseline, tutorial',
  },
  grunt: {
    strategy: 'heuristic',
    mctsIterations: 0,
    weights: { ...NEUTRAL },
    description: 'Heuristic — plays legally, no planning',
  },
  soldier: {
    strategy: 'mcts',
    mctsIterations: 100,
    weights: { ...NEUTRAL },
    description: 'MCTS 100 — balanced, plans 1–2 turns ahead',
  },
  veteran: {
    strategy: 'mcts',
    mctsIterations: 500,
    weights: { attackBias: 1.8, defenseBias: 0.8, columnDestructionBias: 1.0, speedBias: 1.0 },
    description: 'MCTS 500, attack-biased — aggressive, targets high-LP columns',
  },
  destroyer: {
    strategy: 'mcts',
    mctsIterations: 500,
    weights: { attackBias: 1.2, defenseBias: 0.7, columnDestructionBias: 2.0, speedBias: 1.0 },
    description: 'MCTS 500, column-destruction bias — dismantles board presence first',
  },
  sentinel: {
    strategy: 'mcts',
    mctsIterations: 500,
    weights: { attackBias: 0.6, defenseBias: 2.0, columnDestructionBias: 0.8, speedBias: 0.8 },
    description: 'MCTS 500, defense-biased — prioritizes healing and LP preservation',
  },
  blitz: {
    strategy: 'mcts',
    mctsIterations: 300,
    weights: { attackBias: 1.4, defenseBias: 0.7, columnDestructionBias: 1.0, speedBias: 2.0 },
    description: 'MCTS 300, speed-biased — deploys fast, seeks early game-over conditions',
  },
  champion: {
    strategy: 'mcts',
    mctsIterations: 1000,
    weights: { ...NEUTRAL },
    description: 'MCTS 1000, balanced — strongest general player',
  },
};
