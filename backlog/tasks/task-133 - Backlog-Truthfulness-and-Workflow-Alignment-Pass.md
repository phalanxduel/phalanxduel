---
id: TASK-133
title: Backlog Truthfulness and Workflow Alignment Pass
status: In Progress
assignee:
  - '@codex'
created_date: '2026-03-31 13:43'
labels: []
dependencies: []
references:
  - AGENTS.md
  - backlog/docs/ai-agent-workflow.md
  - backlog/tasks/task-44 - Workstream-Repository-Hardening.md
  - backlog/tasks/task-120 - Automate-SDK-Client-Stub-Generation-from-Specs.md
priority: high
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 AGENTS.md and backlog/docs/ai-agent-workflow.md reflect the live backlog state and no longer point at stale priorities or review statuses.
- [ ] #2 Task records with landed implementation evidence, starting with TASK-120, are reconciled so status, notes, and verification match the code actually in the repo.
- [ ] #3 Duplicate or conflicting task records are resolved, including the duplicate TASK-70 files, and one consistent on-disk convention for active vs completed tasks is documented and applied for files touched in this pass.
- [ ] #4 Parent coordination tasks affected by this pass, including TASK-44, include a concise closeout summary tying child work back to the originating concerns and explaining remaining deferrals if any.
- [ ] #5 The alignment pass leaves a concrete workflow note or checklist that reinforces the rule that task updates, verification evidence, and canonical-doc updates land with the work they describe.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update canonical coordination docs to match the current backlog state.\n2. Audit task/code drift starting with TASK-120 and classify complete vs partial work.\n3. Reconcile task status, notes, and verification evidence for tasks completed in this pass.\n4. Resolve duplicate/conflicting task records and document the file-location convention.\n5. Add parent-task closeout notes where the evidence trail is currently too thin.\n6. Verify the alignment pass with backlog listings plus bin/check and record any remaining human-review exceptions.
<!-- SECTION:PLAN:END -->
