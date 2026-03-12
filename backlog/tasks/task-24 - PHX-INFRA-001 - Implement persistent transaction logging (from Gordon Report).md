---
id: PHX-INFRA-001
status: todo
priority: high
---

# PHX-INFRA-001 - Implement persistent transaction logging (from Gordon Report)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement server-side persistence for the match transaction log. Currently, transaction logs (actions, state hashes, and phase traces) are computed but only held in memory or emitted as events. To ensure auditability and enable recovery, these must be persisted to the database.
<!-- SECTION:DESCRIPTION:END -->

## Requirements
- Create a Drizzle migration for a `transaction_logs` table.
- Table schema should include: `id`, `matchId`, `sequenceNumber`, `action` (JSON), `stateHashBefore`, `stateHashAfter`, `timestamp`, `phaseTrace` (JSON).
- Save a log entry for every action applied in `server/src/app.ts`.
- Ensure persistence is atomic with state updates if possible, or at least highly reliable.

## References
- `docs/review/archive/2026-03-11/Gordon-Default/production-readiness-report.md` (Recommendation 1)
- `docs/review/archive/2026-03-11/production/PRODUCTION_REPORT.md`
