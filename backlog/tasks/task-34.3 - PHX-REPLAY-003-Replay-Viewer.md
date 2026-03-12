---
id: TASK-34.3
title: PHX-REPLAY-003 - Replay Viewer
status: To Do
assignee: []
created_date: '2026-03-12 13:34'
updated_date: '2026-03-12 13:37'
labels: []
dependencies:
  - TASK-24
references:
  - >-
    backlog/tasks/task-24 - PHX-INFRA-001 - Implement persistent transaction
    logging (from Gordon Report).md
  - server/src/db/schema.ts
parent_task_id: TASK-34
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a client-facing theater/replay mode that can render persisted match history from the canonical transaction log. This replaces the roadmap's overloaded PHX-REPLAY-001 label, which is already used by hash-chain work in Backlog.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A replay/theater experience can render a persisted transaction log for a completed match.
- [ ] #2 The replay viewer uses the canonical persisted match and transaction-log format.
- [ ] #3 The ranked roadmap has a canonical Backlog successor for the replay-viewer item.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Implement after persistent transaction logging is stable. Reuse the persisted match record format from the database layer and expose a focused client replay surface instead of a second ad hoc log format.
<!-- SECTION:PLAN:END -->
