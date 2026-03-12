# Deployment B Execution Plan — Match Parameters (TDD + Deployable Units)

**Date:** 2026-03-05  
**Branch:** `feat/configurable-grid-bot`  
**Scope:** Deployment B (`Task B1-B3`) with production-safe increments

## Goal

Ship configurable match parameters from WebSocket create flow through server state initialization, then expose client advanced options, using fully TDD increments where each commit is deployable and QA-gated.

## Current State (as of 2026-03-05)

- Deployment A is complete (bot flow shipped on branch).
- Next unfinished work is Deployment B.
- `createMatch` already uses options object signature in server (`createMatch(playerName, socket, options?)`).
- `ClientMessageSchema.createMatch` has `opponent` but does not yet have `matchParams`.
- Engine already supports `config.matchParams` for `{ rows, columns, maxHandSize, initialDraw }`.

## Guardrails Before Changes

- Keep `matchParams` backwards-compatible and optional.
- Do not regress existing bot match behavior.
- Normalize partial `matchParams` before calling engine so dependent fields are coherent.
- Keep schema constraints aligned with server metadata and tests.

## Unit 1 — Shared Contract (`matchParams` on createMatch)

**Deployable outcome:** shared protocol accepts optional partial `matchParams`.

**Files:**
- Modify: `shared/src/schema.ts`
- Modify: `shared/tests/schema.test.ts`

### TDD cycle

1. **Red**
   - Add tests asserting `ClientMessageSchema`:
     - accepts `createMatch` with no `matchParams`
     - accepts `createMatch` with partial `matchParams` (`rows`, `columns` only)
     - rejects out-of-range fields (`rows: 0`, `columns: 13`, etc.)
2. **Green**
   - Add `matchParams` to `ClientMessageSchema` createMatch variant as:
     - optional
     - partial object
     - fields: `rows`, `columns`, `maxHandSize`, `initialDraw`
3. **Refactor**
   - Extract shared inline schema constant for `CreateMatchParamsPartialSchema` to avoid duplication.

### QA gate

- `pnpm --filter @phalanxduel/shared vitest run tests/schema.test.ts`
- `pnpm --filter @phalanxduel/shared typecheck`
- `pnpm schema:check`

### Commit

- `feat(shared): add optional matchParams to createMatch websocket schema`

---

## Unit 2 — Server Core Support (normalize + initialize)

**Deployable outcome:** server can create matches with defaults or custom params safely.

**Files:**
- Modify: `server/src/match.ts`
- Create: `server/tests/custom-params-match.test.ts`

### TDD cycle

1. **Red**
   - Add tests covering:
     - full custom params (e.g. 3x3/3/12) flow into `match.state.params`
     - no `matchParams` yields default 2x4 behavior
     - partial params are normalized deterministically
2. **Green**
   - Extend match options and `MatchInstance` with `matchParams` support.
   - Add normalization helper (`resolveMatchParams`) that merges defaults and computes dependent fields when needed.
   - Pass resolved params to `createInitialState`.
3. **Refactor**
   - Keep parameter resolution in one helper used by both create and future surfaces.

### QA gate

- `pnpm --filter @phalanxduel/server vitest run tests/custom-params-match.test.ts`
- `pnpm --filter @phalanxduel/server vitest run tests/match.test.ts tests/bot-match.test.ts`
- `pnpm --filter @phalanxduel/server typecheck`

### Commit

- `feat(server): support normalized matchParams in match creation`

---

## Unit 3 — WebSocket Wiring + Integration Proof

**Deployable outcome:** clients can submit `matchParams` via WebSocket and receive correctly initialized game state.

**Files:**
- Modify: `server/src/app.ts`
- Modify: `server/tests/ws.test.ts`

### TDD cycle

1. **Red**
   - Add WS integration test:
     - send `createMatch` with `matchParams`
     - join second player
     - assert resulting `gameState.result.postState.params` matches expected values
2. **Green**
   - Thread `msg.matchParams` through `createMatch` options in app handler.
3. **Refactor**
   - Keep mapping logic consolidated with current `gameOptions`/`botOptions` mapping.

### QA gate

- `pnpm --filter @phalanxduel/server vitest run tests/ws.test.ts tests/custom-params-match.test.ts`
- `pnpm --filter @phalanxduel/server typecheck`

### Commit

- `feat(server): wire createMatch matchParams from websocket to MatchManager`

---

## Unit 4 — Deployment B Finish (Client Advanced Options + Smoke)

**Deployable outcome:** users can set grid size from lobby advanced options and create custom matches.

**Files:**
- Modify: `client/src/lobby.ts`
- Create: `client/tests/advanced-options.test.ts`
- (Optional) touch `server/src/app.ts` only if defaults metadata mismatch fix is included

### TDD cycle

1. **Red**
   - add advanced options tests: toggle rendering, collapsed by default, rows/columns inputs present when expanded.
2. **Green**
   - implement UI toggle + inputs.
   - fetch `/api/defaults` and use defaults/placeholders.
   - include selected values as `matchParams` in `createMatch` payload.
3. **Refactor**
   - extract payload builder in lobby to keep button handlers small.

### QA gate

- `pnpm --filter @phalanxduel/client vitest run tests/advanced-options.test.ts`
- `pnpm --filter @phalanxduel/client test`
- `pnpm -r test`

### Commit

- `feat(client): add advanced options UI and send matchParams in createMatch`

---

## Global Release Gate

Run before merge/deploy:

- `pnpm check:quick`
- `pnpm check:ci`

If any failure appears, fix in a small follow-up commit before merge.

## Task 1 Immediate Start Checklist

- [x] Baseline shared tests pass before introducing red test.
- [x] Confirm target insertion point in `ClientMessageSchema` createMatch variant.
- [ ] Define red tests in `shared/tests/schema.test.ts` for accept/reject matrix.
- [ ] Run focused shared test command to observe expected failure.
- [ ] Implement minimal schema change to turn tests green.

### Task 1 Prep Log (completed)

- Baseline test command passed:
  - `pnpm --filter @phalanxduel/shared test -- tests/schema.test.ts`
  - Result: 2 files, 18 tests passed.
- Baseline typecheck command passed:
  - `pnpm --filter @phalanxduel/shared typecheck`
- Schema verification command passed (escalated due sandbox IPC restriction):
  - `pnpm schema:check`
- Confirmed insertion point:
  - `shared/src/schema.ts` inside `ClientMessageSchema` createMatch variant.
