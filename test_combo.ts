import { PhalanxEngine } from './engine/src/engine';
import { createMatch } from './engine/src/factory';
import { Suit, Rank, CardType, PlayAction } from './shared/src/schema';

const match = createMatch({ p1: 'p1', p2: 'p2', seed: 42, quickStart: true });

// Setup a combo: P1 attacks a weak column of P2 that has a reinforcer
match.state.board.p2[0] = {
  suit: Suit.Hearts,
  rank: Rank.Two,
  type: CardType.Unit,
  id: 'tgt1',
  player: 'p2',
  playable: false,
};
match.state.board.p2[3] = {
  suit: Suit.Spades,
  rank: Rank.Three,
  type: CardType.Unit,
  id: 'tgt2',
  player: 'p2',
  playable: false,
}; // Reinforcer behind it

match.state.board.p1[0] = {
  suit: Suit.Clubs,
  rank: Rank.King,
  type: CardType.Unit,
  id: 'atk',
  player: 'p1',
  playable: false,
};

match.state.turn = 'p1';
match.state.phase = 'combat';

const engine = new PhalanxEngine();
const result = engine.processAction(match.state, {
  type: 'play',
  player: 'p1',
  cardId: 'atk',
  targetId: 'tgt1',
} as PlayAction);

const comboEvents = result.transactionLog.filter(
  (e) => e.type === 'combat' && e.combat?.comboCount && e.combat.comboCount > 1,
);

console.log('Combo events found:', comboEvents.length);
if (comboEvents.length > 0) {
  console.log('Combo count:', comboEvents[0].combat?.comboCount);
  console.log('Success! Combo tracking works.');
} else {
  console.log('No combo detected.');
  console.dir(result.transactionLog, { depth: null });
}
