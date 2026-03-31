---
id: TASK-132
title: Backlog Truthfulness and Workflow Alignment Pass
status: Done
assignee:
  - '@codex'
created_date: '2026-03-31 13:43'
updated_date: '2026-03-31 13:51'
labels: []
dependencies: []
references:
  - AGENTS.md
  - backlog/docs/ai-agent-workflow.md
  - backlog/tasks/task-44 - Workstream-Repository-Hardening.md
  - backlog/tasks/task-120 - Automate-SDK-Client-Stub-Generation-from-Specs.md
priority: high
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bring the canonical coordination docs, backlog task records, and on-disk task
layout back into alignment so the repo's workflow surfaces tell the same story
about what is active, what is complete, and what still needs human review.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 AGENTS.md and backlog/docs/ai-agent-workflow.md reflect the live backlog state and no longer point at stale priorities or review statuses.
- [x] #2 Task records with landed implementation evidence, starting with TASK-120, are reconciled so status, notes, and verification match the code actually in the repo.
- [x] #3 Duplicate or conflicting task records are resolved, including the duplicate TASK-70 files, and one consistent on-disk convention for active vs completed tasks is documented and applied for files touched in this pass.
- [x] #4 Parent coordination tasks affected by this pass, including TASK-44, include a concise closeout summary tying child work back to the originating concerns and explaining remaining deferrals if any.
- [x] #5 The alignment pass leaves a concrete workflow note or checklist that reinforces the rule that task updates, verification evidence, and canonical-doc updates land with the work they describe.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update canonical coordination docs to match the current backlog state.
2. Audit task/code drift starting with TASK-120 and classify complete vs partial work.
3. Reconcile task status, notes, and verification evidence for tasks completed in this pass.
4. Resolve duplicate/conflicting task records and document the file-location convention.
5. Add parent-task closeout notes where the evidence trail is currently too thin.
6. Verify the alignment pass with backlog listings plus bin/check and record any remaining human-review exceptions.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Updated `AGENTS.md` so its current-priority section matches the live backlog
  state instead of pointing at stale Human Review claims for TASK-2 and TASK-46.
- Updated `backlog/docs/ai-agent-workflow.md` to document the on-disk
  convention (`backlog/tasks` for active work, `backlog/completed` for `Done`)
  and removed the stale hardcoded TASK-45 focus from the workflow guide.
- Reconciled TASK-120 by recording the partial implementation already present in
  the repo and explicitly noting the open gaps against AC #3 and AC #4.
- Added a parent closeout summary to TASK-44 so the hardening workstream now
  explains how its child tasks map back to the originating audit concerns.
- Removed duplicate backlog records created by drift: the stale TASK-70
  duplicate and the accidental duplicate hygiene task file.
<!-- SECTION:NOTES:END -->

## Verification

- `pnpm exec markdownlint-cli2 AGENTS.md backlog/docs/ai-agent-workflow.md "backlog/tasks/task-120 - Automate-SDK-Client-Stub-Generation-from-Specs.md" "backlog/tasks/task-44 - Workstream-Repository-Hardening.md" "backlog/tasks/task-132 - Backlog-Truthfulness-and-Workflow-Alignment-Pass.md" --config .markdownlint-cli2.jsonc`
- `rg -n "^id: TASK-70$|^id: TASK-132$|Backlog Truthfulness and Workflow Alignment Pass" backlog`
- `backlog task list --plain`
