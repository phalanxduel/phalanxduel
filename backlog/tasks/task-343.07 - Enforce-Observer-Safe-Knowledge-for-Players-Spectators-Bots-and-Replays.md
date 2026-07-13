---
id: TASK-343.07
title: Enforce Observer-Safe Knowledge for Players Spectators Bots and Replays
status: Done
assignee:
  - '@codex'
created_date: '2026-07-13 14:00'
updated_date: '2026-07-13 18:03'
labels:
  - gameplay
  - security
  - bots
dependencies:
  - TASK-343.01
  - TASK-343.02
  - TASK-343.05
documentation:
  - docs/gameplay/rules.md
  - docs/reference/test-constitution.md
  - docs/architecture/principles.md
modified_files:
  - >-
    backlog/tasks/task-343.07 -
    Enforce-Observer-Safe-Knowledge-for-Players-Spectators-Bots-and-Replays.md
  - docs/adr/ADR-009-official-spectator-delay-policy.md
  - docs/adr/ADR-017-authoritative-view-model-projection.md
  - docs/api/openapi.json
  - docs/architecture/security-strategy.md
  - docs/gameplay/rule-evidence.json
  - docs/gameplay/rules.md
  - docs/quality/gameplay-rule-evidence.md
  - docs/reference/gameplay-assurance.md
  - docs/system/KNIP_REPORT.md
  - docs/system/dependency-graph.svg
  - engine/src/bot.ts
  - engine/src/index.ts
  - engine/src/observer-knowledge.ts
  - engine/src/replay.ts
  - engine/tests/observer-knowledge.test.ts
  - engine/tests/visibility.test.ts
  - scripts/ci/verify-rule-evidence.ts
  - server/src/match.ts
  - server/src/routes/matches.ts
  - server/src/utils/projection.ts
  - server/src/utils/redaction.ts
  - server/src/utils/spectator-delay.ts
  - server/tests/__snapshots__/openapi.test.ts.snap
  - server/tests/filter.test.ts
  - server/tests/match.test.ts
  - server/tests/spectator-delay.test.ts
  - shared/schemas/game-state.schema.json
  - shared/schemas/server-messages.schema.json
  - shared/schemas/turn-result.schema.json
  - shared/src/schema.ts
parent_task_id: TASK-343
priority: high
ordinal: 192800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Unify observer-relative projection so players, spectators, bots, narration, previews, and replay viewers receive only authorized knowledge. Competitive bots use information-set-safe inputs; omniscient adapters remain explicitly internal and unranked.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Equivalent states differing only in hidden information produce identical observer projections
- [x] #2 Competitive bot decisions cannot directly inspect unauthorized hands or draw piles
- [x] #3 Narration and calculation traces do not leak hidden card identity
- [x] #4 Spectator and replay visibility follow documented lifecycle rules
- [x] #5 Omniscient research adapters are explicit isolated and excluded from competitive ratings
- [x] #6 Negative noninterference tests cover every observer role
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Map player, spectator, bot, narration, preview, and replay projection paths; identify every hidden-information source and current lifecycle rule.
2. Define one observer-role/context contract and explicit information-set policy, including isolated omniscient research access that is ineligible for competitive rating.
3. Centralize observer-relative state/event/calculation projection and route all public consumers through it.
4. Add negative noninterference/property tests for players, spectators, competitive bots, narration, previews, and replay lifecycle phases.
5. Document the visibility model, regenerate affected contracts/artifacts, run full verification and playability, close Backlog, and commit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a single engine-owned observer-knowledge kernel for player, competitive-bot, delayed spectator, public-replay, and omniscient-research contexts. Live projections hide both draw piles, non-owner hands, deck seeds, hidden action card IDs, liveness, and integrity witnesses that commit to hidden state; terminal public replay deliberately unlocks auditable card zones and integrity evidence. Calculation provenance is exposed only as the longest observer-authorized prefix, preserving sequence and prior-step closure. Server player/spectator actions and events, REST replay state, legacy WebSocket results, redaction wrappers, and projections delegate to the kernel. Live spectators receive a fail-closed reconstructed replay frame with a minimum two-turn and default three-turn delay. All competitive bot tiers first consume the projected information set; omniscient research decisions require an explicit purpose and are marked ratingEligible=false.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Unified all public gameplay knowledge behind an observer-relative projection kernel and proved noninterference across players, competitive bots, spectators, narration/calculation traces, and terminal replay. Closed concrete leaks from live deck seeds, transaction/turn hashes, raw deploy/reinforce actions, and immediate spectator frames. Added explicit unranked omniscient research adapters and lifecycle-safe replay disclosure. Verification passed: pnpm check (1,181 tests), pnpm qa:playthrough:verify (12/12), 71-rule evidence verification, and exhaustive combat oracle (2,355,388 checks; digest 9e3d7f6d1a034c70eca28998bb1636184d520a7815bd8231f0684ab3ab8741dc).
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
