---
id: TASK-150
title: Retire Root Archive Directory
status: Human Review
assignee:
  - '@codex'
created_date: '2026-03-31 19:24'
updated_date: '2026-04-01 00:36'
labels: []
dependencies: []
---

## Description

Retire the root `archive/` directory and remove active guidance that still
teaches `archive/` as a supported documentation surface.

## Rationale

The root archive now acts as a context trap. It still shows up in searches and
forces humans and agents to sort through historical artifacts that no longer
justify a first-class repo surface. Git history and backlog/completed history
are sufficient for the remaining value.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The root `archive/` directory is removed from the live repo.
- [x] #2 Active docs and prompts no longer prescribe `archive/` as a canonical or expected storage surface.
- [x] #3 Historical references that remain in backlog records are explained here as intentional execution history, not active guidance.
<!-- AC:END -->

## Implementation Notes

- Historical `archive/` references remain in older backlog task records because
  those files are execution history. They should not be rewritten into a new
  story unless they actively block current work.
- Active surfaces that still teach `archive/` include
  `docs/system/ARCHIVAL_POLICY.md`,
  `backlog/docs/doc-2 - Documentation Consolidation Audit.md`,
  `backlog/docs/doc-3 - Canonical Documentation Map.md`,
  `backlog/docs/doc-4 - Repository Hardening Audit Prompt.md`,
  `backlog/docs/doc-5 - Production Path Review Guideline.md`, and
  `.github/ISSUE_TEMPLATE/technical_hardening.yml`.
- The intended replacement model is:
  canonical active guidance in `docs/` and `backlog/docs/`,
  execution history in `backlog/tasks/` and `backlog/completed/`,
  explicit history in `docs/history/`,
  and git history for deleted transient artifacts.
- Deleted the root `archive/` directory entirely.
- Rewrote active policy and prompt surfaces so they no longer teach `archive/`
  as the destination for generated reports or historical docs.
- Left historical `archive/` references in older backlog task records intact as
  execution history. `backlog/docs/doc-2 - Documentation Consolidation Audit.md`
  now explicitly labels those references as historical snapshot context.

## Verification

- `rg -n "archive/" README.md docs .github AGENTS.md backlog/docs "backlog/tasks/task-150 - Retire-Root-Archive-Directory.md"`
- `rg --files | rg '^archive/'`
- `pnpm exec markdownlint-cli2 docs/system/ARCHIVAL_POLICY.md "backlog/docs/doc-2 - Documentation Consolidation Audit.md" "backlog/docs/doc-3 - Canonical Documentation Map.md" "backlog/docs/doc-4 - Repository Hardening Audit Prompt.md" "backlog/docs/doc-5 - Production Path Review Guideline.md" ".github/ISSUE_TEMPLATE/technical_hardening.yml" "backlog/tasks/task-150 - Retire-Root-Archive-Directory.md" --config .markdownlint-cli2.jsonc`
