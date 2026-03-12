---
id: TASK-33.2
title: PHX-HARDEN-003 - Retire legacy roadmap and status files
status: In Progress
assignee:
  - '@codex'
created_date: '2026-03-12 09:07'
updated_date: '2026-03-12 13:37'
labels: []
dependencies: []
references:
  - TODO.md
  - .claude/ROADMAP.md
  - .claude/RETROSPECTIVES.md
  - docs/plans/README.md
  - docs/system/FUTURE.md
  - docs/system/DECISIONS.md
  - scripts/ci/verify-doc-fsm-consistency.ts
parent_task_id: TASK-33
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove or archive tracked legacy roadmap and status files that now duplicate Backlog.md, while preserving any required compatibility stubs until backlinks and checks are updated.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 TODO.md and tracked roadmap/status duplicates are either removed or reduced to minimal migration stubs.
- [ ] #2 Any remaining compatibility stubs have explicit canonical Backlog references.
- [ ] #3 rules:check and any relevant doc references continue to pass.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Inventory tracked roadmap/status files, classify them as delete versus compatibility stub, update backlinks and rules check dependencies where safe, and leave active backlog/task records untouched.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Deleted `docs/system/FUTURE.md` after removing the README link and the `rules:check` dependency on it.
- The remaining legacy-roadmap/status cleanup still includes TODO.md and any other tracked migration stubs.
<!-- SECTION:NOTES:END -->
