---
id: TASK-133
title: Normalize Backlog Decision Record Structure
status: In Progress
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

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Decision records under backlog/decisions use one consistent Backlog decision shape with the metadata fields this repo expects and no DEC-2E records render as ad hoc documents.
- [ ] #2 The local decision format is aligned with the repo-native pattern and cross-checked against the lawnstarter-engineer-assessment reference structure where relevant.
- [ ] #3 Decision index/readme documentation matches the actual required decision fields and structure used in this repo.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect local decision records and the reference repo decision structure.\n2. Normalize the inconsistent local decision records, starting with the DEC-2E set and any README guidance that contradicts the actual file format.\n3. Verify markdown rendering and repo consistency, then move the task to Human Review.
<!-- SECTION:PLAN:END -->
