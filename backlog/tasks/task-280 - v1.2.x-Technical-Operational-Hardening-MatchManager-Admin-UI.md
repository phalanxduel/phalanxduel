---
id: TASK-280
title: v1.2.x Technical & Operational Hardening (MatchManager & Admin UI)
status: Done
assignee:
  - '@antigravity'
created_date: '2026-05-06 21:37'
updated_date: '2026-05-07 16:36'
labels: []
dependencies: []
ordinal: 134000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 AC #2 of TASK-94 (distributed MatchManager mapping) is complete
- [x] #2 Admin UI includes a 'Force Terminate' button for active matches
- [x] #3 Admin UI includes an audit log entry for manual match terminations
- [x] #4 Admin UI allows rolling back a match to a specific sequence number
- [x] #5 MatchManager handles rollback by truncating the ledger and state history
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->

## Implementation Plan

1. **Primary Mapping Transition**: Shift `LocalMatchManager` to treat the Neon database as the primary registry for active matches. The in-memory `matches` and `actors` Maps will become LRU-style caches rather than the authoritative set.
2. **Global Lobby & Discovery**: Refactor `listJoinableMatches` to query the `matches` table with appropriate filters (status='pending', visibility='public_open') instead of iterating over local memory.
3. **Distributed Reconnect**: Ensure that a player can reconnect to any server node. If the `MatchActor` isn't present locally, the node should re-hydrate it from the ledger.
4. **IP Limit Hardening**: Transition the `MAX_ACTIVE_MATCHES_PER_IP` check from an in-memory counter to a DB-backed aggregate query to prevent bypass via multiple server nodes.

## Implementation Notes

- The `PostgresLedgerStore` already provides the foundation for distributed state.
- `MatchRepository` needs a new `listJoinableMatches` method.

## Verification

- [ ] Verify that restarting the server during a match allows the player to rejoin and resume from the same state.
- [ ] Verify that multiple server instances can serve matches from the same global lobby.
