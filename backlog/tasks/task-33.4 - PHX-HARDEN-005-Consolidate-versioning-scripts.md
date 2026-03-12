---
id: TASK-33.4
title: PHX-HARDEN-005 - Consolidate versioning scripts
status: To Do
assignee: []
created_date: '2026-03-12 09:07'
labels: []
dependencies: []
references:
  - bin/maint/bump-version.sh
  - bin/maint/sync-version.sh
  - package.json
  - scripts/release/deploy-fly.sh
parent_task_id: TASK-33
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove overlapping version bump paths so one canonical maintenance script owns repo version synchronization for package metadata, schema versioning, and changelog updates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 There is one canonical versioning script path used by repo maintenance and release automation.
- [ ] #2 Release automation continues to work after the consolidation.
- [ ] #3 No docs or scripts still reference a removed legacy version script.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Use sync-version.sh as the canonical path because deploy-fly.sh already relies on it, add explicit-version support there if needed, remove bump-version.sh, and update references.
<!-- SECTION:PLAN:END -->
