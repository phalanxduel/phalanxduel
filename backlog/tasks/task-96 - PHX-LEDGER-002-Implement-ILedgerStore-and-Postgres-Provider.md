---
id: TASK-96
title: PHX-LEDGER-002 - Implement ILedgerStore and Postgres Provider
status: Done
assignee: []
created_date: '2026-03-21 17:56'
updated_date: '2026-04-05 20:19'
labels: []
milestone: v0.4.0 - Distributed Scaling
dependencies:
  - TASK-95
priority: high
ordinal: 92000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Define the ILedgerStore interface and implement it for both Postgres and InMemory providers. This layer (Data Link) must be strictly decoupled from Sockets and MatchInstances.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 ILedgerStore interface defines getMatchConfig, appendAction, and getActions.
- [x] #2 PostgresLedgerStore implements the interface using match_actions table.
- [x] #3 InMemoryLedgerStore implements the interface for local development parity.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented ILedgerStore interface and both providers in `server/src/db/ledger-store.ts`.

- `ILedgerStore` defines `getMatchConfig`, `appendAction(AppendActionEntry)`, and `getActions` — the minimal contract for distributed action replay.
- `PostgresLedgerStore` writes to the new `match_actions` table via Drizzle, with `onConflictDoNothing` for idempotent appends and OTel tracing via `traceDbQuery`.
- `InMemoryLedgerStore` provides full parity for local dev and tests; includes `seedMatch()` and `clear()` helpers.
- Migration `0007_add_match_actions.sql` adds `match_actions` (composite PK on `match_id, sequence_number`) alongside existing `transaction_logs` — no breaking changes.
- All 261 server tests pass. Commit: 7d44fe53.
<!-- SECTION:FINAL_SUMMARY:END -->
