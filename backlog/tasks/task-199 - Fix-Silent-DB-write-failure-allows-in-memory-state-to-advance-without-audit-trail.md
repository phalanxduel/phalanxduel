---
id: TASK-199
title: >-
  Fix: Silent DB write failure allows in-memory state to advance without audit
  trail
status: To Do
assignee: []
created_date: '2026-04-06 15:26'
labels:
  - qa
  - server
  - persistence
  - p1
  - reliability
dependencies: []
references:
  - 'server/src/db/match-repo.ts:349-351'
  - 'server/src/match.ts:963-968'
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

All DB writes in `server/src/match.ts` (via `saveTransactionLogEntry`, `saveMatch`, `saveEventLog`) swallow exceptions with only `console.error`. If Postgres is unavailable or returns an error, game state advances in memory but the persistent audit trail falls behind. There is no circuit breaker, no alerting, and no graceful degradation.

In production, a brief Postgres unavailability would allow games to continue producing results that cannot be reconstructed from the DB.

## Evidence

- `server/src/db/match-repo.ts:349-351`: `catch(err) { console.error(...) }` on `saveTransactionLogEntry`
- `server/src/match.ts:963-968`: `recordAction` called without error propagation
- `server/src/match.ts:850`: `saveEventLog` called with `void` (fire-and-forget)

## Expected behavior

DB write failures must be observable (metric/alert, not just console.error). The system should either: (a) halt the match with an error to both players if the ledger cannot be written, or (b) continue play with a clearly alarmed degraded mode and attempt recovery. Silent swallow is not acceptable for a competitive system.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 DB write failure is observable via OTel metric or structured log at ERROR level with match context
- [ ] #2 A simulated DB failure during a match does not silently advance state without an observable signal
- [ ] #3 Existing server tests still pass
- [ ] #4 No change to normal-path behavior
<!-- AC:END -->
