---
id: TASK-384
title: Remediate CI dependency audit vulnerabilities
status: To Do
assignee:
  - '@codex'
created_date: '2026-08-30 22:59'
labels:
  - security
  - dependencies
  - ci
dependencies: []
references:
  - 'https://github.com/phalanxduel/phalanxduel/security/dependabot'
documentation:
  - docs/development.md
  - docs/testing.md
priority: high
type: chore
ordinal: 258800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolve the dependency vulnerabilities currently failing the GitHub Actions audit. Prefer lockfile/package upgrades that reach patched versions without bypassing audit; validate runtime/build compatibility and document any unavoidable transitive exceptions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 CI dependency audit passes at --audit-level=high
- [ ] #2 find-my-way, @fastify/static, undici, fast-uri, js-yaml, nanoid, postcss, and all other reported high-severity paths are upgraded or explicitly remediated
- [ ] #3 Full repository verification and affected package tests pass
- [ ] #4 Lockfile and dependency documentation remain consistent
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
