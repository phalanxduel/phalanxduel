---
id: TASK-126
title: Implement Real-Time State Drift Detection in API Playthrough
status: Human Review
assignee:
  - '@claude'
created_date: '2026-03-30 19:51'
updated_date: '2026-04-07 13:52'
labels: []
dependencies: []
priority: medium
ordinal: 39000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
To ensure the API is truly 'hardened,' we must verify that the server isn't just 'working,' but is 100% deterministic compared to the engine. This task adds real-time state-hash verification to the API playthrough suite.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 In api-playthrough.ts, after every action, compare the 'stateHash' returned by the server with a local engine re-simulation of the same action.
- [x] #2 #2 Fail the test immediately if the server-side state drift is detected.
- [x] #3 #3 Log the exact diff between expected (Engine) and actual (Server) JSON states on failure.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add imports: createInitialState, applyAction from @phalanxduel/engine; GameConfig type; computeStateHash from @phalanxduel/shared/hash.
2. After the initial gameState is received (vm1Msg/vm2Msg), bootstrap a local GameConfig using the known matchId, player IDs/names, seed, and gameOptions. Call createInitialState then apply the system:init action (extracted from vm1Msg.viewModel.state.transactionLog[0]) with hashFn to get the correct initial local state.
3. After each confirmed action ([gs1, gs2] = await Promise.all(...)), apply the same chosenAction to localState using applyAction with hashFn: computeStateHash. Compare localState.transactionLog.at(-1).stateHashAfter with the server's stateHashAfter from gs1.viewModel.state.transactionLog.at(-1). On mismatch, log the action, both hashes, and JSON of both states, then throw STATE_DRIFT error.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-06 implementation: Added per-action drift detection to bin/qa/api-playthrough.ts.

- Imports: createInitialState, engineApplyAction from @phalanxduel/engine; computeStateHash from @phalanxduel/shared/hash; GameConfig type.
- Bootstrap: after initial gameState received (post-joinMatch), creates a local GameConfig from known matchId/playerIds/seed/gameOptions, calls createInitialState, then applies the system:init action extracted from vm1.state.transactionLog[0] with hashFn: computeStateHash. Immediately verifies the init hash matches the server's — throws STATE_DRIFT if not.
- Per-action check: after each [gs1, gs2] = await Promise.all(...), calls engineApplyAction on localState with the same chosenAction + hashFn. Catches local engine rejections (server accepted but engine didn't) as a drift signal. Compares localState.transactionLog.at(-1).stateHashAfter vs gs1.viewModel.state.transactionLog.at(-1).stateHashAfter — on mismatch, logs both hashes and full JSON of expected (engine, no txLog) vs actual (server redacted view), then throws STATE_DRIFT.
- Key detail: gameStateForHash in engine/src/turns.ts:55 strips transactionLog before hashing, so the hash is deterministic across the full unredacted state (players, battlefield, phase, etc.).

Verification: pnpm build ✓, pnpm typecheck ✓, pnpm lint ✓ (clean), pnpm test:run:all: 16+23+38 test files, 261+180+217 tests all pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added real-time state drift detection to `bin/qa/api-playthrough.ts`.\n\n**How it works:**\n1. After joinMatch, bootstraps a local engine state using the same seed/matchId/players/gameOptions as the server, then applies `system:init` with the exact timestamp from the server's first transactionLog entry. Hash is verified at init time.\n2. After every action in the game loop, applies the same action to the local engine with `hashFn: computeStateHash`. Compares `stateHashAfter` from the local transactionLog against the server's. Any mismatch — including cases where the local engine rejects an action the server accepted — throws `STATE_DRIFT` immediately with a full diff of expected (engine) and actual (server) state JSON.\n\n**Key insight:** `gameStateForHash` in `engine/src/turns.ts:55` strips `transactionLog` before hashing, so the hash covers the full unredacted game state (both players' hands, battlefield, phase, LP, etc.) deterministically. This means a locally-run engine initialized from the same seed will produce identical hashes to the server on every action, so any divergence indicates a real bug.\n\n**Files changed:** `bin/qa/api-playthrough.ts`\n**Verification:** build ✓, typecheck ✓, lint clean, 658 tests pass (16+23+38 files across engine/client/server/admin)"]
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
