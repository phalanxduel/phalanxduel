---
id: TASK-87
title: 'Remediation: Secrets & Leakage Protection'
status: In Progress
assignee: []
created_date: '2026-03-20 15:25'
updated_date: '2026-03-20 15:27'
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
- [ ] #1 Gitleaks (or equivalent) integrated into Husky pre-commit hook.
- [ ] #2 Deployment script (deploy-fly.sh) refactored to use 'fly secrets' instead of --env flags.
- [ ] #3 Verified that no secrets are visible in GHA logs after a test run.
<!-- AC:END -->
