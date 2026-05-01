---
id: TASK-206
title: >-
  Add replay validation to CI pipeline — hash chain verification on completed
  matches
status: In Progress
assignee: []
created_date: '2026-04-06 15:34'
updated_date: '2026-05-01 00:40'
labels:
  - qa
  - ci
  - replay
  - p1
milestone: Post-Promotion Hardening
dependencies:
  - TASK-197
references:
  - server/src/app.ts (replay endpoint)
  - 'server/src/db/match-repo.ts:395-457'
  - .github/workflows/pipeline.yml
  - bin/qa/api-playthrough.ts
priority: high
ordinal: 8060
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

The `/matches/:matchId/replay` admin endpoint exists and calls `verifyHashChain` on the `transactionLogs` table, but this is never invoked in CI. After each `api-integration` playthrough run, the hash chain of every completed match should be verified to confirm that the ledger is consistent and that replay from the recorded action log produces the same final state hash.

Currently, replay fidelity is only tested by `engine/tests/replay.test.ts` in unit isolation. End-to-end replay through the server (full round-trip: server played the game → replay from DB produces same hash) is never exercised in CI.

## Implementation notes

After the `api-playthrough` run completes, add a step that:
1. Lists completed matches from the run manifest
2. Calls the `/matches/:matchId/replay` endpoint for each match
3. Asserts the hash chain is valid (no breaks) and the final state hash matches the live game's final hash
4. Fails the CI job if any match fails replay verification

Add this as part of the `api-integration` CI job (after the playthrough step) or as a separate `test:replay` script.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 After api-integration playthrough, every completed match is replayed server-side
- [ ] #2 Hash chain verification passes for all completed matches
- [ ] #3 A match with a broken hash chain causes CI failure
- [ ] #4 New `test:replay` script added to package.json
- [ ] #5 CI pipeline blocks merge on replay verification failure
<!-- AC:END -->
