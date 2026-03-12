# Configurable Grid, AI Bot, and Advanced Match Creation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Decompose game.ts complexity hotspots (TDD), make grid dimensions dynamic end-to-end, add a server defaults endpoint with advanced match creation UI, and implement server-side AI bot with random and heuristic strategies.

**Architecture:** Bottom-up approach across 6 commits on one branch. Each commit is self-contained and testable. Engine stays pure/deterministic. Bot logic lives in engine/ as a pure function. Server manages bot turns with artificial delay. Client renders any grid the server sends.

**Tech Stack:** TypeScript 5.9.3, Vitest 4.0.18, Zod 4.3.6, Fastify 5.7.4, jsdom (client tests)

**Design doc:** `backlog/completed/docs/PLAN - 2026-03-02 - configurable-grid-bot-design.md`

---

## Commit 1: game.ts TDD Decomposition

### Task 1.1: Extract `applySuitAura` to shared card-utils.ts

**Files:**
- Create: `client/src/card-utils.ts`
- Create: `client/tests/card-utils.test.ts`
- Modify: `client/src/game.ts:116-120,244-248`
- Modify: `client/src/renderer.ts:144-153`

#### Step 1: Write the failing test

```typescript
// client/tests/card-utils.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { applySuitAura } from '../src/card-utils';

describe('applySuitAura', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('div');
  });

  it('adds pz-aura-diamonds class for diamonds suit', () => {
    applySuitAura(el, 'diamonds');
    expect(el.classList.contains('pz-aura-diamonds')).toBe(true);
  });

  it('adds pz-aura-hearts class for hearts suit', () => {
    applySuitAura(el, 'hearts');
    expect(el.classList.contains('pz-aura-hearts')).toBe(true);
  });

  it('adds pz-aura-clubs class for clubs suit', () => {
    applySuitAura(el, 'clubs');
    expect(el.classList.contains('pz-aura-clubs')).toBe(true);
  });

  it('adds pz-aura-spades class for spades suit', () => {
    applySuitAura(el, 'spades');
    expect(el.classList.contains('pz-aura-spades')).toBe(true);
  });

  it('removes previous aura before applying new one', () => {
    applySuitAura(el, 'diamonds');
    applySuitAura(el, 'hearts');
    expect(el.classList.contains('pz-aura-diamonds')).toBe(false);
    expect(el.classList.contains('pz-aura-hearts')).toBe(true);
  });
});
```

#### Step 2: Run test to verify it fails

Run: `cd client && pnpm vitest run tests/card-utils.test.ts`
Expected: FAIL — module `../src/card-utils` not found

#### Step 3: Write minimal implementation

```typescript
// client/src/card-utils.ts
import type { Suit } from '@phalanxduel/shared';

const AURA_CLASSES = [
  'pz-aura-diamonds',
  'pz-aura-hearts',
  'pz-aura-clubs',
  'pz-aura-spades',
] as const;

export function applySuitAura(element: HTMLElement, suit: Suit): void {
  element.classList.remove(...AURA_CLASSES);
  element.classList.add(`pz-aura-${suit}`);
}
```

#### Step 4: Run test to verify it passes

Run: `cd client && pnpm vitest run tests/card-utils.test.ts`
Expected: PASS (5 tests)

#### Step 5: Replace inline suit auras in game.ts and renderer.ts

In `game.ts`, replace lines 116-120 (renderBattlefield) and 244-248 (renderHand) with `applySuitAura(cell, bCard.card.suit)` and `applySuitAura(cardEl, card.suit)` respectively. Add import at top.

In `renderer.ts`, replace lines 144-153 (renderFloatingCard) with `applySuitAura(floatingEl, card.suit)`. Add import.

#### Step 6: Run all client tests

Run: `cd client && pnpm vitest run`
Expected: All existing tests still pass

#### Step 7: Commit

```bash
git add client/src/card-utils.ts client/tests/card-utils.test.ts client/src/game.ts client/src/renderer.ts
git commit -m "refactor(client): extract applySuitAura to card-utils.ts"
```

---

### Task 1.2: Extract `getPhaseLabel` and `getTurnIndicatorText` from renderGame

**Files:**
- Create: `client/tests/game-helpers.test.ts`
- Modify: `client/src/game.ts:458-494`

#### Step 1: Write the failing tests

```typescript
// client/tests/game-helpers.test.ts
import { describe, it, expect } from 'vitest';

// These will be extracted as exported-for-test functions
import { getPhaseLabel, getTurnIndicatorText } from '../src/game';

describe('getPhaseLabel', () => {
  it('returns "Deployment" for DeploymentPhase', () => {
    const gs = { phase: 'DeploymentPhase', reinforcement: null } as any;
    expect(getPhaseLabel(gs)).toBe('Deployment');
  });

  it('returns "Reinforce col N" for ReinforcementPhase', () => {
    const gs = { phase: 'ReinforcementPhase', reinforcement: { column: 2 } } as any;
    expect(getPhaseLabel(gs)).toBe('Reinforce col 3');
  });

  it('returns phase name as-is for other phases', () => {
    const gs = { phase: 'AttackPhase', reinforcement: null } as any;
    expect(getPhaseLabel(gs)).toBe('AttackPhase');
  });
});

describe('getTurnIndicatorText', () => {
  it('returns player name for spectators', () => {
    const gs = {
      activePlayerIndex: 0,
      players: [{ player: { name: 'Alice' } }, { player: { name: 'Bob' } }],
      phase: 'AttackPhase',
    } as any;
    expect(getTurnIndicatorText(gs, true, 0)).toEqual({
      text: "Alice's turn",
      isMyTurn: false,
    });
  });

  it('returns "Your turn" when active', () => {
    const gs = {
      activePlayerIndex: 0,
      players: [{ player: { name: 'Alice' } }, { player: { name: 'Bob' } }],
      phase: 'AttackPhase',
    } as any;
    expect(getTurnIndicatorText(gs, false, 0)).toEqual({
      text: 'Your turn',
      isMyTurn: true,
    });
  });

  it('returns "Opponent\'s turn" when not active', () => {
    const gs = {
      activePlayerIndex: 1,
      players: [{ player: { name: 'Alice' } }, { player: { name: 'Bob' } }],
      phase: 'AttackPhase',
    } as any;
    expect(getTurnIndicatorText(gs, false, 0)).toEqual({
      text: "Opponent's turn",
      isMyTurn: false,
    });
  });

  it('returns "Reinforce your column" during ReinforcementPhase when active', () => {
    const gs = {
      activePlayerIndex: 0,
      players: [{ player: { name: 'Alice' } }, { player: { name: 'Bob' } }],
      phase: 'ReinforcementPhase',
    } as any;
    expect(getTurnIndicatorText(gs, false, 0)).toEqual({
      text: 'Reinforce your column',
      isMyTurn: true,
    });
  });
});
```

#### Step 2: Run test to verify it fails

Run: `cd client && pnpm vitest run tests/game-helpers.test.ts`
Expected: FAIL — `getPhaseLabel` and `getTurnIndicatorText` not exported from game

#### Step 3: Extract and export the functions in game.ts

Add before `renderGame` in `game.ts`:

```typescript
export function getPhaseLabel(gs: GameState): string {
  if (gs.phase === 'ReinforcementPhase') {
    return `Reinforce col ${(gs.reinforcement?.column ?? 0) + 1}`;
  }
  if (gs.phase === 'DeploymentPhase') {
    return 'Deployment';
  }
  return gs.phase as string;
}

export function getTurnIndicatorText(
  gs: GameState,
  isSpectator: boolean,
  myIdx: number,
): { text: string; isMyTurn: boolean } {
  const isMyTurn = gs.activePlayerIndex === myIdx;
  if (isSpectator) {
    const activeName =
      gs.players[gs.activePlayerIndex]?.player.name ?? `Player ${gs.activePlayerIndex + 1}`;
    return { text: `${activeName}'s turn`, isMyTurn: false };
  }
  if (gs.phase === 'ReinforcementPhase') {
    return {
      text: isMyTurn ? 'Reinforce your column' : 'Opponent reinforcing',
      isMyTurn,
    };
  }
  return {
    text: isMyTurn ? 'Your turn' : "Opponent's turn",
    isMyTurn,
  };
}
```

Then replace lines 458-494 in `renderGame` to use these functions:

```typescript
  const phaseLabel = getPhaseLabel(gs);
  phaseText.textContent = `Phase: ${phaseLabel} | Turn: ${gs.turnNumber}`;
  // ...
  const turnInfo = getTurnIndicatorText(gs, isSpectator, myIdx);
  turnText.textContent = turnInfo.text;
  turnText.classList.add(turnInfo.isMyTurn ? 'my-turn' : 'opp-turn');
```

#### Step 4: Run tests

Run: `cd client && pnpm vitest run`
Expected: All tests pass

#### Step 5: Commit

```bash
git add client/src/game.ts client/tests/game-helpers.test.ts
git commit -m "refactor(client): extract getPhaseLabel and getTurnIndicatorText from renderGame"
```

---

### Task 1.3: Extract `getActionButtons` from renderGame

**Files:**
- Modify: `client/tests/game-helpers.test.ts`
- Modify: `client/src/game.ts:497-551`

#### Step 1: Write the failing tests

Append to `client/tests/game-helpers.test.ts`:

```typescript
import { getActionButtons } from '../src/game';

describe('getActionButtons', () => {
  it('returns pass+forfeit+help during AttackPhase on my turn', () => {
    const gs = { phase: 'AttackPhase', activePlayerIndex: 0 } as any;
    const buttons = getActionButtons(gs, false, 0, null);
    const labels = buttons.map((b) => b.label);
    expect(labels).toContain('Pass');
    expect(labels).toContain('Forfeit');
    expect(labels).toContain('Help ?');
    expect(labels).not.toContain('Cancel');
  });

  it('includes Cancel when attacker is selected', () => {
    const gs = { phase: 'AttackPhase', activePlayerIndex: 0 } as any;
    const buttons = getActionButtons(gs, false, 0, { row: 0, col: 1 });
    const labels = buttons.map((b) => b.label);
    expect(labels).toContain('Cancel');
  });

  it('returns only forfeit+help during ReinforcementPhase on my turn', () => {
    const gs = { phase: 'ReinforcementPhase', activePlayerIndex: 0 } as any;
    const buttons = getActionButtons(gs, false, 0, null);
    const labels = buttons.map((b) => b.label);
    expect(labels).toContain('Forfeit');
    expect(labels).toContain('Help ?');
    expect(labels).not.toContain('Pass');
  });

  it('returns only help for spectators', () => {
    const gs = { phase: 'AttackPhase', activePlayerIndex: 0 } as any;
    const buttons = getActionButtons(gs, true, 0, null);
    expect(buttons).toHaveLength(1);
    expect(buttons[0].label).toBe('Help ?');
  });

  it('returns only help when not my turn', () => {
    const gs = { phase: 'AttackPhase', activePlayerIndex: 1 } as any;
    const buttons = getActionButtons(gs, false, 0, null);
    expect(buttons).toHaveLength(1);
    expect(buttons[0].label).toBe('Help ?');
  });
});
```

#### Step 2: Run test to verify it fails

Run: `cd client && pnpm vitest run tests/game-helpers.test.ts`
Expected: FAIL — `getActionButtons` not exported

#### Step 3: Extract the function

Add to `game.ts`:

```typescript
export interface ActionButtonDescriptor {
  label: string;
  testId?: string;
  className?: string;
}

export function getActionButtons(
  gs: GameState,
  isSpectator: boolean,
  myIdx: number,
  selectedAttacker: GridPosition | null,
): ActionButtonDescriptor[] {
  const buttons: ActionButtonDescriptor[] = [];
  const isMyTurn = gs.activePlayerIndex === myIdx;

  if (!isSpectator && gs.phase === 'AttackPhase' && isMyTurn) {
    if (selectedAttacker) {
      buttons.push({ label: 'Cancel', testId: 'combat-cancel-btn' });
    }
    buttons.push({ label: 'Pass', testId: 'combat-pass-btn' });
  }

  if (
    !isSpectator &&
    (gs.phase === 'AttackPhase' || gs.phase === 'ReinforcementPhase') &&
    isMyTurn
  ) {
    buttons.push({ label: 'Forfeit', testId: 'combat-forfeit-btn', className: 'btn-forfeit' });
  }

  const showHelp = getState().showHelp;
  buttons.push({ label: showHelp ? 'Exit Help' : 'Help ?', className: 'help-btn' });

  return buttons;
}
```

Replace lines 497-551 in `renderGame` with a loop that creates buttons from descriptors, attaching the appropriate click handlers based on label.

#### Step 4: Run all tests

Run: `cd client && pnpm vitest run`
Expected: All pass

#### Step 5: Commit

```bash
git add client/src/game.ts client/tests/game-helpers.test.ts
git commit -m "refactor(client): extract getActionButtons from renderGame"
```

---

### Task 1.4: Extract `createBattlefieldCell` and `attachCellInteraction` from renderBattlefield

**Files:**
- Modify: `client/tests/game-helpers.test.ts`
- Modify: `client/src/game.ts:59-221`

#### Step 1: Write failing tests for createBattlefieldCell

```typescript
import { createBattlefieldCell } from '../src/game';

describe('createBattlefieldCell', () => {
  it('creates a div with class bf-cell', () => {
    const cell = createBattlefieldCell(null, { row: 0, col: 0 }, false);
    expect(cell.classList.contains('bf-cell')).toBe(true);
  });

  it('sets data-testid with player prefix when not opponent', () => {
    const cell = createBattlefieldCell(null, { row: 0, col: 2 }, false);
    expect(cell.getAttribute('data-testid')).toBe('player-cell-r0-c2');
  });

  it('sets data-testid with opponent prefix when isOpponent', () => {
    const cell = createBattlefieldCell(null, { row: 1, col: 3 }, true);
    expect(cell.getAttribute('data-testid')).toBe('opponent-cell-r1-c3');
  });

  it('marks empty cells with .empty class', () => {
    const cell = createBattlefieldCell(null, { row: 0, col: 0 }, false);
    expect(cell.classList.contains('empty')).toBe(true);
  });

  it('marks occupied cells and adds suit aura', () => {
    const bCard = {
      card: { face: '7', suit: 'hearts', value: 7, type: 'number', id: 'c1' },
      currentHp: 7,
      position: { row: 0, col: 0 },
      faceDown: false,
    };
    const cell = createBattlefieldCell(bCard as any, { row: 0, col: 0 }, false);
    expect(cell.classList.contains('occupied')).toBe(true);
    expect(cell.classList.contains('pz-aura-hearts')).toBe(true);
    expect(cell.querySelector('.card-rank')?.textContent).toBe('7');
    expect(cell.querySelector('.card-hp')?.textContent).toBe('7/7');
  });
});
```

#### Step 2: Run test to verify failure

Run: `cd client && pnpm vitest run tests/game-helpers.test.ts`
Expected: FAIL

#### Step 3: Extract createBattlefieldCell

Extract the cell creation + styling (lines 79-139 of the current renderBattlefield) into:

```typescript
export function createBattlefieldCell(
  bCard: BattlefieldCard | null | undefined,
  pos: GridPosition,
  isOpponent: boolean,
): HTMLElement {
  const cell = el('div', 'bf-cell');
  cell.setAttribute(
    'data-testid',
    `${isOpponent ? 'opponent' : 'player'}-cell-r${pos.row}-c${pos.col}`,
  );

  if (bCard) {
    cell.classList.add('occupied');
    if (isFace(bCard.card)) cell.classList.add('is-face');
    cell.style.borderColor = suitColor(bCard.card.suit);
    applySuitAura(cell, bCard.card.suit);

    const rankEl = el('div', 'card-rank');
    rankEl.textContent = bCard.card.face;
    rankEl.style.color = suitColor(bCard.card.suit);
    cell.appendChild(rankEl);

    const suitEl = el('div', 'card-pip');
    suitEl.textContent = suitSymbol(bCard.card.suit);
    suitEl.style.color = suitColor(bCard.card.suit);
    cell.appendChild(suitEl);

    const hpEl = el('div', 'card-hp');
    hpEl.textContent = hpDisplay(bCard);
    cell.appendChild(hpEl);

    const typeEl = el('div', 'card-type');
    typeEl.textContent = isWeapon(bCard.card.suit) ? 'ATK' : 'DEF';
    cell.appendChild(typeEl);
  } else {
    cell.classList.add('empty');
  }

  return cell;
}
```

Then similarly extract `attachCellInteraction` for the click handlers and phase-specific styling (multiplier tags, attack targeting, deployment, ghost targeting, reinforcement). The renderBattlefield function becomes a thin loop calling these two helpers.

#### Step 4: Run all tests

Run: `cd client && pnpm vitest run`
Expected: All pass

#### Step 5: Commit

```bash
git add client/src/game.ts client/tests/game-helpers.test.ts client/src/card-utils.ts
git commit -m "refactor(client): extract createBattlefieldCell and attachCellInteraction"
```

---

### Task 1.5: Verify complexity and update ESLint ratchet

**Files:**
- Modify: `eslint.config.js`

#### Step 1: Check complexity

Run: `cd client && pnpm lint 2>&1 | grep complexity` or check that lint passes with
a lower threshold.

#### Step 2: Lower ESLint complexity ratchet

In `eslint.config.js`, find the client/engine complexity override (currently 45)
and reduce it to match the new maximum (target: ~25).

#### Step 3: Run lint

Run: `pnpm lint`
Expected: PASS with the lowered threshold

#### Step 4: Run all tests

Run: `pnpm test`
Expected: All 169+ tests pass

#### Step 5: Commit

```bash
git add eslint.config.js
git commit -m "chore: lower ESLint complexity ratchet after game.ts decomposition"
```

---

## Commit 2: Dynamic Grid Rendering

### Task 2.1: Export DEFAULT_MATCH_PARAMS from shared

**Files:**
- Modify: `shared/src/schema.ts`
- Create: `shared/tests/defaults.test.ts`

#### Step 1: Write failing test

```typescript
// shared/tests/defaults.test.ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_MATCH_PARAMS, MatchParametersSchema } from '../src/schema';

describe('DEFAULT_MATCH_PARAMS', () => {
  it('has rows=2, columns=4 as default', () => {
    expect(DEFAULT_MATCH_PARAMS.rows).toBe(2);
    expect(DEFAULT_MATCH_PARAMS.columns).toBe(4);
  });

  it('passes MatchParametersSchema validation', () => {
    const result = MatchParametersSchema.safeParse(DEFAULT_MATCH_PARAMS);
    expect(result.success).toBe(true);
  });

  it('satisfies initialDraw formula (rows*columns + columns)', () => {
    expect(DEFAULT_MATCH_PARAMS.initialDraw).toBe(
      DEFAULT_MATCH_PARAMS.rows * DEFAULT_MATCH_PARAMS.columns + DEFAULT_MATCH_PARAMS.columns,
    );
  });
});
```

#### Step 2: Run test to verify failure

Run: `cd shared && pnpm vitest run tests/defaults.test.ts`
Expected: FAIL — `DEFAULT_MATCH_PARAMS` not exported

#### Step 3: Add the constant to schema.ts

Add after `MatchParametersSchema` definition in `shared/src/schema.ts`:

```typescript
export const DEFAULT_MATCH_PARAMS: z.infer<typeof MatchParametersSchema> = {
  specVersion: '1.0',
  classic: {
    enabled: true,
    mode: 'strict',
    battlefield: { rows: 2, columns: 4 },
    hand: { maxHandSize: 4 },
    start: { initialDraw: 12 },
    modes: {
      classicAces: true,
      classicFaceCards: true,
      damagePersistence: 'classic',
    },
    initiative: { deployFirst: 'P2', attackFirst: 'P1' },
    passRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
  },
  rows: 2,
  columns: 4,
  maxHandSize: 4,
  initialDraw: 12,
  modeClassicAces: true,
  modeClassicFaceCards: true,
  modeDamagePersistence: 'classic',
  modeClassicDeployment: true,
  modeSpecialStart: { enabled: false },
  initiative: { deployFirst: 'P2', attackFirst: 'P1' },
  modePassRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
};
```

#### Step 4: Run tests

Run: `cd shared && pnpm vitest run`
Expected: All pass

#### Step 5: Commit

```bash
git add shared/src/schema.ts shared/tests/defaults.test.ts
git commit -m "feat(shared): export DEFAULT_MATCH_PARAMS constant"
```

---

### Task 2.2: Parameterize engine grid dimensions

**Files:**
- Modify: `engine/src/state.ts:9-11,162-217,223-256`
- Modify: `engine/src/combat.ts:21-24,362-364,374`
- Create: `engine/tests/dynamic-grid.test.ts`

#### Step 1: Write failing tests for dynamic grid

```typescript
// engine/tests/dynamic-grid.test.ts
import { describe, it, expect } from 'vitest';
import { createInitialState, deployCard, getDeployTarget, advanceBackRow } from '../src/state';
import { isValidTarget } from '../src/combat';
import type { GameConfig } from '../src/state';

function makeConfig(rows: number, columns: number): GameConfig {
  return {
    matchId: '00000000-0000-0000-0000-000000000001',
    players: [
      { id: '00000000-0000-0000-0000-000000000010', name: 'P1' },
      { id: '00000000-0000-0000-0000-000000000020', name: 'P2' },
    ],
    rngSeed: 42,
    gameOptions: { damageMode: 'classic', startingLifepoints: 20 },
    matchParams: {
      rows,
      columns,
      maxHandSize: columns,
      initialDraw: rows * columns + columns,
    },
  };
}

describe('dynamic grid: 3x3', () => {
  it('creates battlefield with 9 slots for 3x3 grid', () => {
    const state = createInitialState(makeConfig(3, 3));
    expect(state.players[0].battlefield).toHaveLength(9);
    expect(state.players[1].battlefield).toHaveLength(9);
  });

  it('draws correct number of initial cards (3*3+3=12)', () => {
    const state = createInitialState(makeConfig(3, 3));
    expect(state.players[0].hand).toHaveLength(12);
  });

  it('validates target columns 0-2 for 3-column grid', () => {
    expect(isValidTarget([], 0, 3)).toBe(true);
    expect(isValidTarget([], 2, 3)).toBe(true);
    expect(isValidTarget([], 3, 3)).toBe(false);
  });
});

describe('dynamic grid: 1x4 (single row)', () => {
  it('creates battlefield with 4 slots', () => {
    const state = createInitialState(makeConfig(1, 4));
    expect(state.players[0].battlefield).toHaveLength(4);
  });
});
```

#### Step 2: Run test to verify failure

Run: `cd engine && pnpm vitest run tests/dynamic-grid.test.ts`
Expected: FAIL — battlefield length is always 8

#### Step 3: Parameterize the engine

In `engine/src/state.ts`:

- `emptyBattlefield(rows: number, columns: number)` → `Array(rows * columns).fill(null)`
- `createPlayerState` passes `rows, columns` to `emptyBattlefield`
- `createInitialState` reads `matchParams` from config to determine rows/columns/initialDraw, falling back to the existing defaults
- `deployCard` uses `params.rows * params.columns` for grid bounds instead of hardcoded 8
- Grid index math: `row * columns + col` (replace hardcoded `row * 4 + col`)
- `getDeployTarget`, `advanceBackRow`, `isColumnFull`, `getReinforcementTarget` — parameterize by `columns` instead of hardcoded `+ 4`

In `engine/src/combat.ts`:

- `isValidTarget(battlefield, targetColumn, columns?)` — accept optional columns param (default 4 for backward compat)
- `resolveAttack` — read `state.params.columns` for column calculations
- Front/back index: `frontIdx = column`, `backIdx = column + columns` (replace `+ 4`)

In `shared/src/schema.ts`:

- `BattlefieldSchema` — change `.length(8)` to variable: `z.array(z.union([BattlefieldCardSchema, z.null()]))` (remove fixed length, add min/max based on params in superRefine)

#### Step 4: Run all engine tests

Run: `cd engine && pnpm vitest run`
Expected: All 60 existing tests still pass (they use default 2x4)

#### Step 5: Run the new dynamic-grid tests

Run: `cd engine && pnpm vitest run tests/dynamic-grid.test.ts`
Expected: All pass

#### Step 6: Commit

```bash
git add engine/src/state.ts engine/src/combat.ts engine/tests/dynamic-grid.test.ts shared/src/schema.ts
git commit -m "feat(engine): parameterize grid dimensions for dynamic rows/columns"
```

---

### Task 2.3: Add auto-promote logic for deeper grids

**Files:**
- Modify: `engine/src/state.ts` (advanceBackRow → advanceColumn)
- Add tests to: `engine/tests/dynamic-grid.test.ts`

#### Step 1: Write failing test

```typescript
describe('advanceColumn (multi-row)', () => {
  it('promotes row 1 to row 0 in a 3-row grid', () => {
    const columns = 3;
    const bf = Array(9).fill(null);
    bf[3] = { card: { id: 'c1' }, position: { row: 1, col: 0 }, currentHp: 5, faceDown: false };
    const result = advanceColumn(bf, 0, 3, columns);
    expect(result[0]).toBeTruthy();
    expect(result[0].position.row).toBe(0);
    expect(result[3]).toBeNull();
  });

  it('cascades: row 2→1, row 1→0 when front is empty', () => {
    const columns = 3;
    const bf = Array(9).fill(null);
    bf[6] = { card: { id: 'c2' }, position: { row: 2, col: 0 }, currentHp: 3, faceDown: false };
    const result = advanceColumn(bf, 0, 3, columns);
    // Row 2 card should cascade to row 0 (via row 1 being empty)
    expect(result[0]).toBeTruthy();
    expect(result[6]).toBeNull();
  });
});
```

#### Step 2: Run to verify failure

#### Step 3: Extend advanceBackRow → advanceColumn

Rename `advanceBackRow` to `advanceColumn` and generalize for N rows:

```typescript
export function advanceColumn(
  battlefield: Battlefield,
  column: number,
  rows: number,
  columns: number,
): Battlefield {
  const newBf = [...battlefield] as Battlefield;
  // Shift cards forward: for each row from front to back,
  // if empty, pull from the next occupied row behind it
  for (let row = 0; row < rows - 1; row++) {
    const idx = row * columns + column;
    if (newBf[idx] === null) {
      // Find first occupied row behind
      for (let behindRow = row + 1; behindRow < rows; behindRow++) {
        const behindIdx = behindRow * columns + column;
        if (newBf[behindIdx] !== null) {
          newBf[idx] = { ...newBf[behindIdx]!, position: { row, col: column } };
          newBf[behindIdx] = null;
          break;
        }
      }
    }
  }
  return newBf;
}
```

Update callers (combat cleanup) to use `advanceColumn` with `state.params.rows` and `state.params.columns`.

#### Step 4: Run all engine tests

Run: `cd engine && pnpm vitest run`
Expected: All pass

#### Step 5: Commit

```bash
git add engine/src/state.ts engine/src/combat.ts engine/tests/dynamic-grid.test.ts
git commit -m "feat(engine): add cascading auto-promote for multi-row grids"
```

---

### Task 2.4: Update client grid rendering for dynamic dimensions

**Files:**
- Modify: `client/src/game.ts` (renderBattlefield loop)
- Add tests to: `client/tests/game-helpers.test.ts`

#### Step 1: Write failing test

```typescript
describe('renderBattlefield with 3x3 grid', () => {
  it('renders 9 cells for a 3x3 grid', () => {
    const gs = {
      phase: 'AttackPhase',
      activePlayerIndex: 0,
      params: { rows: 3, columns: 3 },
      players: [{
        battlefield: Array(9).fill(null),
        player: { name: 'Test' },
      }, {
        battlefield: Array(9).fill(null),
        player: { name: 'Opp' },
      }],
      reinforcement: null,
      transactionLog: [],
    } as any;

    const state = { playerIndex: 0, selectedAttacker: null, selectedDeployCard: null } as any;
    const { renderBattlefield } = await import('../src/game');
    const grid = renderBattlefield(gs, 0, state, false);
    const cells = grid.querySelectorAll('.bf-cell');
    expect(cells.length).toBe(9);
  });
});
```

#### Step 2: Update renderBattlefield

Replace hardcoded `for (const row of rowOrder)` + `for (let col = 0; col < 4; col++)` with:

```typescript
const rows = gs.params?.rows ?? 2;
const columns = gs.params?.columns ?? 4;
const rowOrder = isOpponent
  ? Array.from({ length: rows }, (_, i) => rows - 1 - i)
  : Array.from({ length: rows }, (_, i) => i);

for (const row of rowOrder) {
  for (let col = 0; col < columns; col++) {
    const gridIdx = row * columns + col;
    // ... rest of cell creation
  }
}
```

Also update CSS grid template:

```typescript
grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
```

#### Step 3: Run all client tests

Run: `cd client && pnpm vitest run`
Expected: All pass

#### Step 4: Commit

```bash
git add client/src/game.ts client/tests/game-helpers.test.ts
git commit -m "feat(client): render dynamic grid dimensions from params"
```

---

## Commit 3: Server Defaults Endpoint

### Task 3.1: Add GET /api/defaults endpoint

**Files:**
- Modify: `server/src/app.ts`
- Create: `server/tests/defaults-endpoint.test.ts`

#### Step 1: Write failing test

```typescript
// server/tests/defaults-endpoint.test.ts
import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app';

describe('GET /api/defaults', () => {
  it('returns 200 with default match parameters', async () => {
    const app = await buildApp();
    const response = await app.inject({ method: 'GET', url: '/api/defaults' });
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.rows).toBe(2);
    expect(body.columns).toBe(4);
    expect(body.maxHandSize).toBe(4);
    expect(body.initialDraw).toBe(12);
    expect(body.startingLifepoints).toBe(20);
  });

  it('includes _meta with constraints', async () => {
    const app = await buildApp();
    const response = await app.inject({ method: 'GET', url: '/api/defaults' });
    const body = JSON.parse(response.body);
    expect(body._meta).toBeDefined();
    expect(body._meta.constraints.rows.min).toBe(1);
    expect(body._meta.constraints.rows.max).toBe(12);
  });
});
```

#### Step 2: Run to verify failure

Run: `cd server && pnpm vitest run tests/defaults-endpoint.test.ts`
Expected: FAIL — 404

#### Step 3: Add the endpoint

In `server/src/app.ts`, add after the health endpoint:

```typescript
import { DEFAULT_MATCH_PARAMS } from '@phalanxduel/shared';

app.get('/api/defaults', async () => ({
  ...DEFAULT_MATCH_PARAMS,
  startingLifepoints: 20,
  _meta: {
    configSource: 'shared/src/schema.ts → DEFAULT_MATCH_PARAMS',
    constraints: {
      rows: { min: 1, max: 12 },
      columns: { min: 1, max: 4 },
      maxHandSize: { min: 0, note: 'must be <= columns' },
      initialDraw: { note: 'rows * columns + columns' },
      startingLifepoints: { min: 1, max: 500 },
      totalSlots: { note: 'rows * columns <= 48' },
    },
    botStrategies: ['random', 'heuristic'],
  },
}));
```

#### Step 4: Run tests

Run: `cd server && pnpm vitest run`
Expected: All pass

#### Step 5: Commit

```bash
git add server/src/app.ts server/tests/defaults-endpoint.test.ts shared/src/schema.ts
git commit -m "feat(server): add GET /api/defaults endpoint for match parameters"
```

---

## Commit 4: Advanced Match Creation Screen

### Task 4.1: Extend createMatch to accept matchParams

**Files:**
- Modify: `shared/src/schema.ts` (ClientMessageSchema)
- Modify: `server/src/app.ts` (createMatch handler)
- Modify: `server/src/match.ts` (MatchInstance, createMatch, joinMatch)
- Add tests to: `server/tests/match.test.ts`

#### Step 1: Extend ClientMessageSchema

In `shared/src/schema.ts`, update the createMatch message:

```typescript
z.object({
  type: z.literal('createMatch'),
  playerName: z.string(),
  gameOptions: GameOptionsSchema.optional(),
  matchParams: MatchParametersSchema.partial().optional(),  // NEW
  rngSeed: z.number().optional(),
}),
```

#### Step 2: Update server to merge matchParams

In `server/src/app.ts` createMatch handler, read `msg.matchParams` and pass to
`matchManager.createMatch`. In `server/src/match.ts`, store matchParams on the
MatchInstance and pass to `createInitialState` when the game starts.

In `engine/src/state.ts`, `createInitialState` merges incoming matchParams with
defaults:

```typescript
const params = { ...DEFAULT_MATCH_PARAMS, ...config.matchParams };
```

#### Step 3: Write test for custom grid match

```typescript
it('creates a 3x3 match when matchParams specify rows=3, columns=3', async () => {
  // Create match with custom params via WebSocket message
  // Verify state.params.rows === 3, state.params.columns === 3
});
```

#### Step 4: Run all tests

Run: `pnpm test`
Expected: All pass

#### Step 5: Commit

```bash
git add shared/src/schema.ts server/src/app.ts server/src/match.ts engine/src/state.ts
git commit -m "feat: accept matchParams in createMatch for custom grid configurations"
```

---

### Task 4.2: Build collapsible advanced options UI

**Files:**
- Modify: `client/src/lobby.ts`
- Modify: `client/src/state.ts` (add matchParams to AppState)
- Create: `client/tests/advanced-options.test.ts`

#### Step 1: Write tests for the advanced options form

```typescript
// client/tests/advanced-options.test.ts
describe('advanced match options', () => {
  it('renders "Advanced Options" toggle button', async () => {
    const container = document.createElement('div');
    const { renderLobby } = await import('../src/lobby');
    renderLobby(container);
    const toggle = container.querySelector('[data-testid="advanced-toggle"]');
    expect(toggle).toBeTruthy();
    expect(toggle?.textContent).toContain('Advanced');
  });

  it('advanced panel is collapsed by default', async () => {
    const container = document.createElement('div');
    const { renderLobby } = await import('../src/lobby');
    renderLobby(container);
    const panel = container.querySelector('[data-testid="advanced-panel"]');
    expect(panel?.classList.contains('is-open')).toBe(false);
  });

  it('renders grid size inputs (rows, columns)', async () => {
    const container = document.createElement('div');
    const { renderLobby } = await import('../src/lobby');
    renderLobby(container);
    // Toggle open first
    const toggle = container.querySelector('[data-testid="advanced-toggle"]') as HTMLElement;
    toggle.click();
    expect(container.querySelector('[data-testid="adv-rows"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="adv-columns"]')).toBeTruthy();
  });
});
```

#### Step 2: Build the advanced options section

In `client/src/lobby.ts`, after the LP row and before the button row, add:

- "Advanced Options" toggle button (same pattern as the help toggle)
- Collapsible panel with:
  - Grid: rows input (1-12), columns input (1-4)
  - Hand: maxHandSize, initialDraw (auto-calculated with override)
  - Rules: ace rules checkbox, face cards checkbox, damage persistence select, deployment toggle
  - Initiative: deploy first (P1/P2 select), attack first (P1/P2 select)
  - Pass rules: consecutive limit, total limit
  - Opponent: Human / Bot-Random / Bot-Heuristic select
- Fetch defaults from `GET /api/defaults` on load, use as placeholder values
- Store selections in AppState
- Send as `matchParams` in the createMatch message

#### Step 3: Add matchParams to AppState

In `client/src/state.ts`, add optional `matchParams` field and a setter.

#### Step 4: Run all client tests

Run: `cd client && pnpm vitest run`
Expected: All pass

#### Step 5: Commit

```bash
git add client/src/lobby.ts client/src/state.ts client/tests/advanced-options.test.ts
git commit -m "feat(client): add collapsible advanced match options with all parameters"
```

---

## Commit 5: AI Bot Engine Logic

### Task 5.1: Create bot with random strategy

**Files:**
- Create: `engine/src/bot.ts`
- Create: `engine/tests/bot.test.ts`
- Modify: `engine/src/index.ts` (export)

#### Step 1: Write failing tests

```typescript
// engine/tests/bot.test.ts
import { describe, it, expect } from 'vitest';
import { computeBotAction } from '../src/bot';
import { createInitialState, applyAction } from '../src/state';
import type { GameState, Action } from '@phalanxduel/shared';

function makeGameAtPhase(phase: string): GameState {
  const config = {
    matchId: '00000000-0000-0000-0000-000000000001',
    players: [
      { id: '00000000-0000-0000-0000-000000000010', name: 'Human' },
      { id: '00000000-0000-0000-0000-000000000020', name: 'Bot' },
    ],
    rngSeed: 42,
  };
  let state = createInitialState(config);
  state = applyAction(state, { type: 'system:init', timestamp: '2026-01-01T00:00:00.000Z' });
  // Navigate to desired phase...
  return state;
}

describe('computeBotAction', () => {
  it('returns a deploy action during DeploymentPhase', () => {
    const state = makeGameAtPhase('DeploymentPhase');
    const action = computeBotAction(state, 1, { strategy: 'random', seed: 42 });
    expect(action.type).toBe('deploy');
    expect(action.playerIndex).toBe(1);
  });

  it('returns an attack or pass during AttackPhase', () => {
    const state = makeGameAtPhase('AttackPhase');
    const action = computeBotAction(state, 1, { strategy: 'random', seed: 42 });
    expect(['attack', 'pass']).toContain(action.type);
  });

  it('is deterministic given the same seed', () => {
    const state = makeGameAtPhase('DeploymentPhase');
    const a1 = computeBotAction(state, 1, { strategy: 'random', seed: 99 });
    const a2 = computeBotAction(state, 1, { strategy: 'random', seed: 99 });
    expect(a1).toEqual(a2);
  });

  it('produces different actions with different seeds', () => {
    const state = makeGameAtPhase('DeploymentPhase');
    const a1 = computeBotAction(state, 1, { strategy: 'random', seed: 1 });
    const a2 = computeBotAction(state, 1, { strategy: 'random', seed: 2 });
    // Not guaranteed to differ, but statistically likely
    // Just verify both are valid
    expect(a1.type).toBe('deploy');
    expect(a2.type).toBe('deploy');
  });
});
```

#### Step 2: Run to verify failure

Run: `cd engine && pnpm vitest run tests/bot.test.ts`
Expected: FAIL — module not found

#### Step 3: Implement bot.ts

```typescript
// engine/src/bot.ts
import type { GameState, Action, Battlefield, Card } from '@phalanxduel/shared';
import { getDeployTarget, getReinforcementTarget } from './state.js';

export interface BotConfig {
  strategy: 'random' | 'heuristic';
  seed?: number;
  aggressiveness?: number; // 0-1, used by heuristic
}

/** Simple seeded PRNG (mulberry32) for deterministic bot decisions */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

export function computeBotAction(
  gs: GameState,
  playerIndex: 0 | 1,
  config: BotConfig,
): Action {
  const rng = mulberry32(config.seed ?? Date.now());
  const timestamp = new Date().toISOString();

  if (config.strategy === 'random') {
    return randomStrategy(gs, playerIndex, rng, timestamp);
  }
  return heuristicStrategy(gs, playerIndex, rng, timestamp, config.aggressiveness ?? 0.5);
}

function randomStrategy(
  gs: GameState,
  playerIndex: 0 | 1,
  rng: () => number,
  timestamp: string,
): Action {
  const player = gs.players[playerIndex]!;
  const columns = gs.params?.columns ?? 4;

  switch (gs.phase) {
    case 'DeploymentPhase': {
      const hand = player.hand;
      if (hand.length === 0) {
        return { type: 'pass', playerIndex, timestamp };
      }
      const card = pickRandom(hand, rng);
      // Find a valid deployment column
      const validCols: number[] = [];
      for (let col = 0; col < columns; col++) {
        if (getDeployTarget(player.battlefield, col) !== null) {
          validCols.push(col);
        }
      }
      if (validCols.length === 0) {
        return { type: 'pass', playerIndex, timestamp };
      }
      const col = pickRandom(validCols, rng);
      return { type: 'deploy', playerIndex, column: col, cardId: card.id, timestamp };
    }

    case 'AttackPhase': {
      // Find front-row cards that can attack
      const attackers: number[] = [];
      for (let col = 0; col < columns; col++) {
        const idx = col; // front row = index 0..columns-1
        if (player.battlefield[idx]) {
          attackers.push(col);
        }
      }
      if (attackers.length === 0 || rng() < 0.2) {
        return { type: 'pass', playerIndex, timestamp };
      }
      const atkCol = pickRandom(attackers, rng);
      return {
        type: 'attack',
        playerIndex,
        attackingColumn: atkCol,
        defendingColumn: atkCol,
        timestamp,
      };
    }

    case 'ReinforcementPhase': {
      const hand = player.hand;
      if (hand.length === 0 || !gs.reinforcement) {
        return { type: 'pass', playerIndex, timestamp };
      }
      const card = pickRandom(hand, rng);
      return { type: 'reinforce', playerIndex, cardId: card.id, timestamp };
    }

    default:
      return { type: 'pass', playerIndex, timestamp };
  }
}
```

#### Step 4: Export from engine/src/index.ts

Add: `export { computeBotAction } from './bot.js';`
Add: `export type { BotConfig } from './bot.js';`

#### Step 5: Run tests

Run: `cd engine && pnpm vitest run`
Expected: All pass

#### Step 6: Commit

```bash
git add engine/src/bot.ts engine/tests/bot.test.ts engine/src/index.ts
git commit -m "feat(engine): add bot with random strategy for AI opponent"
```

---

### Task 5.2: Add heuristic strategy

**Files:**
- Modify: `engine/src/bot.ts`
- Add tests to: `engine/tests/bot.test.ts`

#### Step 1: Write failing tests

```typescript
describe('heuristic strategy', () => {
  it('prefers attacking low-HP defenders', () => {
    // Set up a state where one column has a 1 HP defender
    // and another has an 11 HP defender
    // Heuristic should prefer attacking the 1 HP defender
    const state = makeStateWithDefenders([
      { col: 0, hp: 1 },
      { col: 1, hp: 11 },
    ]);
    const action = computeBotAction(state, 0, { strategy: 'heuristic', seed: 42 });
    expect(action.type).toBe('attack');
    if (action.type === 'attack') {
      expect(action.defendingColumn).toBe(0);
    }
  });

  it('prefers deploying weapons (spades/clubs) to front row', () => {
    // Set up hand with mixed suits, verify weapon suit deployed
    const state = makeStateForDeploy();
    const action = computeBotAction(state, 1, { strategy: 'heuristic', seed: 42 });
    expect(action.type).toBe('deploy');
  });
});
```

#### Step 2: Implement heuristic strategy

The heuristic scores each valid action and picks the highest. Key scoring:
- Attack: prefer targets with low HP (higher score for easy kills)
- Attack: prefer weapon attackers (2x multiplier)
- Deploy: prefer weapons in front row, shields in back row
- Reinforce: prefer highest-value card
- Pass: low score (last resort)

#### Step 3: Run tests

Run: `cd engine && pnpm vitest run`
Expected: All pass

#### Step 4: Commit

```bash
git add engine/src/bot.ts engine/tests/bot.test.ts
git commit -m "feat(engine): add heuristic bot strategy with scoring"
```

---

## Commit 6: Bot Server Integration

### Task 6.1: Wire bot into server match management

**Files:**
- Modify: `server/src/match.ts`
- Modify: `shared/src/schema.ts` (add opponent field)
- Create: `server/tests/bot-match.test.ts`

#### Step 1: Write failing test

```typescript
// server/tests/bot-match.test.ts
import { describe, it, expect } from 'vitest';
import { MatchManager } from '../src/match';

describe('bot match', () => {
  it('creates a match with bot opponent that auto-starts', () => {
    const manager = new MatchManager();
    const mockSocket = { readyState: 1, send: vi.fn() } as any;
    const result = manager.createMatch('Human', mockSocket, undefined, undefined, {
      opponent: 'bot-random',
      botConfig: { strategy: 'random', seed: 42 },
    });
    expect(result.matchId).toBeTruthy();
    // Bot match should auto-initialize (no need for second player join)
    const match = manager.matches.get(result.matchId);
    expect(match?.state).toBeTruthy(); // Game started immediately
  });

  it('bot responds after human action', async () => {
    const manager = new MatchManager();
    const mockSocket = { readyState: 1, send: vi.fn() } as any;
    const { matchId, playerId } = manager.createMatch('Human', mockSocket, undefined, undefined, {
      opponent: 'bot-random',
      botConfig: { strategy: 'random', seed: 42 },
    });
    // Human makes a deploy action
    // Bot should automatically respond
    const match = manager.matches.get(matchId);
    expect(match?.state?.phase).toBeDefined();
  });
});
```

#### Step 2: Extend MatchManager.createMatch

Add optional `botOptions` parameter:

```typescript
interface BotMatchOptions {
  opponent: 'bot-random' | 'bot-heuristic';
  botConfig: BotConfig;
}
```

When creating a bot match:
1. Create the match with the human player
2. Create a virtual bot player (no socket)
3. Auto-initialize the game state immediately
4. After each human action, schedule bot response with configurable delay

#### Step 3: Schedule bot turns

After `handleAction` broadcasts state, check if the next active player is the bot.
If so, compute and apply the bot action after a delay:

```typescript
private async scheduleBotTurn(match: MatchInstance): Promise<void> {
  if (!match.botConfig || !match.state) return;
  if (match.state.phase === 'gameOver') return;

  const botIdx = match.botPlayerIndex;
  if (match.state.activePlayerIndex !== botIdx) return;

  const delay = match.botConfig.thinkDelayMs ?? 500;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const action = computeBotAction(match.state, botIdx, match.botConfig);
  await this.handleAction(match.matchId, match.players[botIdx]!.playerId, action);
}
```

#### Step 4: Run server tests

Run: `cd server && pnpm vitest run`
Expected: All pass

#### Step 5: Commit

```bash
git add server/src/match.ts shared/src/schema.ts server/tests/bot-match.test.ts
git commit -m "feat(server): wire bot into match management with auto-turn scheduling"
```

---

### Task 6.2: Add "vs Bot" option to lobby UI

**Files:**
- Modify: `client/src/lobby.ts`
- Add tests to: `client/tests/advanced-options.test.ts`

#### Step 1: Write failing test

```typescript
it('renders bot opponent select in advanced options', async () => {
  const container = document.createElement('div');
  const { renderLobby } = await import('../src/lobby');
  renderLobby(container);
  const toggle = container.querySelector('[data-testid="advanced-toggle"]') as HTMLElement;
  toggle.click();
  const botSelect = container.querySelector('[data-testid="adv-opponent"]') as HTMLSelectElement;
  expect(botSelect).toBeTruthy();
  expect(botSelect.options).toHaveLength(3); // Human, Bot-Random, Bot-Heuristic
});
```

#### Step 2: Add opponent select to advanced panel

In the advanced options panel (built in Task 4.2), add a select for opponent type:

```typescript
const oppLabel = el('label', 'options-label');
oppLabel.textContent = 'Opponent:';
const oppSelect = document.createElement('select');
oppSelect.className = 'mode-select';
oppSelect.setAttribute('data-testid', 'adv-opponent');
for (const [value, text] of [
  ['human', 'Human Player'],
  ['bot-random', 'Bot (Random)'],
  ['bot-heuristic', 'Bot (Heuristic)'],
]) {
  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = text;
  oppSelect.appendChild(opt);
}
```

#### Step 3: Send opponent type in createMatch

When opponent is not 'human', include `botOptions` in the createMatch message:

```typescript
if (opponent !== 'human') {
  createMessage.botOptions = {
    opponent,
    botConfig: { strategy: opponent.replace('bot-', '') as any, seed: seedFromUrl() },
  };
}
```

#### Step 4: Run all tests

Run: `pnpm test`
Expected: All pass

#### Step 5: Commit

```bash
git add client/src/lobby.ts client/tests/advanced-options.test.ts
git commit -m "feat(client): add 'vs Bot' option to advanced match creation"
```

---

## Final Verification

### Run full test suite

```bash
pnpm test
```

Expected: All tests pass (original 169 + new tests)

### Run typecheck

```bash
pnpm typecheck
```

Expected: Zero errors

### Run lint

```bash
pnpm lint
```

Expected: Pass with lowered complexity threshold

### Run QA playthrough

```bash
BASE_URL=http://localhost:5173 MAX_GAMES=1 pnpm qa:playthrough:ui
```

Expected: Successful game completion

### Run bot match manually

1. Start server: `pnpm dev`
2. Open browser, create match with "Bot (Random)" opponent in advanced options
3. Verify bot responds to human actions with ~500ms delay
4. Complete a full game against the bot
