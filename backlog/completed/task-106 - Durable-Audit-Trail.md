---
id: TASK-106
title: Durable Audit Trail
status: Done
assignee: ['@claude']
created_date: '2026-03-21'
labels: ['feature', 'audit']
milestone: v0.5.0 - Stability & Playability
dependencies:
  - TASK-105
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The game computes `turnHash` integrity values in memory but does not persist
them durably. If the server restarts mid-match, the audit trail is gone. For
ranked play to be trustworthy, the transaction log and hash chain must survive
process restarts.

This builds on existing infrastructure — the `transaction_logs` table, the
`computeStateHash` / `computeTurnHash` functions, and the `replayGame` verifier
all exist. The gap is that the hash chain is not written to Postgres as actions
occur.

Relates to TASK-34.1 and is a prerequisite for TASK-34.3 (replay viewer).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Every action persisted to `transaction_logs` includes `state_hash_after`
      computed at write time. *(Already wired in TASK-24 — verified still active)*
- [x] #2 Hash chain is continuous — each entry's hash can be verified against
      the previous entry. *(verifyHashChain() in match-repo.ts + engine tests)*
- [x] #3 `GET /api/matches/:matchId/verify` replays from persisted logs and
      confirms hash integrity. *(Enhanced: falls back to DB, verifies hash chain)*
- [x] #4 Match completion writes the final hash to the match record for fast
      lookup. *(saveFinalStateHash() called in handleAction on gameOver)*
- [x] #5 Server restart mid-match: rehydrate state from persisted transaction
      log, verify hash chain, resume play. *(getMatch() reconstitutes from DB;
      verify endpoint falls back to DB hash chain when match not in memory)*
- [x] #6 Tests: persist actions, restart server (or reset in-memory state),
      verify replay produces identical state hash. *(5 engine audit-trail tests
      + 2 server verify-endpoint tests)*
<!-- AC:END -->

## Implementation Notes

### Changes

1. **Migration 0006**: Added `final_state_hash` text column to `matches` table
2. **server/src/db/schema.ts**: Added `finalStateHash` column definition
3. **server/src/db/match-repo.ts**: Added `saveFinalStateHash()`,
   `getFinalStateHash()`, and `verifyHashChain()` methods
4. **server/src/match.ts**: Persist final state hash on game completion
5. **server/src/routes/stats.ts**: Enhanced verify endpoint to fall back to DB,
   verify hash chain continuity, and cross-check stored final hash
6. **engine/tests/audit-trail.test.ts**: 5 tests verifying hash chain integrity
   through deployment, full game lifecycle, and independent hash recomputation
7. **server/tests/verify-endpoint.test.ts**: 2 tests for the verify endpoint

### Key Design Decision

The engine strips `transactionLog` from state before hashing (via
`gameStateForHash()`) to avoid circular dependency — the hash would change after
appending the entry that contains the hash. This means `stateHashAfter` hashes
`Omit<GameState, 'transactionLog'>`, not the full state.

## Verification

```bash
# Engine audit trail tests (5 tests)
pnpm --filter @phalanxduel/engine test -- audit-trail
# Expected: 5 passed

# Server verify endpoint tests (2 tests)
pnpm --filter @phalanxduel/server test -- verify-endpoint
# Expected: 2 passed

# Full suite
pnpm -r test
# Expected: 636 passed across all packages

pnpm verify:all
```
