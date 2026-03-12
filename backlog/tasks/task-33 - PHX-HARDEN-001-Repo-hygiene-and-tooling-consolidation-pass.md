---
id: TASK-33
title: PHX-HARDEN-001 - Repo hygiene and tooling consolidation pass
status: In Progress
assignee:
  - '@codex'
created_date: '2026-03-12 09:07'
updated_date: '2026-03-12 09:08'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Consolidate duplicated repo tooling config, retire stale roadmap/status files, remove tracked generated artifacts that should be ephemeral, and simplify overlapping maintenance and QA helper scripts as part of the hardening effort.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Markdown lint configuration is consolidated to one authoritative rule source.
- [ ] #2 Legacy roadmap/status files are either removed or reduced to minimal compatibility stubs with canonical Backlog references.
- [ ] #3 Tracked generated artifacts are limited to files that are intentionally committed and CI-verified.
- [ ] #4 Versioning and QA bootstrap scripts have no redundant overlapping paths.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Create one child task per cleanup area so each change can land in a scoped PR. Execute markdownlint consolidation first, then script/artifact cleanup, then legacy document cleanup once backlinks are understood.
<!-- SECTION:PLAN:END -->
