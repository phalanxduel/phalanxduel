---
id: TASK-133
title: Normalize Backlog Decision Record Structure
status: Human Review
assignee:
  - '@codex'
created_date: '2026-03-31 13:59'
updated_date: '2026-03-31 16:48'
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
  local pattern as the tiebreaker: Backlog discovers decisions from files named
  `decision-*.md`, not arbitrary `DEC-*.md` documents, so the prior filenames
  were structurally invisible to the decision surface.
- Renamed every decision record in `backlog/decisions/` to the canonical
  `decision-### - ...` filename format and normalized each file's frontmatter
  `id` to match the filename so Backlog can index them as decisions rather than
  leaving them as plain markdown documents.
- Preserved the DEC labels in the human-facing titles and headings
  (`DEC-2A-*`, `DEC-2E-*`, `DEC-OPEN-*`) so the audit trail and design-history
  references remain intact while conforming to Backlog's structural
  requirements.
- Updated `backlog/decisions/README.md`, the DEC-2E summary doc, and task/doc
  cross-references so they point at the new canonical decision filenames.
<!-- SECTION:NOTES:END -->

## Verification

- `pnpm exec markdownlint-cli2 backlog/decisions/README.md backlog/decisions/*.md "backlog/tasks/task-133 - Normalize-Backlog-Decision-Record-Structure.md" "backlog/docs/doc-002 - DEC-2E-API-and-Decoupling-Decisions.md" "backlog/completed/task-10 - State-Machine-Fidelity-Hardening.md" --config .markdownlint-cli2.jsonc`
- `find backlog/decisions -maxdepth 1 -type f -name 'DEC-*.md' | sort`
- `find backlog/decisions -maxdepth 1 -type f | sort`
