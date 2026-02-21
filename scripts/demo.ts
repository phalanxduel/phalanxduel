#!/usr/bin/env tsx
/**
 * Phalanx Duel CLI Demo — plays a full game in the terminal.
 *
 * Usage:  pnpm demo            (default seed 42)
 *         pnpm demo -- --seed 123
 */

import { RANK_VALUES } from '../shared/src/schema.js';
import type { GameState, BattlefieldCard, Card, Action } from '../shared/src/types.js';
import {
  createInitialState,
  drawCards,
  applyAction,
  checkVictory,
  isValidTarget,
  type GameConfig,
} from '../engine/src/index.js';

// ── Helpers ──────────────────────────────────────────────────────────

const SUIT_SYMBOL: Record<string, string> = {
  spades: '\u2660',
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
};

function cardStr(c: Card): string {
  return `${c.rank}${SUIT_SYMBOL[c.suit] ?? '?'}`;
}

function bfCardStr(bc: BattlefieldCard | null): string {
  if (!bc) return '  ----  ';
  const hp = `${bc.currentHp}/${RANK_VALUES[bc.card.rank] ?? 0}`;
  return `${cardStr(bc.card).padEnd(4)} ${hp.padStart(4)}`;
}

function printBattlefield(state: GameState): void {
  const p0 = state.players[0]!;
  const p1 = state.players[1]!;

  console.log();
  console.log(`  Phase: ${state.phase}  |  Turn: ${state.turnNumber}  |  Active: Player ${state.activePlayerIndex}`);
  console.log();

  // Player 1 (top) — back row first (indices 4-7), then front row (0-3)
  console.log(`  ── Player 1 (${p1.player.name}) ──  hand: ${p1.hand.length}  draw: ${p1.drawpile.length}  discard: ${p1.discardPile.length}`);
  const p1Back = [4, 5, 6, 7].map(i => bfCardStr(p1.battlefield[i] ?? null));
  const p1Front = [0, 1, 2, 3].map(i => bfCardStr(p1.battlefield[i] ?? null));
  console.log(`  back  | ${p1Back.join(' | ')} |`);
  console.log(`  front | ${p1Front.join(' | ')} |`);
  console.log(`  ${'─'.repeat(52)}`);
  const p0Front = [0, 1, 2, 3].map(i => bfCardStr(p0.battlefield[i] ?? null));
  const p0Back = [4, 5, 6, 7].map(i => bfCardStr(p0.battlefield[i] ?? null));
  console.log(`  front | ${p0Front.join(' | ')} |`);
  console.log(`  back  | ${p0Back.join(' | ')} |`);
  console.log(`  ── Player 0 (${p0.player.name}) ──  hand: ${p0.hand.length}  draw: ${p0.drawpile.length}  discard: ${p0.discardPile.length}`);
  console.log();
}

// ── Parse args ───────────────────────────────────────────────────────

let seed = 42;
const seedIdx = process.argv.indexOf('--seed');
if (seedIdx !== -1 && process.argv[seedIdx + 1]) {
  seed = parseInt(process.argv[seedIdx + 1]!, 10);
}

console.log('='.repeat(56));
console.log('         PHALANX  —  CLI Demo  (seed: ' + seed + ')');
console.log('='.repeat(56));

// ── Setup ────────────────────────────────────────────────────────────

const config: GameConfig = {
  players: [
    { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
    { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
  ],
  rngSeed: seed,
};

let state: GameState = createInitialState(config);

// Draw 12 cards each (enough for 8 on battlefield + 4 in hand)
state = drawCards(state, 0, 12);
state = drawCards(state, 1, 12);
state = { ...state, phase: 'deployment', activePlayerIndex: 0 };

console.log('\n>> DEPLOYMENT PHASE');

// Deploy 8 cards each, alternating turns
for (let round = 0; round < 8; round++) {
  for (const pi of [0, 1] as const) {
    const player = state.players[pi]!;
    // Deploy the first card in hand to the next open slot
    const card = player.hand[0]!;
    const gridIndex = round; // 0-7 fills front then back row
    const action: Action = {
      type: 'deploy',
      playerIndex: pi,
      card,
      position: { row: gridIndex < 4 ? 0 : 1, col: gridIndex % 4 },
    };
    // applyAction handles turn alternation internally, so temporarily
    // set the active player to the one deploying
    state = { ...state, activePlayerIndex: pi };
    state = applyAction(state, action);
    console.log(`  P${pi} deploys ${cardStr(card)} to row ${gridIndex < 4 ? 'front' : 'back'} col ${gridIndex % 4}`);
  }
}

printBattlefield(state);

// ── Combat ───────────────────────────────────────────────────────────

console.log('>> COMBAT PHASE');

const turnLimit = 100;
let turns = 0;

while (state.phase === 'combat' && turns < turnLimit) {
  turns++;
  const pi = state.activePlayerIndex;
  const opponent = pi === 0 ? 1 : 0;
  const myBf = state.players[pi]!.battlefield;
  const oppBf = state.players[opponent]!.battlefield;

  // Pick first available attacker (front row first, then back)
  let attackerIdx = -1;
  for (let i = 0; i < 8; i++) {
    if (myBf[i]) { attackerIdx = i; break; }
  }
  if (attackerIdx === -1) break; // no attackers left

  // Pick first valid target (front row first)
  let targetIdx = -1;
  for (let i = 0; i < 8; i++) {
    if (isValidTarget(oppBf, i)) { targetIdx = i; break; }
  }
  if (targetIdx === -1) break; // no targets

  const attacker = myBf[attackerIdx]!;
  const target = oppBf[targetIdx]!;

  const action: Action = {
    type: 'attack',
    playerIndex: pi,
    attackerPosition: { row: attackerIdx < 4 ? 0 : 1, col: attackerIdx % 4 },
    targetPosition: { row: targetIdx < 4 ? 0 : 1, col: targetIdx % 4 },
  };

  state = applyAction(state, action);

  const targetAfter = state.players[opponent]!.battlefield[targetIdx];
  const destroyed = targetAfter === null;

  console.log(
    `  T${String(turns).padStart(3)}  P${pi} ${cardStr(attacker.card)} -> P${opponent} ${cardStr(target.card)}` +
    (destroyed ? '  ** DESTROYED **' : `  (${targetAfter!.currentHp} HP left)`),
  );

  const winner = checkVictory(state);
  if (winner !== null || state.phase === 'gameOver') {
    printBattlefield(state);
    console.log('='.repeat(56));
    console.log(`  GAME OVER — Player ${winner ?? state.activePlayerIndex} (${state.players[winner ?? 0]!.player.name}) WINS!`);
    console.log('='.repeat(56));
    process.exit(0);
  }
}

printBattlefield(state);
if (turns >= turnLimit) {
  console.log(`  (Stopped after ${turnLimit} turns — stalemate or Ace lock)`);
}
