---
id: TASK-144
title: Documentation Bonsai Pass
status: Done
assignee:
  - '@codex'
created_date: '2026-03-31 19:06'
updated_date: '2026-03-31 19:25'
labels: []
dependencies:
  - TASK-138
  - TASK-139
  - TASK-140
  - TASK-142
ordinal: 58000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Do one final compression, dedupe, and pruning pass so the active documentation
tree contains only essential, canonical surfaces.

## Rationale

The repo is structurally much healthier now, but it still carries old planning
and design canopies that make it feel larger and noisier than it needs to be.
This pass treats documentation like bonsai: prune anything that is not
currently earning its place as live guidance.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Non-canonical planning and design docs that are no longer active are removed from the live `docs/` tree.
- [x] #2 The remaining active docs and backlog guidance clearly reflect the slimmer canonical surface.
- [x] #3 `TASK-143` is left with a smaller, cleaner repo to verify rather than a broad backlog of obvious pruning work.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Start with the highest-noise doc families: `docs/plans/` and
   `docs/superpowers/`.
2. Delete files whose current value is historical planning/design context
   rather than active reference truth.
3. Update the audit, canonical map, and final verification task so they match
   the pruned repo state.
4. Move this task to `Human Review` once the pruning slice and verification
   evidence are recorded.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- This task intentionally chooses deletion over relocation for low-value
  planning/design docs whose remaining utility is historical rather than
  operational.
- The first pruning slice targets `docs/plans/` and `docs/superpowers/`
  because they are not canonical release-facing entry points and they are
  already classified in the audit as stale, historical, or non-canonical.
- Deleted all remaining files under `docs/plans/` and `docs/superpowers/`
  instead of relocating them. The repo already retains the meaningful context
  in backlog tasks, decision records, shipped code, and git history.
- Updated the documentation audit and canonical map so the pruned surfaces are
  treated as deleted dead weight rather than move/archive candidates.
- Added `TASK-144` as a dependency of `TASK-143` so the final verification pass
  happens after the pruning work, not in parallel with it.

## Verification

- `pnpm exec markdownlint-cli2 AGENTS.md "docs/archive/doc-2 - Documentation Consolidation Audit.md" "docs/archive/doc-3 - Canonical Documentation Map.md" "backlog/tasks/task-143 - Final-Documentation-Verification-Pass.md" "backlog/tasks/task-144 - Documentation-Bonsai-Pass.md" --config .markdownlint-cli2.jsonc`
- `rg --files docs/plans docs/superpowers`
- `rg -n "docs/plans/|docs/superpowers/" README.md docs .github AGENTS.md backlog/docs "backlog/tasks/task-143 - Final-Documentation-Verification-Pass.md" "backlog/tasks/task-144 - Documentation-Bonsai-Pass.md"`
<!-- SECTION:NOTES:END -->

## Expected Outputs

- Smaller active docs tree
- Updated canonical-map and audit guidance
- Clearer final verification scope
