---
id: TASK-339
title: PHX-UI-006 - Onboarding How-To-Play Modal
status: Done
assignee:
  - '@antigravity'
created_date: '2026-07-01 21:43'
updated_date: '2026-07-01 21:48'
labels: []
dependencies: []
ordinal: 181800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add an accessible 'How to Play' guide in the Lobby.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Lobby has a visible 'How to Play' button; opens a modal summarizing the rules; visually engaging with images/icons.
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
