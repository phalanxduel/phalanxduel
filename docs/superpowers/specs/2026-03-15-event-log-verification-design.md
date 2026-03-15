# Event Log Verification — Design Spec

**Task:** TASK-45.7
**Date:** 2026-03-15
**Status:** Approved

## Overview

Closes the trustworthiness loop on the Phalanx event log by adding three
machine-verifiable guarantees: a dual-layer coverage harness, deterministic
fingerprinting tests, and the `turnHash` canonical field from RULES.md §20.2.

## Goals

1. **Coverage harness** — catch regressions where a new action type has no
   branch in `deriveEventsFromEntry`, both at compile time (TypeScript) and at
   runtime (importable harness + CI script).
2. **Deterministic fingerprinting** — prove that replaying the same match twice
   produces identical event arrays and identical fingerprints, and that the
   fingerprint is independently re-derivable from the event array alone.
3. **`turnHash`** — implement RULES.md §20.2's `TurnHash` field end-to-end:
   schema, hash helper, server population.

## Non-Goals

- No client UI changes (TASK-45.6 handles that).
- No changes to how events are stored or queried (TASK-45.4/45.5 already done).
- No breaking schema changes — `turnHash` is optional.

---

## Component 1: Event Log Coverage Harness

### Dual-purpose design

`scripts/ci/verify-event-log.ts` is both a **CLI entrypoint** and an
**importable harness module**. The exported function returns structured results
that callers (CI, tests, QA tools, replay validators) can interpret.

```typescript
export interface CoverageResult {
  actionType: string;   // e.g. 'system:init', 'deploy', 'attack', ...
  detailType: string;   // the TransactionDetail discriminant exercised
  eventCount: number;   // events produced
  schemaErrors: string[];
  passed: boolean;
}

export function verifyEventLogCoverage(): CoverageResult[]
```

The CLI entrypoint (bottom of file) calls `verifyEventLogCoverage()`, prints
failures, and exits non-zero if any result has `passed === false`.

### Coverage matrix

The harness constructs a minimal `TransactionLogEntry` fixture for each case:

| Case | `action.type` | `details.type` | Path exercised |
|------|--------------|----------------|----------------|
| 1 | `system:init` | `'n/a'` (bypasses switch) | outer `if` branch |
| 2 | `deploy` | `deploy` | switch case |
| 3 | `attack` | `attack` | switch case |
| 4 | `pass` | `pass` | switch case |
| 5 | `reinforce` | `reinforce` | switch case |
| 6 | `forfeit` | `forfeit` | switch case |

Fixtures reuse patterns from `engine/tests/events.test.ts` (same mock shapes).
Each case asserts: `eventCount > 0` AND all events pass `PhalanxEventSchema.safeParse`.

### CI registration

```json
"rules:check": "tsx scripts/ci/verify-doc-fsm-consistency.ts && tsx scripts/ci/verify-event-log.ts"
```

---

## Component 2: TypeScript Exhaustiveness in `events.ts`

Add `assertNever` as the `default` case of the `switch (details.type)` block
in `engine/src/events.ts`. TypeScript's discriminated union narrowing will
produce a compile error if a new `TransactionDetail` variant is added without a
corresponding branch — caught by `pnpm typecheck` before any test runs.

```typescript
function assertNever(x: never): never {
  throw new Error(`Unhandled details type: ${JSON.stringify(x)}`);
}

switch (details.type) {
  case 'attack': { ... break; }
  case 'deploy': { ... break; }
  case 'reinforce': { ... break; }
  case 'pass': { ... break; }
  case 'forfeit': { ... break; }
  default: assertNever(details);
}
```

This is belt to the harness's suspenders: the harness catches behavioral drift
(a branch exists but produces invalid output), TypeScript catches structural
gaps (no branch at all).

---

## Component 3: Determinism Test

New `describe` block appended to `engine/tests/events.test.ts`.

### Test structure

```text
describe('PHX-EV-002: fingerprint determinism')
  it('identical seed → identical event arrays')
  it('identical seed → identical fingerprint')
  it('fingerprint re-derives offline from event array alone')
```

### Algorithm

1. Simulate a full match to `gameOver` twice with seed 42, using the existing
   `simulateFullGame` helper already in that file.
2. Flatten `transactionLog` entries through `deriveEventsFromEntry` for both runs.
3. Compute `computeStateHash(events)` for each run — assert equal.
4. Compute the fingerprint a third time from only the event array (no replay) —
   assert equal to the first two. This proves offline verifiability.

`computeStateHash` is importable from `@phalanxduel/shared/hash`.

---

## Component 4: `turnHash`

### Hash helper — `shared/src/hash.ts`

New export alongside `computeStateHash`:

```typescript
export function computeTurnHash(stateHashAfter: string, eventIds: string[]): string {
  return createHash('sha256')
    .update(stateHashAfter + ':' + eventIds.join(':'))
    .digest('hex');
}
```

Simple string concatenation — deliberately easy to reproduce without the SDK.
This is the canonical formula for RULES.md §20.2.

### Schema — `shared/src/schema.ts`

Additive, no breaking change:

```typescript
export const PhalanxTurnResultSchema = z.object({
  matchId: z.string().uuid(),
  playerId: z.string().uuid(),
  preState: GameStateSchema,
  postState: GameStateSchema,
  action: ActionSchema,
  events: z.array(PhalanxEventSchema).optional(),
  turnHash: z.string().optional(),   // ← new
  telemetry: z.object({ ... }).optional(),
});
```

### Server — `server/src/match.ts`

Computed in `broadcastState` where `match.lastEvents` and `match.state` are
already available. Import `computeTurnHash` from `@phalanxduel/shared/hash`.

```typescript
const lastEntry = match.state?.transactionLog?.at(-1);
const turnHash =
  lastEntry && match.lastEvents?.length
    ? computeTurnHash(lastEntry.stateHashAfter, match.lastEvents.map((e) => e.id))
    : undefined;
```

Include `turnHash` in each `result` object sent to players and spectators.

---

## Component 5: RULES.md + CI Guard

### RULES.md §20.2

Add documentation for `turnHash`:
- Field name, type (`string`, hex SHA-256)
- Formula: `SHA-256(stateHashAfter + ':' + eventIds.join(':'))`
- Purpose: deterministic signature of the transition, independently verifiable
- When absent: optional, present on every action response once TASK-45.7 lands

### `verify-doc-fsm-consistency.ts`

Remove `'turnHash'` from the `legacyTerm` array — it is now canonical, not
legacy. `'eventLogHash'` and `'preStateHash'` remain guarded.

Also remove the `ARCHITECTURE.md` guard for `turnHash` (line 97–100) since
ARCHITECTURE.md may legitimately reference it after RULES.md is updated.

---

## Files Changed

| File | Change |
|------|--------|
| `scripts/ci/verify-event-log.ts` | New: harness + CLI entrypoint |
| `engine/src/events.ts` | Add `assertNever` default case |
| `engine/tests/events.test.ts` | New determinism+fingerprint describe block |
| `shared/src/hash.ts` | Add `computeTurnHash` export |
| `shared/src/schema.ts` | Add `turnHash?: z.string()` to `PhalanxTurnResultSchema` |
| `server/src/match.ts` | Compute and broadcast `turnHash` in `broadcastState` |
| `scripts/ci/verify-doc-fsm-consistency.ts` | Remove `turnHash` from legacy terms |
| `package.json` | Extend `rules:check` script |
| `docs/RULES.md` | Document `turnHash` in §20.2 |

## Acceptance Criteria Mapping

| AC | Covered by |
|----|-----------|
| #1 CI guard for missing branches | Harness (runtime) + `assertNever` (compile-time) |
| #2 Replay determinism + fingerprint | New describe block in `events.test.ts` |
| #3 `turnHash` optional field in schema | `shared/src/schema.ts` |
| #4 `turnHash` formula | `computeTurnHash` in `hash.ts` + `broadcastState` |
| #5 `pnpm check:ci` passes | All changes additive; OpenAPI snapshot may need update |

## Risk Notes

- OpenAPI snapshot (`server/tests/__snapshots__/openapi.test.ts.snap`) will
  need regeneration after `PhalanxTurnResultSchema` gains `turnHash`.
- The `ARCHITECTURE.md` guard removal must be verified: if that file currently
  mentions `turnHash` in a legacy context, the doc should be updated alongside
  the guard removal.
