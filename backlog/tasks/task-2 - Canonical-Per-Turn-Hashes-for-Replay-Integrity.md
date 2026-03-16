---
id: TASK-2
title: Canonical Per-Turn Hashes for Replay Integrity
status: Human Review
assignee:
  - '@claude'
created_date: '2026-03-12 01:31'
updated_date: '2026-03-16 04:00'
labels: []
dependencies: []
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replay integrity already stores `stateHashBefore` and `stateHashAfter` on
transaction log entries, but there is still no single canonical turn digest
that external verifiers can compare or sign. This task closes that gap by
emitting a deterministic `turnHash` on each persisted `TransactionLogEntry`.

## What Is Already Done (TASK-45.7, 2026-03-15)

The formula, helper, broadcast field, and CI guard are all in place:

- `computeTurnHash(stateHashAfter, eventIds)` — canonical SHA-256 helper in
  `shared/src/hash.ts` (formula: `SHA-256(stateHashAfter + ":" + eventIds.join(":"))`).
- `turnHash: z.string().optional()` added to `PhalanxTurnResultSchema` in
  `shared/src/schema.ts`; JSON schema artifact regenerated.
- Server computes and broadcasts `turnHash` in `broadcastState` from
  `server/src/match.ts` on every turn.
- Formula documented in `docs/RULES.md` §20.2.
- Determinism verified by PHX-EV-002 tests in `engine/tests/events.test.ts`.
- `pnpm rules:check` extended with `scripts/ci/verify-event-log.ts`.

## Remaining Work

The one gap: `TransactionLogEntry` in `shared/src/schema.ts` does not yet carry
`turnHash` as a persisted field. The digest is computed at broadcast time but is
not stored on the entry itself, so audit tooling reading the raw transaction log
cannot verify a turn without re-deriving the events and recomputing.

### Delivery Steps

- Add `turnHash: z.string().optional()` to `TransactionLogEntrySchema` in
  `shared/src/schema.ts` (and regenerate artifacts).
- Populate it in `server/src/match.ts` when recording the entry (alongside
  `stateHashBefore`/`stateHashAfter`), using the same `computeTurnHash` call
  already present in `broadcastState`.
- Update the DB migration if `transactionLog` JSONB snapshots need the new field
  (additive — old rows simply omit it).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

- ~~Given the current transaction-log schema, when the shared types are updated,
  then the new digest fields are documented and available to engine, server, and
  replay tooling.~~ ✓ Done — `computeTurnHash` helper shipped, formula in
  RULES.md §20.2, `PhalanxTurnResultSchema` has the field, server broadcasts it.
- ~~Given the same config and ordered actions, when the match is replayed twice,
  then the emitted per-turn digests are byte-for-byte identical.~~ ✓ Done —
  PHX-EV-002 tests verify this.
- ~~Given a `TransactionLogEntry`, when it is serialized (e.g., read from the DB
  `transactionLog` column), then it includes a `turnHash` field so audit tooling
  can verify a turn without re-deriving events.~~ ✓ Done — `TransactionLogEntrySchema`
  carries `turnHash: z.string().optional()` and `server/src/match.ts` populates it
  before persisting each entry (commit `34effab7`).

## Verification

Steps a reviewer must complete before marking Done. Run each command and confirm
the expected result.

### 1. Automated tests pass

```bash
pnpm -r test
```

Expected: all packages green. Key tests that directly cover this task:

- `server/tests/match.test.ts` — *"should populate turnHash on the last
  transactionLog entry after a deploy action"* asserts that after any action the
  broadcast `postState.transactionLog.at(-1).turnHash` is a 64-char hex string.
- `engine/tests/events.test.ts` PHX-EV-002 block — five tests confirm that
  identical seeds produce byte-identical event arrays and fingerprints (determinism
  guarantee for `computeTurnHash`'s underlying primitive).

### 2. Schema carries the field

```bash
grep -n "turnHash" shared/src/schema.ts
```

Expected: two hits —

- `TransactionLogEntrySchema` (line ~414): `turnHash: z.string().optional()`
- `PhalanxTurnResultSchema` (line ~470): `turnHash: z.string().optional()`

### 3. DB spot-check (requires a running dev server and at least one completed match)

```sql
SELECT id,
       transaction_log->-1->>'turnHash'  AS last_entry_turn_hash,
       jsonb_array_length(transaction_log) AS turns
FROM   matches
WHERE  status = 'completed'
LIMIT  5;
```

Expected: `last_entry_turn_hash` is a 64-char lowercase hex string (not `null`)
for every completed match created after commit `34effab7`. Older rows may be
`null` — that is acceptable (the field is additive/optional).

### 4. Admin console visual check (optional — requires admin service running)

Open **Match Detail → Transaction Log tab** for any completed match. The
`turnHash` column should show truncated digests and `✓` integrity badges for all
entries. Entries in matches created before `34effab7` will show `✗` — expected.

## References

- `shared/src/hash.ts` — `computeTurnHash` implementation
- `shared/src/schema.ts` — `TransactionLogEntrySchema` and `PhalanxTurnResultSchema`
- `server/src/match.ts` — entry recording (`lastEntry.turnHash = computeTurnHash(…)`)
  and `broadcastState`
- `server/tests/match.test.ts` — persistence test (line ~105)
- `engine/tests/events.test.ts` — PHX-EV-002 determinism tests (line ~546)
- `docs/RULES.md` §20.2 — canonical formula
