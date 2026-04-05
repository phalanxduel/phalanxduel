---
id: TASK-137
title: Canonical Documentation Map
status: Done
assignee:
  - '@codex'
created_date: '2026-03-31 17:36'
updated_date: '2026-03-31 15:02'
labels: []
dependencies:
  - TASK-136
references:
  - backlog/docs/doc-2 - Documentation Consolidation Audit.md
  - backlog/docs/doc-3 - Canonical Documentation Map.md
priority: high
ordinal: 51000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Turn the audit findings into an explicit canonical documentation map covering
root artifacts, Backlog-managed docs, active reference docs, generated docs,
and archival surfaces.

## Rationale

Cleanup requires a target structure. Without an agreed canonical map, document
moves and merges will recreate ambiguity.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every important documentation topic has one named canonical home.
- [x] #2 The map distinguishes Backlog-managed process/governance docs from release-facing/reference docs.
- [x] #3 The map is specific enough to drive file moves and merge decisions in later tasks.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extract the canonical map from the audit into a dedicated Backlog-managed
   document that later cleanup tasks can use as their target state.
2. Explicitly separate root artifacts, Backlog-managed process surfaces,
   canonical reference docs, generated docs, and historical/archive surfaces.
3. Identify the known secondary/non-canonical surfaces that later tasks must
   consolidate or retire.
4. Verify markdown integrity and return the task for review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- `doc-3` is the dedicated target-state map for later cleanup tasks. The audit
  remains the evidence source; the map is the execution-oriented source.
- The map explicitly separates root artifacts, Backlog-managed governance and
  planning surfaces, canonical active reference docs, generated/public API
  artifacts, and historical/archive surfaces.
- Known secondary surfaces were called out directly so later cleanup tasks can
  work from a finite merge/move/archive list instead of rediscovering the same
  ambiguity.

## Verification

- `pnpm exec markdownlint-cli2 "backlog/docs/doc-2 - Documentation Consolidation Audit.md" "backlog/docs/doc-3 - Canonical Documentation Map.md" "backlog/tasks/task-137 - Canonical-Documentation-Map.md" --config .markdownlint-cli2.jsonc`

## Do Not Break

- Do not force standard repo artifacts into Backlog when user or contributor expectations require them to stay at root or under `docs/`.
<!-- SECTION:NOTES:END -->

## Expected Outputs

- Canonical topic-to-path map
- Surface ownership rules
- Exceptions for root-facing repo artifacts
