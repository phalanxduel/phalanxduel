---
id: TASK-379
title: Path-scope pre-commit/pre-push verification hooks by changed-file surface
status: To Do
assignee: []
created_date: '2026-07-26 19:55'
labels:
  - dx
  - ci
dependencies: []
references:
  - .husky/pre-commit
  - scripts/ci/verify.sh
priority: low
type: chore
ordinal: 246800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Observed this session: a 2-line clients/go/duel-cli change paid the full monorepo pre-commit (pnpm verify:quick) and pre-push (pnpm verify:ci) cost — full build/lint/typecheck/coverage across all 8 TS workspaces, several minutes, for a diff that touched zero TS surfaces. Scope the hooks so a diff confined to clients/go/**, game-swiftui (separate repo, N/A), or docs/** skips the TS build/lint/typecheck/coverage phases and only runs go:clients:check / lint:md as relevant.

Secondary finding: the WS fuzz/property test in verify:ci prints thousands of expected 'Invalid Client Message' log lines to stdout, burying real failure signal when a hook does fail — worth routing that to a file or gating behind VERBOSE=1.
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
