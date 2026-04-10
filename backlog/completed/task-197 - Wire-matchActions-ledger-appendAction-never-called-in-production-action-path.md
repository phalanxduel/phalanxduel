---
id: TASK-197
title: 'Wire matchActions ledger: appendAction never called in production action path'
status: Done
assignee: []
created_date: '2026-04-06 15:23'
updated_date: '2026-04-09 22:20'
labels:
  - qa
  - server
  - persistence
  - p0
  - audit-trail
dependencies: []
references:
  - server/src/db/ledger-store.ts
  - 'server/src/match.ts:821-888'
  - server/src/db/schema.ts
priority: high
ordinal: 100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`server/src/db/ledger-store.ts` defines `ILedgerStore` / `PostgresLedgerStore` with an `appendAction` method, and the `match_actions` table is defined in `server/src/db/schema.ts`. However, `appendAction` is never called from `handleAction` or any production code path in `server/src/match.ts`.

The `match_actions` table is empty in production. The append-only audit trail this infrastructure was designed to provide (for tamper detection and dispute resolution) is silently non-functional.

## Evidence

- `server/src/db/ledger-store.ts` — `appendAction` implemented
- `server/src/match.ts:821-888` — `handleAction` has no call to `appendAction`
- `server/src/db/schema.ts` — `match_actions` table defined with composite PK on `(matchId, sequenceNumber)`

## Expected behavior

Every game action processed by `handleAction` must be appended to the `match_actions` table via `appendAction`. This provides an immutable, per-action audit trail independent of the denormalized `matches.transactionLog` JSONB column.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 After a completed match, `match_actions` table contains one row per game action in sequence order
- [ ] #2 `appendAction` is called from `handleAction` after successful `applyAction`
- [ ] #3 Ledger write failure does not crash the game (graceful degradation with alerting)
- [ ] #4 Sequence number is monotonically increasing per matchId
- [ ] #5 Existing server tests still pass
<!-- AC:END -->
