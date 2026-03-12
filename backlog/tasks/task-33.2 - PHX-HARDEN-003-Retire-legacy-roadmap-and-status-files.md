---
id: TASK-33.2
title: PHX-HARDEN-003 - Retire legacy roadmap and status files
status: In Progress
assignee:
  - '@codex'
created_date: '2026-03-12 09:07'
updated_date: '2026-03-12 14:02'
labels: []
dependencies: []
references:
  - TODO.md
  - .claude/ROADMAP.md
  - .claude/RETROSPECTIVES.md
  - docs/system/DECISIONS.md
  - scripts/ci/verify-doc-fsm-consistency.ts
  - backlog/docs/PLAN - configurable-grid-bot-status.md
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

- Deleted `docs/plans/README.md` because it was only a migration tombstone with no canonical value.
- Deleted `TODO.md`, `progress.md`, and `docs/system/DECISIONS.md` after moving the only remaining live context into Backlog docs and adding `backlog/decisions/README.md` as the canonical decision index.
- Retargeted the remaining live backlinks and `scripts/ci/verify-doc-fsm-consistency.ts` to Backlog-owned canonical files so the deleted stubs are no longer required.
- Retargeted live `docs/plans/*` references in active docs and backlog plans to canonical `backlog/docs/*` or `backlog/completed/docs/*` paths.
<!-- SECTION:NOTES:END -->
