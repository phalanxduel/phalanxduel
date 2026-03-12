# P1-001: Renderer Decomposition Design

**Date:** 2026-03-01
**Status:** Approved
**Scope:** Pure extract-and-delegate refactor of `client/src/renderer.ts` (1,431 LOC)

## Problem

`renderer.ts` is the largest file in the codebase. It handles DOM construction,
event binding, state rendering, card layout, battlefield rendering, lobby UI,
game-over screen, help overlays, and debug tools in a single module. This makes
it difficult to test, review, or extend individual UI concerns.

## Approach: Screen-per-module with dependency injection

Each screen gets its own module. Shared helpers (`el`, `renderError`, etc.)
stay in `renderer.ts` and are imported by the new modules.

## Module Map (after decomposition)

```text
client/src/
  renderer.ts    (~200 LOC) — render() dispatcher, shared helpers, floating card
  lobby.ts       (~450 LOC) — lobby, waiting, join-via-link, watch-connecting
  game.ts        (~460 LOC) — game screen, battlefield, hand, battle log, stats
  game-over.ts   (~60 LOC)  — game over screen
  help.ts        (~70 LOC)  — help markers, overlays, HELP_CONTENT
  debug.ts       (~15 LOC)  — Sentry test error button
```

## Shared Dependencies

| Function           | Strategy                                    |
|--------------------|---------------------------------------------|
| `el()`             | Export from renderer.ts                     |
| `renderError()`    | Export from renderer.ts                     |
| `makeCopyBtn()`    | Export from renderer.ts                     |
| `getConnection()`  | New getter exported from renderer.ts        |
| `validatePlayerName()` | Moves to lobby.ts (only consumer)       |
| `seedFromUrl()`    | Moves to lobby.ts (only consumer)           |

## Module Contracts

```typescript
// lobby.ts
export function renderLobby(container: HTMLElement): void;
export function renderJoinViaLink(container: HTMLElement, matchId: string, mode: string | null): void;
export function renderWaiting(container: HTMLElement, state: AppState): void;
export function renderWatchConnecting(container: HTMLElement, matchId: string): void;

// game.ts
export function renderGame(container: HTMLElement, state: AppState): void;

// game-over.ts
export function renderGameOver(container: HTMLElement, state: AppState): void;

// help.ts
export function renderHelpMarker(key: string, container: HTMLElement): void;
export function renderHelpOverlay(key: string): void;

// debug.ts
export function renderDebugButton(container: HTMLElement): void;
```

## TDD Loop (per extraction)

1. Set up client vitest + jsdom (one-time, first extraction)
2. Red: write characterization test for the target screen
3. Green: verify it passes against the monolith
4. Refactor: extract to new module, update imports
5. Green: verify the same test still passes

## Extraction Order

1. **game-over.ts** — smallest, fewest deps, low-risk warmup
2. **help.ts** — small, self-contained, no connection dependency
3. **debug.ts** — tiny Sentry button extraction
4. **lobby.ts** — largest extraction (4 functions + helpers)
5. **game.ts** — second largest (renderGame + sub-renderers)
6. **Cleanup** — lower ESLint max-complexity from 45 toward 25

## Constraints

- No behavior changes — pure extract-and-delegate
- Each extraction is independently shippable
- All existing tests (140) must remain green throughout
- Lower client `max-complexity` ESLint override after extractions
