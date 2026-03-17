---
id: TASK-33.2
title: Retire Legacy Roadmap and Status Files
status: Done
assignee:
  - '@codex'
created_date: '2026-03-12 09:07'
updated_date: '2026-03-15 19:59'
labels: []
dependencies: []
references:
  - backlog/completed/docs/PLAN - 2026-02-24 - legacy-roadmap.md
  - docs/history/RETROSPECTIVES.md
  - backlog/decisions/README.md
  - scripts/ci/verify-doc-fsm-consistency.ts
  - backlog/docs/PLAN - configurable-grid-bot-status.md
  - docs/review/META_ANALYSIS.md
parent_task_id: TASK-33
priority: medium
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove or archive tracked legacy roadmap and status files that now duplicate Backlog.md, while preserving any required compatibility stubs until backlinks and checks are updated.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 TODO.md and tracked roadmap/status duplicates are either removed or reduced to minimal migration stubs.
- [x] #2 Any remaining compatibility stubs have explicit canonical Backlog references.
- [x] #3 rules:check and any relevant doc references continue to pass.
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
- Moved the archival plan content from `.claude/ROADMAP.md` into `backlog/completed/docs/PLAN - 2026-02-24 - legacy-roadmap.md` so plan history now lives under Backlog instead of assistant-specific config.
- Moved `.claude/RETROSPECTIVES.md` into `docs/history/RETROSPECTIVES.md` and folded the last standalone review archive notice into `docs/review/META_ANALYSIS.md`.

## Verification

<!-- SECTION:VERIFICATION:BEGIN -->
- `pnpm lint:md backlog/decisions/README.md docs/review/META_ANALYSIS.md backlog/docs/PLAN - configurable-grid-bot-status.md backlog/docs/PLAN - 2026-03-10 - otel-native-hybrid-plan.md backlog/tasks/task-33.2 - PHX-HARDEN-003 - Retire legacy roadmap and status files.md`
- `pnpm rules:check`
- `pnpm lint:md backlog/completed/docs/PLAN - 2026-02-24 - legacy-roadmap.md docs/history/RETROSPECTIVES.md`
<!-- SECTION:VERIFICATION:END -->
- Retargeted live `docs/plans/*` references in active docs and backlog plans to canonical `backlog/docs/*` or `backlog/completed/docs/*` paths.
<!-- SECTION:NOTES:END -->
