---
id: TASK-238
title: Split release preparation from deploy execution and fail closed on release env
status: Done
assignee: []
created_date: '2026-04-13 10:46'
updated_date: '2026-04-30 22:11'
labels:
  - release
  - deploy
  - security
  - scripts
dependencies: []
references:
  - reports/qa/test-council-audit.md
  - scripts/release/deploy-fly.sh
  - scripts/release/load-release-env.sh
  - scripts/release/deploy-fly-with-logs.sh
  - .github/workflows/pipeline.yml
priority: high
ordinal: 150
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Release path currently mixes version bumping docs generation staging broad git changes local env sourcing tagging pushing and deploy execution in one opaque script. Split release preparation from deploy execution and make env handling fail closed so staging and production deploys are reproducible and debuggable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Release preparation and deploy execution are separate commands or scripts with distinct responsibilities and documented inputs
- [x] #2 Deploy path no longer ignores env loading failures and no longer sources workstation-local release overrides by default for staging or production
- [x] #3 Release scripts stop staging unrelated workspace changes through broad git add behavior and only mutate explicitly owned release artifacts
- [x] #4 Deploy wrapper preserves useful live-log behavior while surfacing clear failure stage and command output
- [x] #5 Repository docs describe safe release path and debug path for failed staging or production deploys
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
Substantially complete. package.json now exposes discrete release:prepare, release:tag, and deploy scripts, separating preparation from execution.
<!-- SECTION:NOTES:END -->
