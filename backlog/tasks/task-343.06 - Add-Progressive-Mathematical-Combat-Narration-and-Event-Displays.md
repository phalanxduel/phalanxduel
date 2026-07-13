---
id: TASK-343.06
title: Add Progressive Mathematical Combat Narration and Event Displays
status: To Do
assignee: []
created_date: '2026-07-13 14:00'
updated_date: '2026-07-13 14:00'
labels:
  - client
  - mathematical-narration
  - ux
dependencies:
  - TASK-343.05
  - TASK-343.07
documentation:
  - docs/gameplay/rules.md
  - docs/reference/test-constitution.md
  - docs/architecture/principles.md
parent_task_id: TASK-343
priority: high
ordinal: 191800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Use authoritative calculation provenance to create a distinctive player-facing mathematical experience across live narration, combat events, attack preview, replay, and post-match explanation. Provide compact tactical narration by default with cinematic and analyst presentations from the same trace.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Nontrivial combat modifiers display concise equations during live play
- [ ] #2 Every combat event offers an accessible explanation of how its result was calculated
- [ ] #3 Cinematic tactical and analyst presentations render the same authoritative trace
- [ ] #4 Attack preview and replay show formula chains consistent with committed resolution
- [ ] #5 Displayed values originate only from observer-authorized calculation provenance
- [ ] #6 Screen-reader narration communicates equivalent mathematical meaning
- [ ] #7 Deterministic browser evidence covers desktop and mobile gameplay
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
