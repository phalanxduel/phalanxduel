# Integration Gap Fixes — Third-Party Client Contract Hardening

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three contract bugs identified by a third-party SwiftUI client, document informational gaps in RULE_AMENDMENTS.md, and create backlog entries for larger work items.

**Architecture:** Server-authoritative fixes in `server/src/match.ts` and `server/src/app.ts`. No schema field renames (avoiding breaking wire changes). New `RULE_AMENDMENTS.md` documents terminology and versioning clarifications.

**Tech Stack:** TypeScript, Vitest, Fastify, Zod, WebSocket

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `server/src/match.ts` | Modify | Fix preState bug in broadcastState; add lastPreState to MatchInstance; reject invalid match params |
| `server/src/app.ts` | Modify | Fix totalSlots metadata from 144 to 48 |
| `server/tests/prestate-broadcast.test.ts` | Create | Test that WS broadcasts send correct preState |
| `server/tests/defaults-endpoint.test.ts` | Modify | Add assertion for totalSlots constraint accuracy |
| `server/tests/custom-params-match.test.ts` | Modify | Add rejection tests for invalid param overrides |
| `docs/RULE_AMENDMENTS.md` | Create | Document terminology drift and version semantics |
| `GLOSSARY.md` | Modify | Add wire-format note for Graveyard/discardPile |
| `backlog/tasks/task-48 - OpenAPI-Response-Schema-Enrichment.md` | Create | Backlog for OpenAPI gap |
| `backlog/tasks/task-49 - Version-Semantics-Documentation.md` | Create | Backlog for SCHEMA_VERSION vs specVersion docs |

---

### Task 1: Fix `preState` Bug in WebSocket Broadcasts

The `broadcastState` method at `server/src/match.ts:694` sends `preState: match.state` — but `match.state` has already been mutated to the postState. The telemetry path (line 563-608) correctly captures preState, but the broadcast path does not.

**Fix strategy:** Add `lastPreState` field to `MatchInstance`. Set it before mutation in `handleAction` and `initializeGame`. Thread it through `broadcastState`.

**Files:**
- Modify: `server/src/match.ts:81-98` (MatchInstance interface)
- Modify: `server/src/match.ts:559-572` (handleAction — capture preState before mutation)
- Modify: `server/src/match.ts:507-521` (initializeGame — capture preInitState)
- Modify: `server/src/match.ts:694-748` (broadcastState — use lastPreState)
- Create: `server/tests/prestate-broadcast.test.ts`

- [ ] **Step 1: Write failing test — preState differs from postState in broadcast**

```typescript
// server/tests/prestate-broadcast.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchManager } from '../src/match.js';
import type { WebSocket } from 'ws';

function mockSocket(): WebSocket {
  return {
    send: vi.fn(),
    readyState: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    on: vi.fn(),
    close: vi.fn(),
  } as unknown as WebSocket;
}

function parseSentMessages(socket: WebSocket): unknown[] {
  return (socket.send as ReturnType<typeof vi.fn>).mock.calls.map(
    ([raw]: [string]) => JSON.parse(raw),
  );
}

describe('preState broadcast correctness', () => {
  let manager: MatchManager;

  beforeEach(() => {
    manager = new MatchManager();
  });

  it('broadcasts preState that differs from postState after an action', async () => {
    const ws1 = mockSocket();
    const ws2 = mockSocket();

    const { matchId } = manager.createMatch('Alice', ws1);
    await manager.joinMatch(matchId, 'Bob', ws2);

    // Get initial game state from the broadcast
    const initMessages = parseSentMessages(ws2);
    const initMsg = initMessages.find(
      (m: any) => m.type === 'gameState',
    ) as any;
    expect(initMsg).toBeDefined();

    // Clear mocks to isolate next broadcast
    (ws1.send as ReturnType<typeof vi.fn>).mockClear();
    (ws2.send as ReturnType<typeof vi.fn>).mockClear();

    // Get a card from player 1's hand to deploy
    const match = await manager.getMatch(matchId);
    const p1Hand = match!.state!.players[0]!.hand;
    expect(p1Hand.length).toBeGreaterThan(0);
    const cardId = p1Hand[0]!.id;

    // Deploy a card (player index 0 = Alice)
    const p1 = match!.players[0]!;
    await manager.handleAction(matchId, p1.playerId, {
      type: 'deploy',
      playerIndex: 0,
      column: 0,
      cardId,
      timestamp: new Date().toISOString(),
    });

    // Check that broadcast was sent with a real preState
    const actionMessages = parseSentMessages(ws1);
    const gameStateMsg = actionMessages.find(
      (m: any) => m.type === 'gameState',
    ) as any;
    expect(gameStateMsg).toBeDefined();

    // The key assertion: preState and postState MUST differ after a deploy action.
    // Before the fix, broadcastState reads match.state (already reassigned to
    // postState), so preState and postState were identical.
    const { preState, postState } = gameStateMsg.result;
    // After a deploy, the phase or battlefield changes — serialized forms must differ
    expect(JSON.stringify(preState)).not.toBe(JSON.stringify(postState));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @phalanxduel/server exec vitest run tests/prestate-broadcast.test.ts`
Expected: FAIL — preState equals postState because of the aliasing bug

- [ ] **Step 3: Add `lastPreState` to MatchInstance and capture it**

In `server/src/match.ts`, add `lastPreState` to the `MatchInstance` interface (line ~95):

```typescript
// Add after line 94 (lastEvents)
lastPreState: GameState | null;
```

Update match creation in `createMatch` (where the MatchInstance literal is constructed) to initialize:

```typescript
lastPreState: null,
```

In `initializeGame` (line ~508), capture preState before mutation:

```typescript
const preInitState = createInitialState(config);
// Store pre-init state for the initial broadcast
match.lastPreState = preInitState;
```

In `handleAction` (line ~563), capture preState before mutation:

```typescript
const preState = match.state!;
// Store for broadcastState to use
match.lastPreState = preState;
```

- [ ] **Step 4: Fix `broadcastState` to use `lastPreState`**

In `broadcastState` (line ~694), replace `preState: match.state` with `match.lastPreState`:

```typescript
// Line 719 — for players
preState: match.lastPreState ?? match.state,

// Line 738 — for spectators (apply spectator filtering)
preState: match.lastPreState
  ? filterStateForSpectator(match.lastPreState)
  : match.state,
```

Also apply player-specific filtering to the player preState. Note: today
the broadcast sends unfiltered `match.state` as preState — this is already
a bug (leaks opponent hand). Applying filtering to preState is an intentional
contract tightening that aligns with how postState is already filtered:

```typescript
// Line 719
preState: match.lastPreState
  ? filterStateForPlayer(match.lastPreState, player.playerIndex)
  : match.state,
```

**Important:** `match.lastPreState` is set inside the `await`ed
`GameTelemetry.recordAction` callback (line 562), so it is guaranteed to
be populated before `broadcastState` is called at line 615.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @phalanxduel/server exec vitest run tests/prestate-broadcast.test.ts`
Expected: PASS

- [ ] **Step 6: Run full server test suite for regressions**

Run: `pnpm --filter @phalanxduel/server test`
Expected: All ~200 tests pass

- [ ] **Step 7: Commit**

```bash
git add server/src/match.ts server/tests/prestate-broadcast.test.ts
git commit -m "fix(server): send correct preState in WS gameState broadcasts

Previously broadcastState read match.state after mutation, so preState
and postState were identical. Now handleAction and initializeGame
snapshot lastPreState before applying the action."
```

---

### Task 2: Fix `/api/defaults` totalSlots Metadata

**Files:**
- Modify: `server/src/app.ts:323`
- Modify: `server/tests/defaults-endpoint.test.ts`

- [ ] **Step 1: Write failing test — totalSlots constraint matches RULES.md**

Add to `server/tests/defaults-endpoint.test.ts`:

```typescript
it('totalSlots constraint matches RULES.md § 3.3 (max 48)', async () => {
  const response = await request.get('/api/defaults');
  expect(response.body._meta.constraints.totalSlots.note).toBe('rows * columns <= 48');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @phalanxduel/server exec vitest run tests/defaults-endpoint.test.ts`
Expected: FAIL — returns "rows * columns <= 144"

- [ ] **Step 3: Fix the metadata in app.ts**

In `server/src/app.ts:323`, change:

```typescript
// Before:
totalSlots: { note: 'rows * columns <= 144' },
// After:
totalSlots: { note: 'rows * columns <= 48' },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @phalanxduel/server exec vitest run tests/defaults-endpoint.test.ts`
Expected: PASS (all tests in file)

- [ ] **Step 5: Commit**

```bash
git add server/src/app.ts server/tests/defaults-endpoint.test.ts
git commit -m "fix(api): align /api/defaults totalSlots with RULES.md § 3.3 (48, not 144)"
```

---

### Task 3: Reject Invalid Match Parameter Overrides

RULES.md § 3.2 says "Match creation MUST be rejected if Configuration violates Global System Constraints." Currently `resolveMatchParams` silently clamps `maxHandSize` and overrides `initialDraw`.

**Fix strategy:** When explicit values are provided and they violate constraints, throw a `MatchError` instead of normalizing. Default-filling (when values are omitted) remains unchanged.

**Timing:** `resolveMatchParams` is called inside `initializeGame`, which is called from `joinMatch` (or `createMatch` for bot matches). So rejection happens at game-start time, not match-creation time. The tests correctly expect `joinMatch` to throw.

**Files:**
- Modify: `server/src/match.ts:100-113` (resolveMatchParams)
- Modify: `server/tests/custom-params-match.test.ts`

- [ ] **Step 1: Write failing tests — invalid params are rejected**

Add to `server/tests/custom-params-match.test.ts`:

```typescript
it('rejects explicit maxHandSize exceeding columns', async () => {
  const ws1 = mockSocket();
  const ws2 = mockSocket();
  const { matchId } = manager.createMatch('Player1', ws1, {
    matchParams: { columns: 3, maxHandSize: 10 },
  });
  await expect(manager.joinMatch(matchId, 'Player2', ws2)).rejects.toThrow(
    /maxHandSize.*cannot exceed.*columns/i,
  );
});

it('rejects explicit initialDraw that violates formula', async () => {
  const ws1 = mockSocket();
  const ws2 = mockSocket();
  const { matchId } = manager.createMatch('Player1', ws1, {
    matchParams: { rows: 2, columns: 4, initialDraw: 99 },
  });
  await expect(manager.joinMatch(matchId, 'Player2', ws2)).rejects.toThrow(
    /initialDraw.*must equal/i,
  );
});

it('rejects rows * columns exceeding 48 total slots', async () => {
  const ws1 = mockSocket();
  const ws2 = mockSocket();
  const { matchId } = manager.createMatch('Player1', ws1, {
    matchParams: { rows: 10, columns: 10 },
  });
  await expect(manager.joinMatch(matchId, 'Player2', ws2)).rejects.toThrow(
    /total slots.*cannot exceed 48/i,
  );
});

it('still fills defaults when params are omitted (no rejection)', async () => {
  const ws1 = mockSocket();
  const ws2 = mockSocket();
  const { matchId } = manager.createMatch('Player1', ws1, {
    matchParams: { columns: 3 },
  });
  await manager.joinMatch(matchId, 'Player2', ws2);
  const match = await manager.getMatch(matchId);
  // maxHandSize defaults to DEFAULT but clamped to columns=3
  expect(match?.state?.params.maxHandSize).toBe(3);
  // initialDraw computed from formula
  expect(match?.state?.params.initialDraw).toBe(2 * 3 + 3); // rows=2(default), columns=3
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @phalanxduel/server exec vitest run tests/custom-params-match.test.ts`
Expected: FAIL — the rejection tests don't throw (silent normalization)

- [ ] **Step 3: Rewrite `resolveMatchParams` to reject invalid explicit overrides**

Replace `resolveMatchParams` in `server/src/match.ts:100-113`:

```typescript
function resolveMatchParams(
  matchParams?: CreateMatchParamsPartial,
): NonNullable<GameConfig['matchParams']> {
  const rows = matchParams?.rows ?? DEFAULT_MATCH_PARAMS.rows;
  const columns = matchParams?.columns ?? DEFAULT_MATCH_PARAMS.columns;

  // RULES.md § 3.3: Total slots cannot exceed 48
  if (rows * columns > 48) {
    throw new MatchError(
      `Invalid config: total slots (${rows * columns}) cannot exceed 48`,
      'INVALID_MATCH_PARAMS',
    );
  }

  // RULES.md § 3.3: maxHandSize cannot exceed columns
  const defaultMaxHandSize = Math.min(DEFAULT_MATCH_PARAMS.maxHandSize, columns);
  if (matchParams?.maxHandSize !== undefined && matchParams.maxHandSize > columns) {
    throw new MatchError(
      `Invalid config: maxHandSize (${matchParams.maxHandSize}) cannot exceed columns (${columns})`,
      'INVALID_MATCH_PARAMS',
    );
  }
  const maxHandSize = matchParams?.maxHandSize ?? defaultMaxHandSize;

  // RULES.md § 3.3: initialDraw = rows * columns + columns
  const expectedInitialDraw = rows * columns + columns;
  if (matchParams?.initialDraw !== undefined && matchParams.initialDraw !== expectedInitialDraw) {
    throw new MatchError(
      `Invalid config: initialDraw must equal rows * columns + columns (${expectedInitialDraw})`,
      'INVALID_MATCH_PARAMS',
    );
  }
  const initialDraw = expectedInitialDraw;

  return { rows, columns, maxHandSize, initialDraw };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @phalanxduel/server exec vitest run tests/custom-params-match.test.ts`
Expected: PASS (all tests including existing ones)

- [ ] **Step 5: Update the existing normalization test**

The existing test `'normalizes partial params deterministically'` (line 57) should still pass because it sends `columns: 2, maxHandSize: 2` which is valid (maxHandSize <= columns). Verify it still passes.

- [ ] **Step 6: Run full server test suite for regressions**

Run: `pnpm --filter @phalanxduel/server test`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add server/src/match.ts server/tests/custom-params-match.test.ts
git commit -m "fix(server): reject invalid match param overrides per RULES.md § 3.2

resolveMatchParams now throws MatchError for explicitly invalid values
(maxHandSize > columns, wrong initialDraw formula, totalSlots > 48)
instead of silently normalizing. Default-filling for omitted params is
unchanged."
```

---

### Task 4: Create RULE_AMENDMENTS.md and Update GLOSSARY.md

Document the two informational gaps without breaking wire format.

**Files:**
- Create: `docs/RULE_AMENDMENTS.md` (colocated with `docs/RULES.md`)
- Modify: `GLOSSARY.md:50-51`

- [ ] **Step 1: Create docs/RULE_AMENDMENTS.md**

```markdown
# Phalanx Duel — Rule Amendments

Amendments, clarifications, and errata to RULES.md that do not change the
wire protocol or game logic. For breaking changes, update RULES.md directly
and bump `specVersion`.

---

## RA-001: Wire-Format Terminology — Graveyard vs `discardPile`

**Date:** 2026-03-17
**Affects:** RULES.md § 2 (Canonical Vocabulary), GLOSSARY.md

RULES.md and GLOSSARY.md use the term **Graveyard** for destroyed/discarded
cards. The wire-format field in `PlayerStateSchema` is `discardPile`.

**Resolution:** Both terms refer to the same game concept. The canonical
gameplay term is **Graveyard**. The wire-format field name `discardPile`
is retained for backward compatibility. Clients SHOULD display "Graveyard"
in UI and documentation while reading the `discardPile` field from state.

A future major schema version MAY rename the field; this will be
a breaking change coordinated through `specVersion`.

---

## RA-002: `SCHEMA_VERSION` vs `specVersion` Semantics

**Date:** 2026-03-17
**Affects:** `shared/src/schema.ts`

Two version identifiers exist in the schema:

| Identifier | Current Value | Purpose |
|------------|---------------|---------|
| `SCHEMA_VERSION` | `0.3.0-rev.8` | Runtime/transport schema revision. Tracks TypeScript type changes, field additions, protocol evolution. Follows semver. |
| `specVersion` | `1.0` | Game rules specification version. Tracks gameplay logic changes (attack resolution, suit effects, turn lifecycle). Matches RULES.md version. |

**Resolution:** These are intentionally separate. External clients should:
- Use `specVersion` to determine gameplay compatibility
- Use `SCHEMA_VERSION` to determine wire-format compatibility
- Display them separately if surfacing version info to users

---

## RA-003: Match Parameter Override Contract

**Date:** 2026-03-17
**Affects:** RULES.md § 3.2

When a client sends `CreateMatchParamsPartial`:
- **Omitted fields** are filled from `DEFAULT_MATCH_PARAMS`
- **Explicitly invalid values** (violating § 3.3 Global System Constraints)
  are **rejected** with error code `INVALID_MATCH_PARAMS`

The server does NOT silently normalize explicit overrides. This was corrected
in the same commit that introduced this amendment.
```

- [ ] **Step 2: Add wire-format note to GLOSSARY.md**

After the Graveyard entry (line ~51), add:

```markdown
> **Wire format:** The state field is named `discardPile` in `PlayerStateSchema` for historical reasons. See `RULE_AMENDMENTS.md` RA-001.
```

- [ ] **Step 3: Commit**

```bash
git add docs/RULE_AMENDMENTS.md GLOSSARY.md
git commit -m "docs: add RULE_AMENDMENTS.md for terminology and version clarifications

RA-001: Graveyard vs discardPile wire-format mapping
RA-002: SCHEMA_VERSION vs specVersion semantics
RA-003: Match parameter override rejection contract"
```

---

### Task 5: Create Backlog Entries for Larger Work Items

Two new backlog tasks for items that need more design work.

**Files:**
- Create: `backlog/tasks/task-48 - OpenAPI-Response-Schema-Enrichment.md`
- Create: `backlog/tasks/task-49 - Version-Semantics-Documentation.md`

- [ ] **Step 1: Create TASK-48 for OpenAPI enrichment**

```markdown
---
id: TASK-48
title: OpenAPI Response Schema Enrichment
status: To Do
assignee: []
created_date: '2026-03-17'
updated_date: '2026-03-17'
labels: [api, contract]
dependencies: []
priority: medium
ordinal: 4800
---

## Description

The OpenAPI output at `/docs/json` has empty `components.schemas` and many
routes return only `Default Response`. External clients cannot use codegen
tools against the published surface.

## Problem Scenario

Given a third-party client developer runs codegen against `/docs/json`,
when they inspect the generated types, then they get empty or untyped
response models because schemas are not published.

## Planned Change

1. Add Fastify response schemas (using Zod-to-JSON-Schema) to all public
   REST routes (`/api/defaults`, `/matches`, `/api/stats/*`, `/api/ladder/*`)
2. Register shared schemas in `components.schemas` via Swagger plugin
3. Update `server/tests/openapi.test.ts` snapshot to verify schemas appear
4. Ensure `/docs/json` passes a basic OpenAPI validator

## Verification

- `pnpm --filter @phalanxduel/server test` — all tests pass
- `GET /docs/json` contains non-empty `components.schemas`
- A codegen tool (e.g., `openapi-typescript`) produces typed output
```

- [ ] **Step 2: Create TASK-49 for version semantics documentation**

```markdown
---
id: TASK-49
title: Version Semantics Documentation for External Clients
status: To Do
assignee: []
created_date: '2026-03-17'
updated_date: '2026-03-17'
labels: [docs, contract]
dependencies: []
priority: low
ordinal: 4900
---

## Description

External clients need clear guidance on which version identifier to use
for compatibility checks. RULE_AMENDMENTS.md RA-002 provides the basic
clarification but a dedicated versioning guide would help.

## Planned Change

1. Add a `docs/VERSIONING.md` explaining the version scheme
2. Add version fields to the `/api/defaults` response metadata
3. Document the compatibility matrix (which specVersion works with which
   SCHEMA_VERSION ranges)

## Verification

- `docs/VERSIONING.md` exists with clear guidance
- `/api/defaults` response includes version metadata
- RULE_AMENDMENTS.md RA-002 links to the new doc
```

- [ ] **Step 3: Link TASK-32 to the feedback**

TASK-32 (JSON Schema for Public Event Envelopes) already covers the event
contract gap. No new task needed — just note the external consumer demand
in the task description if desired.

- [ ] **Step 4: Commit**

```bash
git add backlog/tasks/task-48* backlog/tasks/task-49*
git commit -m "chore(backlog): add TASK-48 (OpenAPI schemas) and TASK-49 (version docs)

Driven by third-party SwiftUI client integration feedback."
```
