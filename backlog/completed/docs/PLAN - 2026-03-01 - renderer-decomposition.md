# Renderer Decomposition Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Decompose `client/src/renderer.ts` (1,431 LOC) into focused screen-per-module files while preserving all behavior, using TDD to characterize and verify.

**Architecture:** Pure extract-and-delegate refactor. Each screen gets its own module. Shared helpers (`el`, `renderError`, `makeCopyBtn`, `renderHealthBadge`) stay in `renderer.ts` as exports. Extracted modules import what they need. `renderer.ts` becomes a thin dispatcher (~200 LOC).

**Tech Stack:** TypeScript, Vitest 4.0.18, jsdom (for DOM testing), existing pnpm monorepo

---

## Task 0: Set up client test infrastructure

**Files:**
- Create: `client/vitest.config.ts`
- Create: `client/tests/smoke.test.ts`
- Modify: `client/package.json`
- Modify: `client/tsconfig.json`

#### Step 1: Add jsdom to client devDependencies and test script

Run: `cd client && pnpm add -D jsdom`

Then add to `client/package.json` scripts: `"test": "vitest run"`

#### Step 2: Create `client/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import { preferTsSourceImports } from '../scripts/build/resolve-source';

export default defineConfig({
  plugins: [preferTsSourceImports()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
```

#### Step 3: Extend `client/tsconfig.json` include to cover tests

Add `"tests"` to the include array.

#### Step 4: Write a smoke test

Create `client/tests/smoke.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('client test infrastructure', () => {
  it('has a working DOM environment', () => {
    const div = document.createElement('div');
    div.id = 'app';
    document.body.appendChild(div);
    expect(document.getElementById('app')).toBeTruthy();
    div.remove();
  });
});
```

#### Step 5: Run and verify

Run: `cd client && pnpm test`
Expected: 1 test passes.

Run: `pnpm test` (root)
Expected: 141 tests pass (140 existing + 1 new).

#### Step 6: Commit

```text
git add client/vitest.config.ts client/tests/smoke.test.ts client/package.json client/tsconfig.json pnpm-lock.yaml
git commit -m "test(client): add vitest + jsdom test infrastructure"
```

---

## Task 1: Extract `game-over.ts`

The smallest extraction. `renderGameOver` (lines 1113-1175) depends on `el`, `getLifepoints`, and `resetToLobby`.

**Files:**
- Create: `client/src/game-over.ts`
- Create: `client/tests/game-over.test.ts`
- Modify: `client/src/renderer.ts`

#### Step 1: Write the characterization test

Create `client/tests/game-over.test.ts` with tests for:
- Renders game-over wrapper with `data-testid="game-over"`
- Shows "You Win!" when player wins (winnerIndex matches playerIndex)
- Shows "You Lose" when player loses
- Shows victory type ("LP Depletion") and turn number
- Renders Play Again button with `data-testid="play-again-btn"`

#### Step 2: Create `client/src/game-over.ts`

Move `renderGameOver` function. Add local `getLifepoints` helper (2 lines).

Imports needed:
- `type { GameState }` from `@phalanxduel/shared`
- `type { AppState }` and `resetToLobby` from `./state`
- `el` from `./renderer`

#### Step 3: Export `el` from renderer.ts

Change `function el(` to `export function el(`.

#### Step 4: Update renderer.ts

- Add import: `import { renderGameOver } from './game-over'`
- Remove the `renderGameOver` function body
- Keep `getLifepoints` (still used by `renderStatsSidebar`)

#### Step 5: Run tests

Run: `cd client && pnpm test && cd .. && pnpm test`
Expected: All tests pass.

#### Step 6: Commit

```text
git add client/src/game-over.ts client/tests/game-over.test.ts client/src/renderer.ts
git commit -m "refactor(client): extract game-over.ts from renderer"
```

---

## Task 2: Extract `help.ts`

`renderHelpMarker`, `renderHelpOverlay`, and `HELP_CONTENT` (lines 1307-1371).

**Files:**
- Create: `client/src/help.ts`
- Create: `client/tests/help.test.ts`
- Modify: `client/src/renderer.ts`

#### Step 1: Write the characterization test

Create `client/tests/help.test.ts` with tests for:
- `renderHelpMarker` adds a `?` button when `showHelp` is true
- `renderHelpMarker` does nothing for unknown keys
- `renderHelpOverlay` creates overlay on `document.body` with correct title
- `renderHelpOverlay` does nothing for unknown keys
- `HELP_CONTENT` has entries for all expected keys (lp, battlefield, hand, stats, log)

Mock `../src/state` to return `{ showHelp: true }` from `getState`.

#### Step 2: Create `client/src/help.ts`

Move: `HELP_CONTENT`, `renderHelpMarker`, `renderHelpOverlay`.

Imports: `getState` from `./state`, `el` from `./renderer`.

#### Step 3: Update renderer.ts

- Remove the 3 symbols
- Import `renderHelpMarker` from `./help` (used by functions still in renderer)

#### Step 4: Run tests, commit

```text
git commit -m "refactor(client): extract help.ts from renderer"
```

---

## Task 3: Extract `debug.ts`

The Sentry "Trigger Test Error" button (currently inline in `renderLobby`).

**Files:**
- Create: `client/src/debug.ts`
- Create: `client/tests/debug.test.ts`
- Modify: `client/src/renderer.ts`

#### Step 1: Write the characterization test

Create `client/tests/debug.test.ts` with tests for:
- Renders a button with "Trigger Test Error" text
- Button throws `Error('Sentry Verification Error')` on click

#### Step 2: Create `client/src/debug.ts`

```typescript
import { el } from './renderer';

export function renderDebugButton(container: HTMLElement): void {
  const testErrorBtn = el('button', 'btn btn-tiny');
  testErrorBtn.textContent = 'Trigger Test Error';
  testErrorBtn.style.marginTop = '1rem';
  testErrorBtn.style.opacity = '0.5';
  testErrorBtn.addEventListener('click', () => {
    throw new Error('Sentry Verification Error');
  });
  container.appendChild(testErrorBtn);
}
```

#### Step 3: In `renderLobby` (still in renderer.ts), replace inline button code with:

```typescript
import { renderDebugButton } from './debug';
// inside renderLobby:
renderDebugButton(wrapper);
```

#### Step 4: Run tests, commit

```text
git commit -m "refactor(client): extract debug.ts from renderer"
```

---

## Task 4: Extract `lobby.ts`

Largest extraction: `renderLobby`, `renderJoinViaLink`, `renderWatchConnecting`, `renderWaiting`, `validatePlayerName`, `seedFromUrl`.

**Files:**
- Create: `client/src/lobby.ts`
- Create: `client/tests/lobby.test.ts`
- Modify: `client/src/renderer.ts`

#### Step 1: Write the characterization test

Create `client/tests/lobby.test.ts` with tests for:
- `renderLobby`: renders lobby wrapper with title "Phalanx Duel"
- `renderLobby`: renders name input with `data-testid="lobby-name-input"`
- `renderLobby`: renders Create Match and Join Match buttons
- `renderWaiting`: renders match ID display
- `validatePlayerName`: rejects empty/short names, accepts valid names, rejects symbol-only names

Mock `../src/state` module.

#### Step 2: Create `client/src/lobby.ts`

Move 6 functions. Imports needed:
- `type { DamageMode }` from `@phalanxduel/shared`
- State: `getState`, `setPlayerName`, `setDamageMode`, `setStartingLifepoints`, `resetToLobby`
- Renderer: `el`, `renderError`, `makeCopyBtn`, `getConnection`, `renderHealthBadge`
- Debug: `renderDebugButton`

#### Step 3: Add exports to renderer.ts

Export: `renderError`, `makeCopyBtn`, `renderHealthBadge`.

Add new getter:
```typescript
export function getConnection(): Connection | null {
  return connection;
}
```

#### Step 4: Update renderer.ts

- Remove 6 functions
- Import from `./lobby`
- `render()` switch cases now resolve via import

#### Step 5: Run tests, commit

```text
git commit -m "refactor(client): extract lobby.ts from renderer"
```

---

## Task 5: Extract `game.ts`

Second largest: `renderGame` + all sub-renderers.

**Files:**
- Create: `client/src/game.ts`
- Create: `client/tests/game.test.ts`
- Modify: `client/src/renderer.ts`

#### Step 1: Write the characterization test

Create `client/tests/game.test.ts` with tests for:
- Renders game layout with `data-testid="game-layout"`
- Shows phase and turn info
- Shows "Your turn" / "Opponent's turn" correctly
- Shows pass button during attack phase
- Renders both battlefields
- Returns early if no gameState

Mock `../src/state` module.

#### Step 2: Create `client/src/game.ts`

Move 11 symbols: `sendAttack`, `getLifepoints`, `makeStatsRow`, `makeCardStatsRow`, `BONUS_LABELS`, `renderBattlefield`, `renderHand`, `renderBattleLog`, `renderStatsSidebar`, `renderInGameInvite`, `renderGame`.

Imports:
- Shared types: `GridPosition`, `GameState`, `Card`, `CombatLogEntry`
- State: `selectAttacker`, `selectDeployCard`, `clearSelection`, `getState`, `toggleHelp`
- Renderer: `el`, `makeCopyBtn`, `getConnection`, `renderHealthBadge`
- Help: `renderHelpMarker`
- Cards: `cardLabel`, `hpDisplay`, `suitColor`, `suitSymbol`, `isWeapon`, `isFace`

#### Step 3: Clean up renderer.ts

- Remove 11 functions
- Remove now-unused imports (card helpers, state functions)
- Import `renderGame` from `./game`

#### Step 4: Run tests, commit

```text
git commit -m "refactor(client): extract game.ts from renderer"
```

---

## Task 6: Clean up renderer.ts and ratchet ESLint

**Files:**
- Modify: `client/src/renderer.ts`
- Modify: `eslint.config.js`

#### Step 1: Verify renderer.ts is ~200 LOC

Run: `wc -l client/src/renderer.ts`

#### Step 2: Remove unused imports

#### Step 3: Lower ESLint complexity for client

In `eslint.config.js` line 65, lower from 45 to 25:
```javascript
complexity: ['error', 25],
```

#### Step 4: Run lint, typecheck, and full test suite

```text
pnpm lint && pnpm typecheck && pnpm test
```

#### Step 5: Commit

```text
git commit -m "refactor(client): clean up renderer.ts, lower complexity to 25"
```

---

## Task 7: Update TODO.md

Mark P1-001 as complete.

```text
git commit -m "docs: mark P1-001 renderer decomposition as complete"
```

---

## Summary

| Task | Module | LOC moved | New tests |
|------|--------|-----------|-----------|
| 0 | Test infra | 0 | 1 |
| 1 | game-over.ts | ~65 | 5 |
| 2 | help.ts | ~70 | 5 |
| 3 | debug.ts | ~15 | 2 |
| 4 | lobby.ts | ~450 | 5 |
| 5 | game.ts | ~460 | 7 |
| 6 | Cleanup | 0 | 0 |
| 7 | Docs | 0 | 0 |

After: `renderer.ts` drops from 1,431 to ~200 LOC. Client complexity ratchets from 45 to 25.
