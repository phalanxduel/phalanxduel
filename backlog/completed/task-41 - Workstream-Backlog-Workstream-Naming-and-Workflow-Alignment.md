---
id: TASK-41
title: 'Workstream: Backlog Workstream Naming and Workflow Alignment'
status: Done
assignee:
  - '@codex'
created_date: '2026-03-13 21:21'
updated_date: '2026-03-13 21:41'
labels: []
dependencies: []
priority: medium
ordinal: 500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Normalize backlog naming and workflow policy for workstream-style coordinator tasks using existing Backlog.md conventions only.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every task previously in In Progress has been moved back to To Do.
- [x] #2 Exactly one task is used for this work and set to In Progress.
- [x] #3 TASK-33, TASK-34, and TASK-34.1 use the required Workstream: titles.
- [x] #4 Existing hierarchy and dependency relationships remain intact.
- [x] #5 ai-agent-workflow.md documents the workstream convention and WIP interpretation.
- [x] #6 This task moves to Human Review when the work is complete.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reset existing In Progress tasks to To Do.
2. Create or reuse a single active workstream-alignment task.
3. Rename coordinator tasks with the Workstream: prefix.
4. Update ai-agent-workflow.md to document the convention and WIP interpretation.
5. Move this task to Human Review when the edits are complete.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reset TASK-33 and TASK-34 from In Progress to To Do before any other task state changes.
- Created TASK-41 as the single active task for this normalization pass.
- Renamed TASK-33, TASK-34, and TASK-34.1 with the Workstream: prefix without changing IDs, parent links, or dependencies.
- Updated docs/tutorials/ai-agent-workflow.md to document the Workstream: naming convention and the workstream-level WIP interpretation.
- Skipped labels because the repo does not currently use a meaningful label vocabulary in backlog/config.yml.
<!-- SECTION:NOTES:END -->
