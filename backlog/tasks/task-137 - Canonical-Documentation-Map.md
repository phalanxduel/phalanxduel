---
id: TASK-137
title: Canonical Documentation Map
status: To Do
assignee: []
created_date: '2026-03-31 17:36'
labels: []
dependencies:
  - TASK-136
references:
  - backlog/docs/doc-2 - Documentation Consolidation Audit.md
priority: high
---

## Description

Turn the audit findings into an explicit canonical documentation map covering
root artifacts, Backlog-managed docs, active reference docs, generated docs,
and archival surfaces.

## Rationale

Cleanup requires a target structure. Without an agreed canonical map, document
moves and merges will recreate ambiguity.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every important documentation topic has one named canonical home.
- [ ] #2 The map distinguishes Backlog-managed process/governance docs from release-facing/reference docs.
- [ ] #3 The map is specific enough to drive file moves and merge decisions in later tasks.
<!-- AC:END -->

## Expected Outputs

- Canonical topic-to-path map
- Surface ownership rules
- Exceptions for root-facing repo artifacts

## Do Not Break

- Do not force standard repo artifacts into Backlog when user or contributor expectations require them to stay at root or under `docs/`.
