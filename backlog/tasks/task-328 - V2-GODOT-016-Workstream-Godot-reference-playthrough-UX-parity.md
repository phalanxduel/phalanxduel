---
id: TASK-328
title: 'V2-GODOT-016 - Workstream: Godot reference-playthrough UX parity'
status: In Progress
assignee:
  - '@codex'
created_date: '2026-06-16 01:17'
updated_date: '2026-06-16 10:48'
labels: []
milestone: m-14
dependencies:
  - TASK-311
  - TASK-327
references:
  - artifacts/playthrough-head2head/
  - godot/client/
  - bin/qa/simulate-headless.ts
  - bin/qa/godot-playthrough.ts
  - bin/qa/godot-automation.ts
documentation:
  - docs/testing.md
  - docs/reference/qa-runners.md
  - docs/reference/playthrough-scenarios.md
  - docs/agents/skills/gameplay-automation.md
  - .agents/skills/phalanx-end-to-end-playthrough/SKILL.md
  - .agents/skills/phalanx-godot-ux-parity/SKILL.md
priority: high
ordinal: 169000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Organize the remaining Godot v2 migration around the battle-tested browser/reference playthrough. The goal is a Steam-ready Godot client that preserves the v1 user experience from lobby through game-over while remaining fully automatable. This parent task owns the DAG of parity slices; child tasks should complete in dependency order from shared artifact contracts through screen-by-screen Godot parity.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A dependency-ordered child task DAG exists for the Godot UX parity migration.
- [x] #2 The DAG explicitly identifies the shared browser/reference playthrough artifact contract as the highest-value common dependency.
- [x] #3 Every child task preserves the rule that TypeScript engine/server state remains authoritative and Godot must not duplicate gameplay rules.
- [x] #4 The final child tasks cover the described scenarios: guest PvP, guest PvB, spectator, replay, touch/mobile or controller input, auth PvP/PvB, full LP20 pacing, headed visible runs, and headless automation.
- [ ] #5 Godot v2 must map the v1/browser user experience as close to 1:1 as practical; any intentional visual or interaction difference must be documented as an accepted parity gap before the slice is considered complete.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Dependency-ordered Godot UX parity DAG:

0. Existing prerequisites: TASK-311 (v1 UI/automation inventory) and TASK-327 (first Godot automation harness) are prerequisites for the workstream.
1. TASK-328.01 is the highest-value shared dependency: canonical browser/reference playthrough artifact contract. It unlocks every comparison task.
2. TASK-328.02 emits browser-equivalent Godot artifacts. It unlocks objective Godot evidence collection.
3. TASK-328.03 adds the reference-vs-Godot parity comparator. It unlocks repeatable pass/fail checks for every screen slice.
4. TASK-328.04 through TASK-328.10 port the UX screens in playthrough order: launch/hydration, lobby/match start, deployment, combat, reinforcement/follow-up, spectator/live-director, and game-over/final result.
5. TASK-328.11 completes the first deterministic end-to-end Godot reference playthrough.
6. TASK-328.12 through TASK-328.17 expand scenario coverage: guest PvP/PvB, replay/spectator recording, auth PvP/PvB, touch/mobile/controller input, audio/haptic cue parity, full-length LP20 pacing, headed visible runs, and headless automation.
7. TASK-328.18 is the Steam-ready Godot UX parity exit gate.

Scheduling rule: always pick the highest-priority unblocked task that unlocks the most downstream tasks. Today that is TASK-328.01 after TASK-311/TASK-327 are resolved; once the artifact contract exists, TASK-328.02 and TASK-328.03 become the shared unlockers for all screen work.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The browser/reference playthrough is the battle-tested v1 oracle. The Godot client is the migration target. Do not treat a browser playthrough pass as Godot parity; use it to generate comparison artifacts that drive Godot implementation. Do not duplicate TypeScript engine rules in Godot.

Parity constraint from product direction: this is a near-1:1 UX port, not a redesign. Use the v1/browser playthrough as the visual and interaction oracle for Godot v2; preserve screen flow, visible state, feedback, automation checkpoints, and terminal result evidence unless a difference is explicitly accepted and documented.

Started execution of the Godot reference-playthrough UX parity workstream. Current critical path is TASK-311 -> TASK-328.01 -> TASK-328.02 -> TASK-328.03 before broad Godot screen implementation.

Execution progress: TASK-311 has moved to Verification with the v1 UI, automation, WebSocket, and replay contract docs produced. Next unblocked shared dependency is TASK-328.01, the canonical reference playthrough artifact contract.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
