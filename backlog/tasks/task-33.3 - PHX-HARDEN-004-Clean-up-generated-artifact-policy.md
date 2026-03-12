---
id: TASK-33.3
title: PHX-HARDEN-004 - Clean up generated artifact policy
status: In Progress
assignee:
  - '@codex'
created_date: '2026-03-12 09:07'
updated_date: '2026-03-12 13:17'
labels: []
dependencies: []
references:
  - dashing.json
  - .gitignore
  - scripts/build/generate-docset.sh
  - scripts/ci/verify-doc-artifacts.sh
  - dependency-graph.svg
  - docs/system/KNIP_REPORT.md
parent_task_id: TASK-33
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove tracked generated files that should be ephemeral, document which generated artifacts are intentionally committed, and keep CI verification aligned with that policy.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tracked generated files that are also ignored are removed from version control.
- [ ] #2 Intentionally committed generated artifacts remain documented and verified by CI.
- [ ] #3 docs:build and docs:check behavior remain coherent after the cleanup.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Start with dashing.json and related docset generation flow, keep dependency-graph.svg and KNIP_REPORT.md because CI verifies them, and defer review archive cleanup until active backlog references are migrated.
<!-- SECTION:PLAN:END -->
