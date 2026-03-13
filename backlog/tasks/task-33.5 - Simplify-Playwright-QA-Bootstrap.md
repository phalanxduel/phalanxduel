---
id: TASK-33.5
title: Simplify Playwright QA Bootstrap
status: Done
assignee:
  - '@codex'
created_date: '2026-03-12 09:07'
updated_date: '2026-03-13 14:50'
labels: []
dependencies: []
references:
  - bin/qa/bootstrap.zsh
  - package.json
  - docs/system/PNPM_SCRIPTS.md
parent_task_id: TASK-33
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove redundant Playwright dependency installation logic from the QA bootstrap flow while preserving the clean-checkout browser setup path.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 QA bootstrap no longer mutates package.json or the lockfile by conditionally adding Playwright.
- [x] #2 The script still installs required browser binaries for a clean checkout.
- [x] #3 pnpm setup:qa remains a valid documented entry point if it is kept.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Keep pnpm install and playwright browser installation, remove the branch that adds Playwright as a devDependency because it is already declared in package.json, and update any related docs if behavior changes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Removed the conditional `pnpm add -D playwright` branch from `bin/qa/bootstrap.zsh`.
- Kept `pnpm install` followed by `pnpm exec playwright install` as the clean-checkout setup path.
- Left `pnpm setup:qa` and its documentation entry intact because the public workflow did not change.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the QA bootstrap cleanup by removing package-mutation behavior while preserving browser setup. Verification: `zsh -n bin/qa/bootstrap.zsh`, `pnpm exec playwright --version`, `rg "pnpm add -D playwright" bin/qa/bootstrap.zsh package.json docs/system/PNPM_SCRIPTS.md`.
<!-- SECTION:FINAL_SUMMARY:END -->
