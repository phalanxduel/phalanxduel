---
description: "Run game smoke test and report what works vs what breaks"
model: sonnet
allowed-tools: "Read, Write, Edit, Bash, Grep, Glob"
---

Run a quick QA smoke test against the Phalanx Duel game engine. This writes a temporary integration test, executes it, reports results, and cleans up.

## Steps

1. Read `engine/src/index.ts` to discover what functions are currently exported
2. Read `shared/src/types.ts` for available type definitions
3. Write `engine/tests/qa-smoke.test.ts` — a temporary test that exercises the full game flow using the **API Cheat Sheet** below:
   - Create initial state with two players (PHX-CARDS-001)
   - Draw 12 cards per player, set phase to deployment (PHX-DEPLOY-001)
   - Deploy cards to 2x4 grid via applyAction (PHX-DEPLOY-001) — each player needs 8 deploys across columns 0-3 (2 cards per column: front then back row)
   - Execute an attack (PHX-COMBAT-001)
   - Check victory condition (PHX-VICTORY-001)
   - If reinforcement phase triggers, deploy a reinforcement card (PHX-REINFORCE-001)
4. Run `pnpm test:engine -- qa-smoke` and capture output
5. **Delete** `engine/tests/qa-smoke.test.ts` (always, even on failure)
6. Report results

## API Cheat Sheet

Use these exact signatures — do **not** guess. Copy-paste into the smoke test.

```typescript
// Import using the relative path — the test runs inside engine/tests/
import { createInitialState, drawCards, applyAction, checkVictory } from '../src/index.ts';
import type { GameState } from '@phalanxduel/shared';

// createInitialState takes a GameConfig object with players array and rngSeed
const state = createInitialState({
  players: [
    { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
    { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
  ] as [{ id: string; name: string }, { id: string; name: string }],
  rngSeed: 42,
});
// state.phase === 'setup' — must drawCards + set phase manually

// KEY DATA SHAPES — do not guess, use these exactly:
//   state.players[i].drawpile   — draw pile per player (lowercase, no capital P, NOT state.drawPile)
//   state.players[i].hand       — hand cards array
//   state.players[i].lifepoints — number
//   Battlefield                 — flat 8-element array: [BattlefieldCard | null, ...] (8 slots)
//                                 indices 0-3 = front row cols 0-3; indices 4-7 = back row cols 0-3
//   GamePhase values            — 'setup' | 'deployment' | 'combat' | 'reinforcement' | 'gameOver'
//                                 combat phase is 'combat', NOT 'battle'

// drawCards(state, playerIndex, count) -> GameState
let gs: GameState = drawCards(state, 0, 12);
gs = drawCards(gs, 1, 12);
gs = { ...gs, phase: 'deployment', activePlayerIndex: 0 };

// applyAction returns GameState DIRECTLY (not { state } or a result wrapper)

// DEPLOYMENT: fill both players' full 2×4 grids (8 cards each = 16 total deploys).
// Each column takes 2 cards: front row first, then back row.
// applyAction auto-advances activePlayerIndex after each deploy.
// CORRECT loop — 16 iterations, pairing rounds to columns so each column
// gets 2 cards before moving to the next:
for (let round = 0; round < 16; round++) {
  const pi = gs.activePlayerIndex as 0 | 1;
  const col = Math.floor(round / 2) % 4; // rounds 0-1 → col 0, 2-3 → col 1, ...
  gs = applyAction(gs, { type: 'deploy', playerIndex: pi, card: gs.players[pi]!.hand[0]!, column: col });
}
// After 16 deploys gs.phase automatically becomes 'combat'.

// For attack actions (only valid in 'combat' phase):
gs = applyAction(gs, {
  type: 'attack',
  playerIndex: gs.activePlayerIndex as 0 | 1,
  attackerPosition: { row: 0, col: 0 },
  targetPosition: { row: 0, col: 0 },
});

// For pass actions:
gs = applyAction(gs, { type: 'pass', playerIndex: gs.activePlayerIndex as 0 | 1 });

// For reinforce actions (only valid in 'reinforcement' phase):
if (gs.phase === 'reinforcement') {
  const pi = gs.activePlayerIndex as 0 | 1;
  gs = applyAction(gs, {
    type: 'reinforce',
    playerIndex: pi,
    card: gs.players[pi]!.hand[0]!,
  });
}

// checkVictory returns { winnerIndex: number; victoryType: VictoryType } | null
const winner = checkVictory(gs);
if (winner !== null) {
  console.log(winner.winnerIndex, winner.victoryType);
}
```

## Report Format

```markdown
## QA Smoke Test Report

| Step | Rule | Description | Status |
|------|------|-------------|--------|
| 1 | PHX-CARDS-001 | Create deck + initial state | PASS/FAIL/MISSING |
| 2 | PHX-DEPLOY-001 | Draw cards + set deployment | PASS/FAIL/MISSING |
| 3 | PHX-DEPLOY-001 | Deploy to grid | PASS/FAIL/MISSING |
| 4 | PHX-COMBAT-001 | Basic attack | PASS/FAIL/MISSING |
| 5 | PHX-VICTORY-001 | Victory check | PASS/FAIL/MISSING |
| 6 | PHX-REINFORCE-001 | Reinforcement (if triggered) | PASS/FAIL/MISSING/SKIPPED |

### Missing Functions
(List functions that don't exist yet)

### Failing Steps
(Error messages for each failure)

### Summary
- **Implemented:** X/6 steps
- **Next function needed:** <name> for <rule ID>
```

## Rules

1. **Always clean up** the temporary test file, even if tests fail.
2. **Adapt imports** to what actually exists — read the exports first.
3. **Use the API Cheat Sheet** above for correct function signatures. Do NOT guess at parameter shapes.
4. **MISSING** = function not exported. **FAIL** = exists but wrong behavior. **SKIPPED** = phase not reached.
5. Do not fix anything. Report only.
