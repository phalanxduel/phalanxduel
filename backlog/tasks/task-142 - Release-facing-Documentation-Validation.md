---
id: TASK-142
title: Release-facing Documentation Validation
status: To Do
assignee: []
created_date: '2026-03-31 17:38'
labels: []
dependencies:
  - TASK-138
  - TASK-140
  - TASK-141
references:
  - README.md
  - docs/README.md
  - docs/system/OPERATIONS_RUNBOOK.md
priority: high
---

## Description

Validate that release-facing, onboarding-critical, and externally expected docs
remain accessible and accurate after consolidation work.

## Rationale

Pre-release cleanup fails if it hides or breaks the docs that humans actually
need to ship, operate, and assess the repo.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Release-critical docs remain easy to locate from root and docs indexes.
- [ ] #2 Onboarding, legal, API, and operational entry points still work after consolidation.
- [ ] #3 Consolidation does not strand users behind Backlog-only navigation for docs that should remain standard repo artifacts.
<!-- AC:END -->

## Expected Outputs

- Validated release-facing doc map
- Updated indexes and root pointers
- Confirmed externally expected doc locations

## Do Not Break

- Do not sacrifice normal contributor expectations for internal cleanup convenience.
