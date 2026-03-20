---
id: TASK-91
title: 'Remediation: Runtime Surface Reduction'
status: To Do
assignee: []
created_date: '2026-03-20 15:25'
labels:
  - security
  - hardening
milestone: m-0
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Minimize the production attack surface by removing build-time tools (pnpm) from the final runtime image.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Dockerfile runtime stage uses a pre-installed node_modules directory instead of installing via pnpm.
- [ ] #2 The 'pnpm' binary is absent from the final production image.
- [ ] #3 Verified image size reduction and container functionality.
<!-- AC:END -->
