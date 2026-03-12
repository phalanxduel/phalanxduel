---
id: TASK-33.1
title: PHX-HARDEN-002 - Consolidate markdownlint configuration
status: Done
assignee:
  - '@codex'
created_date: '2026-03-12 09:07'
updated_date: '2026-03-12 09:08'
labels: []
dependencies: []
references:
  - .markdownlint.jsonc
  - .markdownlint-cli2.jsonc
  - .markdownlintignore
  - .lintstagedrc
  - package.json
parent_task_id: TASK-33
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Consolidate duplicated markdownlint rules and ignore behavior so markdownlint-cli2 uses one authoritative configuration path.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 One markdownlint rule source is authoritative and duplicate rule blocks are removed.
- [x] #2 Ignore behavior is defined once and pre-commit plus CLI usage still work.
- [x] #3 pnpm lint:md passes after the cleanup.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Review markdownlint-cli2 config loading in this repo, remove duplicated rule declarations, keep one authoritative ignore path, update any references if needed, and run targeted markdown lint verification.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Consolidated markdown lint config to `.markdownlint-cli2.jsonc` as the single source of truth.
- Removed duplicated `.markdownlint.jsonc` and `.markdownlintignore` files.
- Updated `package.json` and `.lintstagedrc` to reference the canonical config explicitly.
- Verified ignored-file behavior for `.claude/ROADMAP.md` and `docs/review/META_ANALYSIS.md`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the markdownlint cleanup by removing duplicated config files and preserving ignore behavior in `.markdownlint-cli2.jsonc`. Verification: `pnpm lint:md`, `pnpm exec markdownlint-cli2 .claude/ROADMAP.md --config .markdownlint-cli2.jsonc`, `pnpm exec markdownlint-cli2 docs/review/META_ANALYSIS.md --config .markdownlint-cli2.jsonc`.
<!-- SECTION:FINAL_SUMMARY:END -->
