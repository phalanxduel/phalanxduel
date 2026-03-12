---
id: TASK-33.5
title: PHX-HARDEN-006 - Simplify Playwright QA bootstrap
status: To Do
assignee: []
created_date: '2026-03-12 09:07'
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
- [ ] #1 QA bootstrap no longer mutates package.json or the lockfile by conditionally adding Playwright.
- [ ] #2 The script still installs required browser binaries for a clean checkout.
- [ ] #3 pnpm setup:qa remains a valid documented entry point if it is kept.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Keep pnpm install and playwright browser installation, remove the branch that adds Playwright as a devDependency because it is already declared in package.json, and update any related docs if behavior changes.
<!-- SECTION:PLAN:END -->
