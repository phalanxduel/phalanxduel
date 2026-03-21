---
id: TASK-96
title: PHX-LEDGER-002 - Implement ILedgerStore and Postgres Provider
status: Planned
assignee: []
created_date: '2026-03-21 17:56'
labels: []
milestone: v0.4.0 - Distributed Scaling
dependencies:
  - TASK-95
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Define the ILedgerStore interface and implement it for both Postgres and InMemory providers. This layer (Data Link) must be strictly decoupled from Sockets and MatchInstances.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ILedgerStore interface defines getMatchConfig, appendAction, and getActions.
- [ ] #2 PostgresLedgerStore implements the interface using match_actions table.
- [ ] #3 InMemoryLedgerStore implements the interface for local development parity.
<!-- AC:END -->
