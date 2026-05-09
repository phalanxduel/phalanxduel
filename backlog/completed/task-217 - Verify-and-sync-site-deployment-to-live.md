---
id: TASK-217
title: Verify and sync site deployment to live
status: Done
assignee: []
created_date: '2026-04-07 02:38'
updated_date: '2026-05-02 12:50'
labels:
  - site
  - infra
  - p0
  - promotion-readiness
dependencies:
  - TASK-213
  - TASK-214
  - TASK-215
priority: high
ordinal: 4300
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The live site at phalanxduel.com is out of sync with the repo. The deployed homepage shows different hero text than the repo contains. All P0 site fixes (doc link corrections, OG image, mobile nav) must be deployed to take effect. Verify GitHub Pages deploy pipeline, ensure gh-pages branch reflects latest main, and confirm live site matches repo content.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Live site phalanxduel.com content matches latest repo commit
- [x] #2 All P0 site fixes (TASK-213, TASK-214, TASK-215) are visible on live site
- [x] #3 Hero text, navigation, and footer links match repo source
<!-- AC:END -->

## Definition of Done
--------------------------------------------------
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Completed as part of v1.1.0 release. Visual identity and deployment state confirmed across site and game client.
<!-- SECTION:NOTES:END -->
