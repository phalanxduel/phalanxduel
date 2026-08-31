---
id: TASK-384
title: Remediate CI dependency audit vulnerabilities
status: Done
assignee:
  - '@codex'
created_date: '2026-08-30 22:59'
updated_date: '2026-08-31 06:35'
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
modified_files:
  - package.json
  - admin/package.json
  - server/package.json
  - pnpm-lock.yaml
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
- [x] #1 CI dependency audit passes at --audit-level=high
- [x] #2 find-my-way, @fastify/static, undici, fast-uri, js-yaml, nanoid, postcss, and all other reported high-severity paths are upgraded or explicitly remediated
- [x] #3 Full repository verification and affected package tests pass
- [x] #4 Lockfile and dependency documentation remain consistent
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Investigating the patched-version paths reported by the CI audit. Will update direct dependencies and root overrides together, then run focused package checks and the full repository gate.

Updated direct @fastify/static dependencies to ^10.1.1 and added a scoped @fastify/swagger-ui static override; patched fast-uri, find-my-way, nanoid, postcss, and js-yaml constraints; pinned undici to patched 7.29.0 for jsdom compatibility.

Verification: pnpm check passed after narrowing js-yaml to 4.3.1 and undici to 7.29.0. Targeted client suite passed 27 files / 237 tests. Registry pnpm audit could not complete because registry.npmjs.org DNS was unavailable in the environment; remote CI audit remains the authoritative confirmation.

Remote workflow 33341346452 reduced the audit from 9 high findings to one high finding: ip-address <=10.3.0 via the OpenAPI generator proxy chain. Added ip-address >=10.3.1 override.

After the final override: pnpm check passed, including 163 shared, 422 engine, 402 server plus migrations, 237 client, 15 admin, and 8 MCP tests.

Finalization: all four acceptance criteria are supported by remote audit workflow 33341657092 and local full verification. All Definition of Done checks completed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Remediated the high-severity dependency audit paths by upgrading direct @fastify/static and adding narrowly scoped/root overrides for find-my-way, fast-uri, nanoid, postcss, js-yaml, undici, and ip-address. Remote workflow 33341657092 confirmed the dependency audit and adversarial security jobs pass; local commit/pre-push verification also passed build, lint, typecheck, full test/coverage suites, schema, docs, rules, replay, playability, and visual gates. The only later Pipeline failure was unrelated test-lane lifecycle flakiness on the separate CI-cost commit.
<!-- SECTION:FINAL_SUMMARY:END -->
