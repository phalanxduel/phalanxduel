---
id: TASK-126
title: Implement Real-Time State Drift Detection in API Playthrough
status: In Progress
assignee:
  - '@claude'
created_date: '2026-03-30 19:51'
updated_date: '2026-04-06 04:04'
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
- [ ] #1 #1 In api-playthrough.ts, after every action, compare the 'stateHash' returned by the server with a local engine re-simulation of the same action.
- [ ] #2 #2 Fail the test immediately if the server-side state drift is detected.
- [ ] #3 #3 Log the exact diff between expected (Engine) and actual (Server) JSON states on failure.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add imports: createInitialState, applyAction from @phalanxduel/engine; GameConfig type; computeStateHash from @phalanxduel/shared/hash.
2. After the initial gameState is received (vm1Msg/vm2Msg), bootstrap a local GameConfig using the known matchId, player IDs/names, seed, and gameOptions. Call createInitialState then apply the system:init action (extracted from vm1Msg.viewModel.state.transactionLog[0]) with hashFn to get the correct initial local state.
3. After each confirmed action ([gs1, gs2] = await Promise.all(...)), apply the same chosenAction to localState using applyAction with hashFn: computeStateHash. Compare localState.transactionLog.at(-1).stateHashAfter with the server's stateHashAfter from gs1.viewModel.state.transactionLog.at(-1). On mismatch, log the action, both hashes, and JSON of both states, then throw STATE_DRIFT error.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
