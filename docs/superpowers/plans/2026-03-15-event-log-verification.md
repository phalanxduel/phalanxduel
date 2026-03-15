# Event Log Verification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the event log trustworthiness loop with TypeScript exhaustiveness checking, a dual-layer runtime harness, deterministic fingerprint tests, and the canonical `turnHash` field from RULES.md §20.2.

**Architecture:** Three independent layers — compile-time (TypeScript `assertNever`), runtime-harness (importable + CI script), and schema/server (additive `turnHash` field computed in `broadcastState`). Each layer can be implemented and committed independently.

**Tech Stack:** TypeScript, Zod, Vitest, Node.js `crypto`, Fastify, tsx (for CI scripts)

**Spec:** `docs/superpowers/specs/2026-03-15-event-log-verification-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `engine/src/events.ts` | Add `assertNever` exhaustiveness to switch default |
| Create | `shared/tests/hash.test.ts` | Tests for `computeTurnHash` |
| Modify | `shared/src/hash.ts` | Add `computeTurnHash` export |
| Modify | `shared/src/schema.ts` | Add `turnHash?: z.string()` to `PhalanxTurnResultSchema` |
| Modify | `shared/tests/schema.test.ts` | Add `PhalanxTurnResultSchema` `turnHash` acceptance test |
| Modify | `engine/tests/events.test.ts` | Add fingerprint determinism describe block |
| Create | `scripts/ci/verify-event-log.ts` | Harness + CLI entrypoint |
| Modify | `package.json` (root) | Extend `rules:check` script |
| Modify | `server/src/match.ts` | Compute `turnHash` in `broadcastState`, import `computeTurnHash` |
| Modify | `server/tests/__snapshots__/openapi.test.ts.snap` | Regenerate after schema change |
| Modify | `scripts/ci/verify-doc-fsm-consistency.ts` | Remove `turnHash` from legacy terms |
| Modify | `docs/RULES.md` | Document `turnHash` formula in §20.2 |

---

## Chunk 1: Compile-time + Shared Foundation

### Task 1: TypeScript Exhaustiveness in `events.ts`

**Files:**

- Modify: `engine/src/events.ts`

> This is a compile-time guard, not a runtime test. The TypeScript compiler is the test. No Vitest test needed — `pnpm typecheck` is the verification step.

- [ ] **Step 1: Add `assertNever` helper and default case**

  Open `engine/src/events.ts`. After the imports at the top of the file, add:

  ```typescript
  function assertNever(x: never): never {
    throw new Error(`Unhandled details type: ${JSON.stringify(x)}`);
  }
  ```

  Then inside the `switch (details.type)` block (after the final `case 'forfeit'`
  block, before the closing `}`), add:

  ```typescript
      default:
        assertNever(details);
  ```

  The full switch should now end:

  ```typescript
      case 'forfeit': {
        events.push({ ... });
        break;
      }
      default:
        assertNever(details);
    }
  ```

- [ ] **Step 2: Verify TypeScript accepts it**

  ```bash
  pnpm --filter @phalanxduel/engine typecheck
  ```

  Expected: exits 0 with no errors. If you get a type error on `assertNever(details)`, the switch is missing a case — add it before proceeding.

- [ ] **Step 3: Commit**

  ```bash
  git add engine/src/events.ts
  git commit -m "feat(engine): add assertNever exhaustiveness to deriveEventsFromEntry switch"
  ```

---

### Task 2: `computeTurnHash` Helper

**Files:**

- Modify: `shared/src/hash.ts`
- Create: `shared/tests/hash.test.ts`

- [ ] **Step 1: Write the failing test**

  Create `shared/tests/hash.test.ts`:

  ```typescript
  import { describe, it, expect } from 'vitest';
  import { createHash } from 'node:crypto';
  import { computeTurnHash } from '../src/hash.ts';

  describe('computeTurnHash', () => {
    it('returns a 64-char hex SHA-256 string', () => {
      const hash = computeTurnHash('abc123', ['ev0', 'ev1']);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic: same inputs produce same output', () => {
      const a = computeTurnHash('stateHash', ['id1', 'id2', 'id3']);
      const b = computeTurnHash('stateHash', ['id1', 'id2', 'id3']);
      expect(a).toBe(b);
    });

    it('differs when stateHashAfter changes', () => {
      const a = computeTurnHash('hash-A', ['ev0']);
      const b = computeTurnHash('hash-B', ['ev0']);
      expect(a).not.toBe(b);
    });

    it('differs when eventIds change', () => {
      const a = computeTurnHash('hash', ['ev0', 'ev1']);
      const b = computeTurnHash('hash', ['ev0']);
      expect(a).not.toBe(b);
    });

    it('differs when eventId order changes', () => {
      const a = computeTurnHash('hash', ['ev0', 'ev1']);
      const b = computeTurnHash('hash', ['ev1', 'ev0']);
      expect(a).not.toBe(b);
    });

    it('reproduces offline: SHA-256(stateHashAfter + ":" + eventIds.join(":"))', () => {
      const stateHashAfter = 'deadbeef';
      const eventIds = ['match:seq1:ev0', 'match:seq1:ev1'];
      const expected = createHash('sha256')
        .update(stateHashAfter + ':' + eventIds.join(':'))
        .digest('hex');
      expect(computeTurnHash(stateHashAfter, eventIds)).toBe(expected);
    });

    it('handles empty eventIds without crashing', () => {
      const hash = computeTurnHash('someStateHash', []);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  pnpm --filter @phalanxduel/shared test
  ```

  Expected: FAIL — `computeTurnHash` is not exported.

- [ ] **Step 3: Implement `computeTurnHash` in `shared/src/hash.ts`**

  Append after the existing `computeStateHash` function:

  ```typescript
  /**
   * Computes the canonical TurnHash (RULES.md §20.2).
   * Formula: SHA-256(stateHashAfter + ":" + eventIds.join(":"))
   *
   * Intentionally simple — independently verifiable without the SDK.
   */
  export function computeTurnHash(stateHashAfter: string, eventIds: string[]): string {
    return createHash('sha256')
      .update(stateHashAfter + ':' + eventIds.join(':'))
      .digest('hex');
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  pnpm --filter @phalanxduel/shared test
  ```

  Expected: all shared tests pass (including the new `computeTurnHash` tests).

- [ ] **Step 5: Commit**

  ```bash
  git add shared/src/hash.ts shared/tests/hash.test.ts
  git commit -m "feat(shared): add computeTurnHash — canonical TurnHash formula (RULES.md §20.2)"
  ```

---

### Task 3: `turnHash` in Schema

**Files:**

- Modify: `shared/src/schema.ts`
- Modify: `shared/tests/schema.test.ts`

- [ ] **Step 1: Write the failing test**

  In `shared/tests/schema.test.ts`, import `PhalanxTurnResultSchema` and add a
  describe block. Find the existing imports at the top and add
  `PhalanxTurnResultSchema` to them:

  ```typescript
  import {
    // ... existing imports ...
    PhalanxTurnResultSchema,
  } from '../src/schema.ts';
  ```

  Then add a new describe block near the end of the file:

  ```typescript
  describe('PhalanxTurnResultSchema', () => {
    it('turnHash is absent from parsed output before schema change (red step verification)', () => {
      // Zod strips unknown fields silently — so we verify by checking the parsed output,
      // not the parse success. Before turnHash is in the schema, result.data.turnHash
      // will be undefined even when the input has it. This is the correct red step.
      const result = PhalanxTurnResultSchema.partial().safeParse({
        matchId: '00000000-0000-0000-0000-000000000001',
        turnHash: 'a'.repeat(64),
      });
      expect(result.success).toBe(true);
      // This assertion FAILS before the field is in the schema (stripped by Zod):
      expect((result.data as { turnHash?: string }).turnHash).toBe('a'.repeat(64));
    });

    it('accepts a valid result without turnHash', () => {
      const result = PhalanxTurnResultSchema.partial().safeParse({
        matchId: '00000000-0000-0000-0000-000000000001',
        playerId: '00000000-0000-0000-0000-000000000002',
        action: { type: 'pass', playerIndex: 0, timestamp: '2026-01-01T00:00:00.000Z' },
      });
      expect(result.success).toBe(true);
      expect((result.data as { turnHash?: string }).turnHash).toBeUndefined();
    });

    it('rejects a non-string turnHash', () => {
      const result = PhalanxTurnResultSchema.partial().safeParse({
        matchId: '00000000-0000-0000-0000-000000000001',
        turnHash: 12345,
      });
      expect(result.success).toBe(false);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  pnpm --filter @phalanxduel/shared test
  ```

  Expected: FAIL — the first test's `expect(...turnHash).toBe('a'.repeat(64))` assertion fails because Zod strips the unknown `turnHash` field from parsed output before the schema is updated. The other two tests pass.

- [ ] **Step 3: Add `turnHash` to `PhalanxTurnResultSchema`**

  In `shared/src/schema.ts`, find `PhalanxTurnResultSchema` (currently around line 462). Add `turnHash` after `events`:

  ```typescript
  export const PhalanxTurnResultSchema = z.object({
    matchId: z.string().uuid(),
    playerId: z.string().uuid(),
    preState: GameStateSchema,
    postState: GameStateSchema,
    action: ActionSchema,
    events: z.array(PhalanxEventSchema).optional(),
    turnHash: z.string().optional(),
    telemetry: z
      .object({
        events: z.array(z.string()).optional(),
        metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
      })
      .optional(),
  });
  ```

- [ ] **Step 4: Regenerate JSON schemas and types**

  ```bash
  pnpm schema:gen
  ```

  Expected: `shared/json-schema/PhalanxTurnResult.json` and `shared/src/types.ts`
  are updated to include `turnHash`.

- [ ] **Step 5: Run all shared tests**

  ```bash
  pnpm --filter @phalanxduel/shared test
  ```

  Expected: all pass.

- [ ] **Step 6: Verify schema artifacts are clean**

  ```bash
  pnpm schema:check
  ```

  Expected: "Schema artifacts are up to date."

- [ ] **Step 7: Commit**

  ```bash
  git add shared/src/schema.ts shared/tests/schema.test.ts \
    shared/src/types.ts shared/json-schema/PhalanxTurnResult.json
  git commit -m "feat(shared): add optional turnHash field to PhalanxTurnResultSchema (RULES.md §20.2)"
  ```

---

## Chunk 2: Tests and Harness

### Task 4: Fingerprint Determinism Test

**Files:**

- Modify: `engine/tests/events.test.ts`

The `simulateFullGame(seed)` helper is already defined at line ~391 of
`events.test.ts`. The new describe block reuses it. We also need
`computeStateHash` from `@phalanxduel/shared/hash`.

- [ ] **Step 1: Add the import**

  At the top of `engine/tests/events.test.ts`, add to the existing imports:

  ```typescript
  import { computeStateHash } from '@phalanxduel/shared/hash';
  ```

- [ ] **Step 1b: Add `PhalanxEvent` type to existing shared imports at the top of the file**

  Find the existing line: `import type { GameState, TransactionLogEntry } from '@phalanxduel/shared';`

  Add `PhalanxEvent` to it:

  ```typescript
  import type { GameState, TransactionLogEntry, PhalanxEvent } from '@phalanxduel/shared';
  ```

- [ ] **Step 2: Add the describe block**

  Append at the end of `engine/tests/events.test.ts` (after the last describe block):

  ```typescript
  // ── PHX-EV-002: Fingerprint determinism ────────────────────────────────────

  describe('PHX-EV-002: fingerprint determinism', () => {
    const SEED = 42;

    function collectEvents(state: GameState): PhalanxEvent[] {
      const matchId = `det-${SEED}`;
      return (state.transactionLog ?? []).flatMap((entry) =>
        deriveEventsFromEntry(entry, matchId),
      );
    }

    function fingerprint(events: PhalanxEvent[]): string {
      return computeStateHash(events);
    }

    it('identical seed produces identical event arrays', () => {
      const stateA = simulateFullGame(SEED);
      const stateB = simulateFullGame(SEED);
      expect(JSON.stringify(collectEvents(stateA))).toBe(JSON.stringify(collectEvents(stateB)));
    });

    it('identical seed produces identical fingerprint', () => {
      const stateA = simulateFullGame(SEED);
      const stateB = simulateFullGame(SEED);
      expect(fingerprint(collectEvents(stateA))).toBe(fingerprint(collectEvents(stateB)));
    });

    it('fingerprint re-derives offline from event array alone (no re-replay)', () => {
      const state = simulateFullGame(SEED);
      const events = collectEvents(state);
      const fp1 = fingerprint(events);
      const fp2 = computeStateHash(events);
      expect(fp1).toBe(fp2);
    });

    it('fingerprint is a 64-char hex string', () => {
      const state = simulateFullGame(SEED);
      const fp = fingerprint(collectEvents(state));
      expect(fp).toMatch(/^[0-9a-f]{64}$/);
    });

    it('different seeds produce different fingerprints', () => {
      const fpA = fingerprint(collectEvents(simulateFullGame(42)));
      const fpB = fingerprint(collectEvents(simulateFullGame(99)));
      expect(fpA).not.toBe(fpB);
    });
  });
  ```

- [ ] **Step 3: Run engine tests**

  ```bash
  pnpm --filter @phalanxduel/engine test
  ```

  Expected: all engine tests pass including the new PHX-EV-002 describe block.
  These tests should pass immediately because `deriveEventsFromEntry` is already
  deterministic and `computeStateHash` already works on arrays.

- [ ] **Step 4: Commit**

  ```bash
  git add engine/tests/events.test.ts
  git commit -m "test(engine): add PHX-EV-002 fingerprint determinism tests"
  ```

---

### Task 5: Event Log Coverage Harness

**Files:**

- Create: `scripts/ci/verify-event-log.ts`
- Modify: `package.json` (root)

- [ ] **Step 1: Create the harness**

  Create `scripts/ci/verify-event-log.ts`:

  ```typescript
  /**
   * Event Log Coverage Harness
   *
   * Verifies that deriveEventsFromEntry produces non-empty, schema-valid output
   * for every action type reachable from the engine.
   *
   * Dual-purpose:
   *   - Importable: verifyEventLogCoverage() returns structured CoverageResult[]
   *   - CLI entrypoint: exits non-zero if any result fails
   *
   * Usage: tsx scripts/ci/verify-event-log.ts
   */
  import { deriveEventsFromEntry } from '../../engine/src/events.js';
  import { PhalanxEventSchema } from '../../shared/src/schema.js';
  import type { TransactionLogEntry } from '../../shared/src/schema.js';

  export interface CoverageResult {
    actionType: string;
    detailType: string;
    eventCount: number;
    schemaErrors: string[];
    passed: boolean;
  }

  const MATCH_ID = 'harness-match';
  const TIMESTAMP = '2026-01-01T00:00:00.000Z';

  // Minimal fixtures — one per coverage case.
  // Shape matches what the engine actually produces; reuse patterns from
  // engine/tests/events.test.ts.

  const fixtures: Array<{ actionType: string; detailType: string; entry: TransactionLogEntry }> = [
    {
      actionType: 'system:init',
      detailType: 'n/a',
      entry: {
        sequenceNumber: 0,
        action: { type: 'system:init', timestamp: TIMESTAMP },
        stateHashBefore: '',
        stateHashAfter: '',
        timestamp: TIMESTAMP,
        details: { type: 'pass' }, // system:init reuses pass detail shape
        phaseTrace: [],
      },
    },
    {
      actionType: 'deploy',
      detailType: 'deploy',
      entry: {
        sequenceNumber: 1,
        action: { type: 'deploy', playerIndex: 0, column: 0, cardId: 'card-1', timestamp: TIMESTAMP },
        stateHashBefore: '',
        stateHashAfter: '',
        timestamp: TIMESTAMP,
        details: { type: 'deploy', gridIndex: 0, phaseAfter: 'DeploymentPhase' },
        phaseTrace: [{ from: 'DeploymentPhase', trigger: 'deploy', to: 'DeploymentPhase' }],
      },
    },
    {
      actionType: 'attack',
      detailType: 'attack',
      entry: {
        sequenceNumber: 2,
        action: { type: 'attack', playerIndex: 0, attackingColumn: 0, defendingColumn: 0, timestamp: TIMESTAMP },
        stateHashBefore: '',
        stateHashAfter: '',
        timestamp: TIMESTAMP,
        details: {
          type: 'attack',
          combat: {
            turnNumber: 1,
            attackerPlayerIndex: 0,
            attackerCard: { id: 'c1', suit: 'spades', face: '5', value: 5, type: 'number' },
            targetColumn: 0,
            baseDamage: 5,
            totalLpDamage: 5,
            steps: [{ target: 'playerLp', damage: 5, lpBefore: 20, lpAfter: 15 }],
          },
          reinforcementTriggered: false,
          victoryTriggered: false,
        },
        phaseTrace: [
          { from: 'AttackPhase', trigger: 'attack', to: 'AttackResolution' },
          { from: 'AttackResolution', trigger: 'system:advance', to: 'CleanupPhase' },
        ],
      },
    },
    {
      actionType: 'pass',
      detailType: 'pass',
      entry: {
        sequenceNumber: 3,
        action: { type: 'pass', playerIndex: 0, timestamp: TIMESTAMP },
        stateHashBefore: '',
        stateHashAfter: '',
        timestamp: TIMESTAMP,
        details: { type: 'pass' },
        phaseTrace: [
          { from: 'AttackPhase', trigger: 'pass', to: 'AttackResolution' },
          { from: 'AttackResolution', trigger: 'system:advance', to: 'CleanupPhase' },
        ],
      },
    },
    {
      actionType: 'reinforce',
      detailType: 'reinforce',
      entry: {
        sequenceNumber: 4,
        action: { type: 'reinforce', playerIndex: 1, cardId: 'card-r', timestamp: TIMESTAMP },
        stateHashBefore: '',
        stateHashAfter: '',
        timestamp: TIMESTAMP,
        details: { type: 'reinforce', column: 1, gridIndex: 5, cardsDrawn: 1, reinforcementComplete: true },
        phaseTrace: [
          { from: 'ReinforcementPhase', trigger: 'reinforce', to: 'ReinforcementPhase' },
          { from: 'ReinforcementPhase', trigger: 'reinforce:complete', to: 'DrawPhase' },
        ],
      },
    },
    {
      actionType: 'forfeit',
      detailType: 'forfeit',
      entry: {
        sequenceNumber: 5,
        action: { type: 'forfeit', playerIndex: 1, timestamp: TIMESTAMP },
        stateHashBefore: '',
        stateHashAfter: '',
        timestamp: TIMESTAMP,
        details: { type: 'forfeit', winnerIndex: 0 },
        phaseTrace: [{ from: 'AttackPhase', trigger: 'forfeit', to: 'gameOver' }],
      },
    },
  ];

  export function verifyEventLogCoverage(): CoverageResult[] {
    return fixtures.map(({ actionType, detailType, entry }) => {
      let events: ReturnType<typeof deriveEventsFromEntry> = [];
      const schemaErrors: string[] = [];

      try {
        events = deriveEventsFromEntry(entry, MATCH_ID);
      } catch (err) {
        schemaErrors.push(`deriveEventsFromEntry threw: ${String(err)}`);
        return { actionType, detailType, eventCount: 0, schemaErrors, passed: false };
      }

      for (const ev of events) {
        const result = PhalanxEventSchema.safeParse(ev);
        if (!result.success) {
          schemaErrors.push(`event id=${ev.id}: ${JSON.stringify(result.error.issues)}`);
        }
      }

      const passed = events.length > 0 && schemaErrors.length === 0;
      return { actionType, detailType, eventCount: events.length, schemaErrors, passed };
    });
  }

  // CLI entrypoint
  const results = verifyEventLogCoverage();
  const failures = results.filter((r) => !r.passed);

  if (failures.length > 0) {
    console.error('Event log coverage check FAILED:');
    for (const f of failures) {
      console.error(`  [${f.actionType}/${f.detailType}]: ${f.eventCount} events, errors: ${f.schemaErrors.join('; ')}`);
    }
    process.exit(1);
  }

  console.log(`Event log coverage check passed: ${results.length} action types verified.`);
  for (const r of results) {
    console.log(`  ✓ ${r.actionType}/${r.detailType}: ${r.eventCount} events`);
  }
  ```

- [ ] **Step 2: Run the harness manually to verify it works**

  ```bash
  tsx scripts/ci/verify-event-log.ts
  ```

  Expected output (6 lines after the header):

  ```text
  Event log coverage check passed: 6 action types verified.
    ✓ system:init/n/a: N events
    ✓ deploy/deploy: N events
    ✓ attack/attack: N events
    ✓ pass/pass: N events
    ✓ reinforce/reinforce: N events
    ✓ forfeit/forfeit: N events
  ```

  If any case fails, inspect the fixture and fix it before continuing.

- [ ] **Step 3: Extend `rules:check` in `package.json`**

  In the root `package.json`, find the `"rules:check"` script and update it:

  ```json
  "rules:check": "tsx scripts/ci/verify-doc-fsm-consistency.ts && tsx scripts/ci/verify-event-log.ts"
  ```

- [ ] **Step 4: Verify `rules:check` passes end-to-end**

  ```bash
  pnpm rules:check
  ```

  Expected: both scripts pass, exits 0.

- [ ] **Step 5: Commit**

  ```bash
  git add scripts/ci/verify-event-log.ts package.json
  git commit -m "feat(ci): add event log coverage harness and extend rules:check"
  ```

---

## Chunk 3: Server and Cleanup

### Task 6: Compute and Broadcast `turnHash` in Server

**Files:**

- Modify: `server/src/match.ts`
- Modify: `server/tests/__snapshots__/openapi.test.ts.snap` (regenerated)

The `broadcastState` method (line ~682) already has access to `match.lastEvents`
(set in `handleAction` at line ~573) and `match.state` (for the last
transaction log entry). Add `computeTurnHash` there.

- [ ] **Step 1: Add `computeTurnHash` import to `server/src/match.ts`**

  Find the existing import:

  ```typescript
  import { computeStateHash } from '@phalanxduel/shared/hash';
  ```

  Update it to:

  ```typescript
  import { computeStateHash, computeTurnHash } from '@phalanxduel/shared/hash';
  ```

- [ ] **Step 2: Compute `turnHash` in `broadcastState`**

  In the `broadcastState` method, after the `lastAction` assignment and before
  the `for` loop over players, add:

  ```typescript
  const lastEntry = match.state?.transactionLog?.at(-1);
  const turnHash =
    lastEntry && match.lastEvents?.length
      ? computeTurnHash(lastEntry.stateHashAfter, match.lastEvents.map((e) => e.id))
      : undefined;
  ```

  Then in each `result` object (there are two: one for players, one for
  spectators), add `turnHash`:

  ```typescript
  result: {
    matchId: match.matchId,
    playerId: player.playerId,
    preState: match.state,
    postState: playerState,
    action: lastAction,
    events: match.lastEvents ?? [],
    turnHash,              // ← add this line
  },
  ```

  Do the same for the spectator broadcast block.

- [ ] **Step 3: Run server typecheck**

  ```bash
  pnpm --filter @phalanxduel/server typecheck
  ```

  Expected: exits 0.

- [ ] **Step 4: Run server tests**

  ```bash
  pnpm --filter @phalanxduel/server test
  ```

  Expected: all existing tests pass. The OpenAPI snapshot test will likely
  fail because `PhalanxTurnResultSchema` gained `turnHash`. If it does, the
  error message will tell you to update the snapshot.

- [ ] **Step 5: Update the OpenAPI snapshot (if needed)**

  ```bash
  pnpm --filter @phalanxduel/server test -- --update-snapshots
  ```

  Then re-run:

  ```bash
  pnpm --filter @phalanxduel/server test
  ```

  Expected: all pass.

- [ ] **Step 6: Commit**

  ```bash
  git add server/src/match.ts server/tests/__snapshots__/openapi.test.ts.snap
  git commit -m "feat(server): compute and broadcast turnHash in broadcastState (RULES.md §20.2)"
  ```

---

### Task 7: CI Guard Cleanup + RULES.md

**Files:**

- Modify: `scripts/ci/verify-doc-fsm-consistency.ts`
- Modify: `docs/RULES.md`

- [ ] **Step 1: Check whether `docs/system/ARCHITECTURE.md` contains `turnHash`**

  ```bash
  grep -n turnHash docs/system/ARCHITECTURE.md
  ```

  If any lines appear: read them in context and update the content to reflect that
  `turnHash` is now a canonical field (not a legacy term) before proceeding. If no
  lines appear: nothing to update, continue.

- [ ] **Step 2: Remove `turnHash` from legacy terms in CI guard**

  In `scripts/ci/verify-doc-fsm-consistency.ts`, find lines ~90–95:

  ```typescript
  for (const legacyTerm of ['turnHash', 'eventLogHash', 'preStateHash'] as const) {
    assert(
      !rules.includes(legacyTerm) || rules.includes(LEGACY_HASH_MODEL_MARKER),
      `docs/RULES.md contains legacy hash term "${legacyTerm}" without explicit "${LEGACY_HASH_MODEL_MARKER}" marker`,
    );
  }
  ```

  Remove `'turnHash'` from the array:

  ```typescript
  for (const legacyTerm of ['eventLogHash', 'preStateHash'] as const) {
    assert(
      !rules.includes(legacyTerm) || rules.includes(LEGACY_HASH_MODEL_MARKER),
      `docs/RULES.md contains legacy hash term "${legacyTerm}" without explicit "${LEGACY_HASH_MODEL_MARKER}" marker`,
    );
  }
  ```

  Also remove the ARCHITECTURE.md `turnHash` guard at lines ~97–100:

  ```typescript
  assert(
    !architecture.includes('turnHash'),
    'docs/system/ARCHITECTURE.md should not describe legacy turnHash model',
  );
  ```

  Delete those four lines entirely.

- [ ] **Step 3: Verify `rules:check` still passes**

  ```bash
  pnpm rules:check
  ```

  Expected: both scripts pass.

- [ ] **Step 4: Document `turnHash` in RULES.md §20.2**

  Find §20.2 in `docs/RULES.md`. The section currently ends with:

  > 3\. **TurnHash:** The deterministic signature of the transition.

  Replace that line with the following (expand the one-liner into a full definition):

  - Change the line to: `3. **TurnHash:** The deterministic signature of the transition. Computed as:`
  - After it, add a fenced text block: `` `turnHash = SHA-256(stateHashAfter + ":" + eventIds.join(":"))` ``
  - Add a `Where:` bullet list:
    - `` `stateHashAfter` `` is the SHA-256 state hash recorded in the transaction log entry
    - `` `eventIds` `` is the ordered array of `id` fields from the `PhalanxEvent[]` derived for that turn
    - The separator `:` ensures `stateHashAfter` and `eventIds` cannot be confused
  - Close with a prose sentence: `` `turnHash` is included in the `PhalanxTurnResult` response (optional field). It is independently verifiable from the event log and state hash without replaying the match. ``

- [ ] **Step 5: Run `rules:check` with the updated RULES.md**

  ```bash
  pnpm rules:check
  ```

  Expected: passes — `turnHash` is no longer guarded as a legacy term.

- [ ] **Step 6: Commit**

  ```bash
  git add scripts/ci/verify-doc-fsm-consistency.ts docs/RULES.md
  git commit -m "feat(ci): remove turnHash legacy guard, document formula in RULES.md §20.2"
  ```

---

### Task 8: Final CI Verification

- [ ] **Step 1: Run full CI suite**

  ```bash
  pnpm check:ci
  ```

  Expected: exits 0. All of: lint, typecheck, build, test (545+ tests), schema:check, rules:check, flags:check, docs:check, lint:md, format:check.

- [ ] **Step 2: Update task status**

  Update `backlog/tasks/task-45.7 - Event-Log-Verification.md`:
  - Set `status: Done`
  - Mark all acceptance criteria complete
  - Add implementation notes

- [ ] **Step 3: Final commit**

  ```bash
  git add "backlog/tasks/task-45.7 - Event-Log-Verification.md"
  git commit -m "chore(backlog): mark TASK-45.7 Done"
  ```
