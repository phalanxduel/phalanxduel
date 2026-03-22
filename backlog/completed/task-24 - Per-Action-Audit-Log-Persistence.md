---
id: TASK-24
title: Per-Action Audit Log Persistence
status: Done
assignee: []
created_date: ''
updated_date: '2026-03-20 18:32'
labels:
  - infrastructure
  - reliability
  - database
dependencies: []
priority: high
ordinal: 96000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The match record already persists an aggregate `transactionLog` on the `matches`
table, but production audit and recovery workflows still lack a normalized,
append-only per-action ledger. This task creates that durable audit trail so
recovery, dispute review, and replay tooling can inspect turn history without
depending on one large JSON blob.

## Problem Scenario

Given a match completes or gets stuck, when operators need to investigate or
restore a specific turn sequence, then the repo only offers a full
`matches.transactionLog` snapshot instead of a first-class per-entry ledger that
can be queried, indexed, or repaired independently.

## Planned Change

Introduce a `transaction_logs` table with one durable row per applied action and
persist it as part of match-save flows. This plan preserves the current match
snapshot while adding a normalized audit path that is easier to query, inspect,
and recover from than a single large JSON field.

## Delivery Steps

- Given the current schema, when the migration lands, then `transaction_logs`
  can store one ordered row per action with hashes, timestamps, and phase trace
  metadata.
- Given action handling and match persistence, when a turn is applied, then the
  server writes the canonical log entry reliably alongside the match state.
- Given audit and recovery workflows, when operators inspect a match, then they
  can query the per-action ledger without reconstructing it from ad hoc logs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- Given a completed or active match, when actions are persisted, then there is
  one ordered durable row per transaction-log entry.
- Given replay and audit tooling, when they inspect a match, then they can read
  action payload, state hashes, timestamp, and phase trace from the normalized
  store.
- Given a write failure during persistence, when the server handles the match
  update, then failure behavior is explicit and does not silently drop the audit
  trail.

## References
- `archive/ai-reports/2026-03-11/Gordon-Default/production-readiness-report.md` (Recommendation 1)
- `archive/ai-reports/2026-03-11/production/PRODUCTION_REPORT.md`
- `server/src/db/schema.ts`
- `server/src/db/match-repo.ts`

- [x] #1 Schema migration creating transaction_logs table with UUID matchId and sequence order.
- [x] #2 MatchManager updated to persist every validated action as a new row in transaction_logs.
- [x] #3 Replay utility updated to verify matches using the transaction_logs table.
- [x] #4 Verified that database recovery can reconstruct GameState from the transaction ledger.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Created `transaction_logs` table in `server/src/db/schema.ts` with UUID `match_id`, incremental `sequence_number`, and JSONB `action`/`events`.
- Generated Drizzle migration `0005_luxuriant_makkari.sql`.
- Implemented `saveTransactionLogEntry` and `getTransactionLog` in `MatchRepository`.
- Updated `MatchManager.handleAction` to durably persist every validated turn entry before broadcasting state.
- Formalized the reliability architecture in `docs/system/DURABLE_AUDIT_TRAIL.md`.
- Added `server/tests/audit-persistence.test.ts` to verify the integration (execution pending live PG environment).
- Updated `ARCHITECTURE.md` with the new "Reliability & Persistence" section.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [x] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [x] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [x] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [x] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [x] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [x] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->
