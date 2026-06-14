---
id: TASK-314
title: V2-GODOT-004 - Define AutomationCheckpoint protocol
status: In Progress
assignee: []
created_date: '2026-06-14 05:24'
updated_date: '2026-06-14 05:47'
labels: []
milestone: m-14
dependencies:
  - TASK-312
priority: high
ordinal: 155000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Shared schema created for AutomationCheckpoint
- [ ] #2 Automation can wait on semantic state checkpoints (connected, hydrated, animation_idle, etc.)
- [ ] #3 Godot client exposes these checkpoints deterministically
- [ ] #4 Add requirement to verify AnimationCue consumption as part of checkpoint verification
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
