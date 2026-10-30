---
id: TASK-33.4
title: Consolidate Versioning Scripts
status: Done
assignee:
  - '@codex'
created_date: '2026-03-12 09:07'
updated_date: '2026-03-15 19:59'
labels: []
dependencies: []
references:
  - bin/maint/sync-version.sh
  - package.json
  - scripts/release/deploy-fly.sh
  - docs/reference/pnpm-scripts.md
parent_task_id: TASK-33
priority: medium
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove overlapping version bump paths so one canonical maintenance script owns repo version synchronization for package metadata, schema versioning, and changelog updates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 There is one canonical versioning script path used by repo maintenance and release automation.
- [x] #2 Release automation continues to work after the consolidation.
- [x] #3 No docs or scripts still reference a removed legacy version script.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Use sync-version.sh as the canonical path because deploy-fly.sh already relies on it, add explicit-version support there, remove the legacy explicit-version helper, and update references.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Consolidated explicit-version and auto-increment behavior into `bin/maint/sync-version.sh`.
- Removed the legacy standalone version bump helper.
- Updated docs to describe `pnpm version:sync -- <semver>` and refreshed the remaining historical plan references to the canonical script.
- Verified the unified script syntax, help output, and explicit-version no-op behavior against the current repo version.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed version-script consolidation by making `bin/maint/sync-version.sh` the only canonical path and deleting the redundant helper. Verification: `bash -n bin/maint/sync-version.sh`, `bash bin/maint/sync-version.sh --help`, `bash bin/maint/sync-version.sh 0.3.0-rev.6`, `rg bump-version\.sh .`.
<!-- SECTION:FINAL_SUMMARY:END -->
