---
id: TASK-2
title: Canonical Per-Turn Hashes for Replay Integrity
status: In Progress
assignee:
  - '@claude'
created_date: '2026-03-12 01:31'
updated_date: '2026-03-16 03:04'
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
- Given the same config and ordered actions, when the match is replayed twice,
  then the emitted per-turn digests are byte-for-byte identical. ✓ Done —
  PHX-EV-002 tests verify this.
- **Remaining:** Given a `TransactionLogEntry`, when it is serialized (e.g.,
  read from the DB `transactionLog` column), then it includes a `turnHash` field
  so audit tooling can verify a turn without re-deriving events.

## References

- `shared/src/hash.ts` — `computeTurnHash` (already implemented)
- `shared/src/schema.ts` — `TransactionLogEntrySchema` (needs `turnHash` field)
- `server/src/match.ts` — entry recording and `broadcastState`
- `docs/RULES.md` §20.2 — canonical formula
