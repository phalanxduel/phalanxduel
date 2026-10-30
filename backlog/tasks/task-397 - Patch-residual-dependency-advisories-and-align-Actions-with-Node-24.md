---
id: TASK-397
title: Patch residual dependency advisories and align Actions with Node 24
status: In Progress
assignee:
  - '@codex'
created_date: '2026-10-30T20:04:00Z'
updated_date: '2026-10-30T20:19:00Z'
labels: []
dependencies: []
references:
  - https://github.com/actions/checkout/releases
  - https://github.com/docker/login-action/releases
documentation:
  - docs/agents/backlog-best-practices.md
  - .github/workflows/pipeline.yml
  - package.json
priority: high
type: chore
ordinal: 270800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Clear currently reported low and moderate npm advisories using compatible patched versions where possible, and update old GitHub Actions runtime pins that trigger Node 20 deprecation warnings. Keep changes behavior-compatible; document and leave unresolved any package requiring a breaking or otherwise unsafe upgrade.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `pnpm audit --audit-level low` reports no untriaged advisories, with any blocked advisory documented and explicitly scoped.
- [x] #2 GitHub workflow action pins implicated in Node 20 runtime warnings are updated to verified Node 24-compatible releases without changing workflow inputs or deployment behavior.
- [x] #3 Lockfile is consistent with package manifests and overrides.
- [ ] #4 Focused validation and the repository quick verification pass; CI results are recorded.
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Read current advisory package versions, dependency paths, and fixed-version metadata from the npm audit report.
2. Apply compatible patch updates and raise existing override floors to patched versions; do not force major dependency or API changes.
3. Update workflow action pins to Node 24-compatible releases while preserving existing inputs.
4. Run audit, lockfile, action pinning, and repository quick verification. Leave any advisory requiring an unsafe/breaking jump documented and incomplete.

5. Review pre-existing audit suppressions; remove any suppression whose advisory was withdrawn or whose risk is no longer present, so the zero-advisory result is not achieved by hiding a finding.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Context Hunter micro-brief: nearest patterns are the root package.json `pnpm.overrides` block (minimum patched floors) and full SHA-pinned action references with adjacent version comments in `.github/workflows/`. Use these patterns and regenerate the lockfile with pnpm. Main risk: advisory fixes may require a newer minor/major in a 0.x package; inspect the full dependency path and validate rather than forcing ranges blindly. Workflow action version changes preserve existing `with:` inputs; verify against CI.

At task start, `auditConfig` suppressed GHSA-vfj7-8cjw-p6xm / CVE-2026-93687 for braces. GitHub's advisory database withdrew it on 2026-10-23 as not practically exploitable, with no patched version. The suppression was removed and the full audit then returned no known vulnerabilities.

After the first push, GitHub Dependabot's dependency snapshot identified one additional stale path missed by the npm audit endpoint: brace-expansion 5.0.9 (<5.0.12) through minimatch. Raised the override floor to >=5.0.12 and refreshed/installed the lockfile; `pnpm why brace-expansion` confirms 5.0.12 and a fresh `pnpm audit --audit-level low` remains clean. Final commit and CI verification for this last patch are pending.

After the brace-expansion patch, `pnpm verify:quick` passed build, lint/actionlint, database isolation, typecheck, docs verification, and formatting. The first pushed revision's remote adversarial job passed; its pipeline Test and Lint job was still queued when the final brace-expansion fix was prepared. A fresh pipeline run for the final commit will provide authoritative remote verification.
<!-- SECTION:NOTES:END -->
