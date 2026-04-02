---
id: TASK-169
title: Make replay and verification outputs deterministic
status: Human Review
assignee: []
created_date: '2026-04-02 15:48'
updated_date: '2026-04-02 15:55'
labels: []
dependencies: []
priority: high
ordinal: 1600
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Context
The audit confirmed that replay uses a fresh wall-clock timestamp for synthetic `system:init` instead of replaying only recorded inputs. The admin replay and verify surfaces then hash the full replayed state, so identical `match.config` + `actionHistory` can produce different timestamps and different `finalStateHash` values across invocations.

## Evidence
- Rule IDs: R-18, R-19
- Audit sections: Phase 6, Phase 8
- Code: `engine/src/replay.ts`, `server/src/app.ts`, `server/src/routes/stats.ts`
- Runtime proof: two consecutive `replayGame(config, [])` calls produced different `transactionLog[0].timestamp` values and different `computeStateHash(finalState)` outputs on 2026-04-02.

## Impact
- determinism
- integrity
- maintainability

## Metadata
- Surface: engine, server, shared, tests
- Type: determinism, bug, consistency
- Priority: critical
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Replaying the same persisted `match.config` and `actionHistory` twice yields identical `transactionLog` timestamps and identical final state hashes.
- [x] #2 `/matches/:matchId/replay` and `/api/matches/:matchId/verify` no longer depend on wall-clock time for otherwise identical replay inputs.
- [x] #3 Empty-action matches and post-action matches both produce stable replay results across repeated executions.
- [x] #4 Regression tests prove that replay stability holds without relying on real-time sleeps or wall-clock variance.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code updated
- [x] #2 Tests updated
- [x] #3 Rules updated if needed
- [x] #4 Cross-surface alignment verified
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-02: Replaced replay-time wall-clock generation with a deterministic replay timestamp derived from persisted config state. Replay now pins both initial draw IDs and the synthetic `system:init` action to the same deterministic timestamp instead of calling `new Date()` during replay.

## Verification

- `rtk pnpm --filter @phalanxduel/engine exec vitest run tests/replay.test.ts`

## Verification Notes

- Added coverage for repeated empty-action replays and repeated actionful replays when `drawTimestamp` is absent, asserting stable `transactionLog[0].timestamp` values and stable final state hashes across invocations.
<!-- SECTION:NOTES:END -->
