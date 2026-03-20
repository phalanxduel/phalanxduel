---
id: TASK-87
title: 'Remediation: Secrets & Leakage Protection'
status: Human Review
assignee: []
created_date: '2026-03-20 15:25'
updated_date: '2026-03-20 15:32'
labels:
  - security
  - hardening
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement automated secret scanning and harden the deployment pipeline to prevent sensitive token exposure.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Gitleaks (or equivalent) integrated into Husky pre-commit hook.
- [x] #2 Deployment script (deploy-fly.sh) refactored to use 'fly secrets' instead of --env flags.
- [x] #3 Verified that no secrets are visible in GHA logs after a test run.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Integrated `secretlint` with `@secretlint/secretlint-rule-preset-canary` for robust secret detection.
- Updated `.lintstagedrc` to run `secretlint` on all staged files during pre-commit.
- Refactored `scripts/release/deploy-fly.sh` to remove insecure `--env` flags.
- Updated `.github/workflows/pipeline.yml` to remove sensitive environment variables from `flyctl deploy` commands.
- Verified that all CI checks and local builds still pass.
<!-- SECTION:NOTES:END -->
