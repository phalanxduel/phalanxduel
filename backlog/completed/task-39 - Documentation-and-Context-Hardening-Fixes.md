---
id: TASK-39
title: Documentation and Context Hardening Fixes
status: Done
assignee: []
created_date: '2026-03-12 19:23'
updated_date: '2026-03-13 17:41'
labels: []
milestone: Hardening Pass 2026-03-12
dependencies: []
priority: medium
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Execute the findings from the Repository Hardening Audit to reduce AI context noise, remove mystery files, and improve repo-wide navigation.
<!-- SECTION:DESCRIPTION:END -->

## Historical Outcome

Given the audit identified archived AI-report clutter, mystery directories, and
missing repo navigation aids, when this task completed, then those findings were
translated into concrete cleanup work that reduced active-context noise and made
the monorepo easier to navigate.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 AI context hazards identified in the audit are archived or removed.
- [x] #2 Empty mystery directories are removed.
- [x] #3 README.md contains a clear Monorepo Map.
- [x] #4 A clear archival policy is documented.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Completed the mystery directory cleanup (deleted docs/formats/) and added the Monorepo Map to README.md during the initial audit phase.

Completed the archival and hardening pass. Documented the Archival and Retention Policy in docs/system/ARCHIVAL_POLICY.md. Moved AI context hazards from docs/review/archive/ to a global root-level /archive/ai-reports/ directory and updated all 50+ references across the repository to maintain traceability while hardening the active context surface.
<!-- SECTION:NOTES:END -->
