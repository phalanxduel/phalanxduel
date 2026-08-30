---
id: TASK-382.03
title: Render equipped cosmetics across multiplayer card surfaces
status: To Do
assignee: []
created_date: '2026-07-31 03:56'
updated_date: '2026-07-31 04:16'
labels:
  - client
  - cosmetics
  - multiplayer
  - visual-design
dependencies:
  - TASK-382.01
  - TASK-382.02
parent_task_id: TASK-382
priority: medium
type: task
ordinal: 252800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Apply each participant’s equipped card back and card theme throughout the browser match experience. Opponent hands must use the owning participant’s public card-back design, and public cards must retain the owning participant’s selected theme consistently for both players and spectators.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Opponent-hand placeholders render the owning participant’s equipped card-back design instead of a viewer-local theme.
- [ ] #2 Public battlefield and revealed card surfaces render the owning participant’s equipped theme consistently for players and spectators.
- [ ] #3 Hidden card identity remains redacted and interaction, suit, face, value, health, selected, damaged, and disabled states remain legible.
- [ ] #4 Default, guest, unknown, and legacy cosmetic values fall back without rendering errors.
- [ ] #5 Client component tests and deterministic desktop/mobile multiplayer playthrough captures verify two participants with different equipped themes.
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a client cosmetic registry and authenticated settings panel showing locked, owned, and equipped states. 2. Track projected player cosmetics separately from GameState. 3. Extend the layered CardView with owner-specific theme data and a hidden-card-back variant. 4. Render redacted opponent hands from handCount and apply the owner's theme to all public battlefield cards. 5. Add responsive styling and semantic data markers. 6. Add client tests and deterministic desktop/mobile design-baseline captures. 7. Run focused and full verification.
<!-- SECTION:PLAN:END -->
