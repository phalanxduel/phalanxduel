---
id: TASK-377
title: 'Release automation: tag-to-release pipeline + changelog-from-commits'
status: To Do
assignee: []
created_date: '2026-07-26 19:55'
labels:
  - release
  - automation
  - ci
dependencies:
  - TASK-376
priority: medium
type: chore
ordinal: 244800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Deferred from the alpha-packaging session (TASK-374/375/376) to keep those scoped. Today's flow is manual: hand-run gh release create, hand-pin sha256 into the tap formulas. Automate:
- A GitHub Action per component (main app, duel-cli, game-swiftui) that on tag push builds, generates release notes from conventional-commit messages since the previous tag, creates the GitHub release, and bumps the corresponding homebrew-tap formula/cask sha256 automatically.
- CHANGELOG.md is currently hand-maintained; investigate generating it (or a per-release notes artifact) from the same commit-delta source so there's one source of truth instead of two.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
