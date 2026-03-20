---
id: TASK-92
title: 'Remediation: GHA SHA Pinning (Seal)'
status: To Do
assignee: []
created_date: '2026-03-20 15:25'
labels:
  - security
  - hardening
  - deferred
milestone: m-0
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
[DEFERRED/SEAL TASK] Finalize supply chain security by pinning all GitHub Actions to immutable commit SHAs. To be executed only upon movement out of Beta.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All third-party actions in .github/workflows/*.yml are pinned to full commit SHAs.
- [ ] #2 All pinned SHAs are verified against the target version tags.
<!-- AC:END -->
