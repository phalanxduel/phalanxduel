---
id: TASK-138
title: Duplicate Documentation Consolidation
status: To Do
assignee: []
created_date: '2026-03-31 17:37'
labels: []
dependencies:
  - TASK-137
references:
  - backlog/docs/doc-2 - Documentation Consolidation Audit.md
priority: high
---

## Description

Consolidate duplicate or overlapping documentation clusters into one canonical
surface per topic.

## Rationale

Duplicate docs are the primary source of AI confusion, stale guidance, and
pre-release ambiguity.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Duplicate operational, deployment, glossary, and process-doc clusters are reduced to one canonical source per topic.
- [ ] #2 Any retained mirrors are explicitly marked as generated or secondary.
- [ ] #3 Backlinks and indexes are updated so humans and agents land on the canonical doc first.
<!-- AC:END -->

## Expected Outputs

- Consolidated docs
- Retired duplicate surfaces
- Updated links and indexes

## Do Not Break

- Do not remove unique operational detail without merging it first.
- Do not break generated doc publishing surfaces accidentally.
