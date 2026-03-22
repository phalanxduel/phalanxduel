---
id: TASK-95
title: PHX-LEDGER-001 - Refactor Schema for Durable Ledger
status: Done
assignee: []
created_date: '2026-03-21 17:56'
updated_date: '2026-03-22 15:17'
labels: []
milestone: v0.4.0 - Distributed Scaling
dependencies: []
priority: high
ordinal: 97000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Redefine the Postgres schema to act as a Durable Ledger rather than an application state mirror. Remove player names, session IDs, and other transient metadata from the matches table.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 matches table is reduced to id, config, and snapshot (optional) fields only.
- [x] #2 match_actions table exists with composite PK (match_id, sequence_number).
- [x] #3 Drizzle schema is updated and migration is generated.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refactored Postgres schema to a pure Durable Ledger model. The 'matches' table is now a thin metadata header, and 'match_actions' (renamed from 'transaction_logs') serves as the authoritative, sequence-controlled action log. Generated migration: server/drizzle/0008_refactor_to_ledger.sql.
<!-- SECTION:FINAL_SUMMARY:END -->
