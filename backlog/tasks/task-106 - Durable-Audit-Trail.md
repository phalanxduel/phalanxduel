---
id: TASK-106
title: Durable Audit Trail
status: To Do
assignee: []
created_date: '2026-03-21'
labels: []
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
- [ ] #1 Every action persisted to `transaction_logs` includes `state_hash_after`
      computed at write time.
- [ ] #2 Hash chain is continuous — each entry's hash can be verified against
      the previous entry.
- [ ] #3 `GET /api/matches/:matchId/verify` replays from persisted logs and
      confirms hash integrity.
- [ ] #4 Match completion writes the final hash to the match record for fast
      lookup.
- [ ] #5 Server restart mid-match: rehydrate state from persisted transaction
      log, verify hash chain, resume play.
- [ ] #6 Tests: persist actions, restart server (or reset in-memory state),
      verify replay produces identical state hash.
<!-- AC:END -->

## Verification

```bash
# Create a match, play some actions, verify hash chain
curl http://localhost:3001/api/matches/<matchId>/verify
# Should return { valid: true, actionCount: N, finalStateHash: "..." }

# Full suite
pnpm -r test
pnpm verify:all
```
