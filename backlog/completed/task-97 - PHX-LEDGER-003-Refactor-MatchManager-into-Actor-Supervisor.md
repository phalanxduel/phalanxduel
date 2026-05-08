---
id: TASK-97
title: PHX-LEDGER-003 - Refactor MatchManager into Actor Supervisor
status: Done
assignee: []
created_date: '2026-03-21 17:56'
updated_date: '2026-04-14 14:30'
labels: []
milestone: v0.4.0 - Distributed Scaling
dependencies:
  - TASK-96
priority: high
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor MatchManager into an Actor Supervisor. Sockets are transient pointers; the Actor owns the local rehydration of state from the Ledger.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 MatchManager is a pure router mapping WebSockets to Actor IDs.
- [x] #2 Each Match Actor maintains a local Engine state and current sequence number.
- [x] #3 Match Actor handles join and action requests by appending to the Ledger.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented MatchActor and LocalMatchManager refactor with serialized mailbox. Verified via full verification suite and REST playthrough in container.
<!-- SECTION:NOTES:END -->
