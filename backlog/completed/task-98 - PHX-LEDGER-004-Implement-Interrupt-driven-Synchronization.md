---
id: TASK-98
title: PHX-LEDGER-004 - Implement Interrupt-driven Synchronization
status: Done
assignee: []
created_date: '2026-03-21 17:56'
updated_date: '2026-04-01 20:23'
labels: []
milestone: v0.4.0 - Distributed Scaling
dependencies:
  - TASK-97
priority: high
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the "Invalidate and Re-read" synchronization logic within the Match Actor. Ensure cross-node propagation triggers local state re-evaluation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Match Actor subscribes to EventBus notifications.
- [x] #2 Upon notification, Actor fetches new segments from ILedgerStore and applies them via Engine.
- [x] #3 All connected sockets receive the updated state broadcast.
<!-- AC:END -->
