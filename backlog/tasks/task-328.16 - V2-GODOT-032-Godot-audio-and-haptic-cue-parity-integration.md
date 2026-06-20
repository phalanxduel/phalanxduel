---
id: TASK-328.16
title: V2-GODOT-032 - Godot audio and haptic cue parity integration
status: Done
assignee:
  - '@antigravity'
created_date: '2026-06-16 01:20'
updated_date: '2026-06-20 11:41'
labels: []
milestone: m-14
dependencies:
  - TASK-323
  - TASK-328.07
  - TASK-328.10
references:
  - shared/src/protocol.ts
  - godot/client/
  - client/src/pizzazz.ts
documentation:
  - docs/reference/qa-runners.md
  - .agents/skills/phalanx-godot-ux-parity/references/parity-workflow.md
parent_task_id: TASK-328
priority: medium
ordinal: 170600
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Complete Godot playback of shared audio/haptic cues after the combat and result surfaces are in place. This task integrates the existing cue schema into the Godot UX without blocking the core visual playthrough parity path.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Godot consumes shared audio/haptic cue data from authoritative state/events rather than local rule duplication.
- [x] #2 Deployment, combat, LP damage, victory, and error/invalid-action moments trigger appropriate Godot audio or haptic feedback where supported.
- [x] #3 Cue playback can be disabled or safely no-op in headless automation and unsupported platforms.
- [x] #4 Automation artifacts record cue events or checkpoint metadata sufficient to prove cue wiring without requiring audible output in CI/local agents.
- [x] #5 Docs state platform support and any Steam/mobile assumptions for audio and haptics.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
