---
id: TASK-241
title: Enforce workflow reproducibility and pipeline security policy in CI
status: Done
assignee: []
created_date: '2026-04-13 10:49'
updated_date: '2026-05-01 09:43'
labels:
  - ci
  - security
  - supply-chain
milestone: Post-Promotion Hardening
dependencies: []
references:
  - reports/qa/test-council-audit.md
  - .github/SECURITY.md
  - .github/workflows/pipeline.yml
  - .lintstagedrc
  - docs/architecture/security-strategy.md
  - docs/reference/security-resources.md
priority: high
ordinal: 8040
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Repository policy and actual pipeline drifted apart. CI still uses non-SHA-pinned workflow actions, documented security scans are not enforced, and some commit-time tooling fetches packages dynamically. Align pipeline with stated policy so builds are reproducible and security guarantees are real.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Primary GitHub Actions workflows use SHA-pinned external actions or repo policy is updated to match actual enforcement
- [x] #2 CI includes documented security checks or documentation is reduced to truthful claims with explicit future work tracked
- [x] #3 Commit-time and CI-time tooling no longer depends on unpinned dynamic package fetches for routine formatting or validation
- [x] #4 Workflow permissions are reviewed and reduced to least privilege for jobs that do not need broad scopes
- [x] #5 Verification docs explain which security and reproducibility checks run in protected CI and which remain optional local tools
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Pinned superfly/flyctl-actions to SHA ed8efb33 (was @master branch ref — the only unpinned action). Added pnpm audit --audit-level=high step to test job (enforces the documented weekly audit policy). Replaced npx sort-package-json in .lintstagedrc with direct local binary call. Workflow permissions already follow least-privilege (contents:read default, write only where needed). Expanded SECURITY.md with two tables: CI-enforced checks vs local-only checks.
<!-- SECTION:FINAL_SUMMARY:END -->
