---
id: TASK-385
title: Reduce GitHub Actions spend for solo maintenance
status: In Progress
assignee:
  - '@codex'
created_date: '2026-08-30 23:57'
updated_date: '2026-08-31 06:35'
labels:
  - ci
  - maintenance
  - cost
dependencies: []
references:
  - .github/workflows/pipeline.yml
documentation:
  - docs/development.md
  - docs/testing.md
  - CONTRIBUTING.md
modified_files:
  - .github/workflows/pipeline.yml
  - .github/workflows/gemini-scheduled-triage.yml
  - .github/workflows/stale.yml
  - docs/deployment.md
  - docs/testing.md
priority: high
type: chore
ordinal: 259800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reduce recurring GitHub Actions usage for the Phalanx Duel repository to a solo-maintainer baseline while preserving the minimum safeguards for gameplay correctness, server authority, dependency security, and production deployment. Routine automation should be opt-in or limited to events where it produces user value.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Normal pushes and pull requests do not run duplicate artifact-publication work that is not required to validate the change.
- [ ] #2 Gameplay correctness, adversarial server-authority coverage, dependency auditing, and production build/deployment protection remain enforced on the normal release path.
- [ ] #3 Optional SDK/artifact publication can still be run intentionally by the repository owner.
- [ ] #4 Superseded CI runs are canceled where safe, and scheduled automation does not consume recurring minutes without a clear maintenance benefit.
- [ ] #5 Workflow documentation identifies the required checks versus optional/manual checks and remains accurate.
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
1. Review pipeline and auxiliary workflow triggers for recurring or duplicate runner usage.
2. Gate optional SDK/artifact publication behind an explicit workflow dispatch input while preserving release/deploy behavior.
3. Add safe concurrency/cadence reductions for solo maintenance automation and document required versus optional checks.
4. Validate workflow syntax/pinning and run the smallest relevant local verification before committing.
5. Commit and push through the guarded CI path; finalize only after remote workflow evidence is green.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery: pipeline.yml runs test, adversarial, publish-sdks, build, and production promotion. publish-sdks duplicated dependency installation/build/generation and was not required for application validation or deployment. gemini-scheduled-triage.yml and stale.yml consumed recurring scheduled runners.

Implemented cost baseline: publish-sdks now requires manual workflow_dispatch with publish_sdks=true; Gemini scheduled triage and stale processing are manual-only. Deployment/testing docs distinguish required gates from optional SDK artifacts.

Validation: actionlint passed all workflow files; pnpm lint:md passed 692 Markdown files; git diff --check passed.

Remote Pipeline 33347538177 completed with adversarial security passing, but Test and Lint failed; build, production promotion, and SDK publication were skipped. The failure log was dominated by server test-lane output and could not be narrowed reliably before GitHub API connectivity degraded.

Current blocker: gh authentication token for account just3ws is invalid, so rerun/failed-log inspection is unavailable. Do not repeatedly spend CI minutes until credentials are repaired and the failed job is understood.
<!-- SECTION:NOTES:END -->
