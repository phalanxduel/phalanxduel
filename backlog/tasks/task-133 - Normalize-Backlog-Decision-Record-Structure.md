---
id: TASK-133
title: Normalize Backlog Decision Record Structure
status: Human Review
assignee:
  - '@codex'
created_date: '2026-03-31 13:59'
labels: []
dependencies: []
references:
  - backlog/decisions/README.md
  - backlog/docs/doc-002 - DEC-2E-API-and-Decoupling-Decisions.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Normalize the backlog decision records so they use one consistent decision-file
shape in `backlog/decisions/`, with the metadata fields this repo expects and
without relying on summary docs as substitutes for actual Backlog decisions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Decision records under backlog/decisions use one consistent Backlog decision shape with the metadata fields this repo expects and no DEC-2E records render as ad hoc documents.
- [x] #2 The local decision format is aligned with the repo-native pattern and cross-checked against the lawnstarter-engineer-assessment reference structure where relevant.
- [x] #3 Decision index/readme documentation matches the actual required decision fields and structure used in this repo.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect local decision records and the reference repo decision structure.
2. Normalize the inconsistent local decision records, starting with the DEC-2E set and any README guidance that contradicts the actual file format.
3. Verify markdown rendering and repo consistency, then move the task to Human Review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Cross-checked the local decision folder against the
  `lawnstarter-engineer-assessment` reference repo and used the repo-native
  local pattern as the tiebreaker: decision records belong under
  `backlog/decisions/`, not in docs, and this repo expects frontmatter with
  `id`, `title`, `status`, `owner`, and `date`.
- Normalized the accepted `DEC-2E` decisions by adding the missing `owner`
  field and a consistent top-level `# DEC-...` heading so they render like the
  rest of this repo's decision records instead of looking like generic docs.
- Normalized the open decisions by adding the missing `title` frontmatter so
  they carry the same decision metadata shape as the accepted records.
- Updated `backlog/decisions/README.md` so it documents the actual required
  decision fields and explicitly says that summary docs may link to decisions
  but are not substitutes for the canonical decision artifacts.
<!-- SECTION:NOTES:END -->

## Verification

- `pnpm exec markdownlint-cli2 backlog/decisions/README.md backlog/decisions/*.md "backlog/tasks/task-133 - Normalize-Backlog-Decision-Record-Structure.md" --config .markdownlint-cli2.jsonc`
- `rg -L "^title:" backlog/decisions/*.md`
- `rg -L "^owner:" backlog/decisions/*.md`
