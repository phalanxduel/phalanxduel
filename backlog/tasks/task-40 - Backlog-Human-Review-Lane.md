---
id: TASK-40
title: Backlog Human Review Lane
status: In Progress
assignee:
  - '@codex'
created_date: '2026-03-13 15:48'
updated_date: '2026-03-13 15:51'
labels: []
dependencies: []
references:
  - backlog/config.yml
  - backlog/docs/ai-agent-workflow.md
  - docs/system/DEFINITION_OF_DONE.md
  - backlog/tasks/task-33 - Repo-Hygiene-and-Tooling-Consolidation.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a distinct `Human Review` swimlane to the Backlog workflow so review-ready PRs are visibly separate from active implementation work. The goal is to show when the next action belongs to the human reviewer, allow tasks to move back to `In Progress` when review feedback arrives, and keep `Done` reserved for work that has completed human review.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Backlog supports a Human Review status between In Progress and Done.
- [x] #2 Canonical workflow docs define when tasks move into and out of Human Review, including sending review feedback back to In Progress.
- [x] #3 Definition of Done and task guidance require human review before PR-backed tasks move to Done.
- [x] #4 TASK-33 is updated to follow the new Human Review convention for its eventual PR-backed closeout.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update `backlog/config.yml` to add the `Human Review` lane.
2. Update the canonical workflow docs that define task movement and completion expectations.
3. Update TASK-33 so its closeout path uses the new review lane.
4. Verify the Backlog CLI still lists the board correctly and the docs are internally consistent.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added `Human Review` to `backlog/config.yml` so the board now exposes a distinct review lane between `In Progress` and `Done`.
- Updated `backlog/docs/ai-agent-workflow.md` to define lane ownership, transition rules, and when review feedback moves a task back to `In Progress`.
- Updated `docs/system/DEFINITION_OF_DONE.md` so PR-backed Backlog tasks require `Human Review` before `Done`.
- Updated `TASK-33` to use the new `Human Review` lane for its eventual parent-task closeout PR.

## Verification
- `pnpm exec markdownlint-cli2 backlog/docs/ai-agent-workflow.md docs/system/DEFINITION_OF_DONE.md "backlog/tasks/task-33 - Repo-Hygiene-and-Tooling-Consolidation.md" "backlog/tasks/task-40 - Backlog-Human-Review-Lane.md" --config .markdownlint-cli2.jsonc`
- `pnpm backlog task list --plain`
- `pnpm backlog board export /tmp/backlog-human-review-board.md --force` showed the board columns `Planned | To Do | In Progress | Human Review | Done`.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Move TASK-40 to Human Review once the workflow-change PR is reviewable and the verification evidence is recorded.
- [ ] #2 If review feedback requires more changes, move TASK-40 back to In Progress until the response is implemented and re-verified.
- [ ] #3 Do not mark TASK-40 Done until Human Review is complete and any required follow-up changes are addressed.
<!-- DOD:END -->
