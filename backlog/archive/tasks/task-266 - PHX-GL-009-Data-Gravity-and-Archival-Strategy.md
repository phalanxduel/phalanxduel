---
id: TASK-266
title: PHX-GL-009 - Data Gravity and Archival Strategy
status: Done
assignee: []
created_date: '2026-05-02 20:44'
updated_date: '2026-05-03 17:06'
labels: []
milestone: m-10
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ensure the database schema for match logs is archival-ready and decoupled from the active production schema, preventing long-term migration bottlenecks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Design archival strategy for match logs.
- [ ] #2 Decouple match logs from the current production schema to support future migrations.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added `matchPayloads` table to schema (server/src/db/schema.ts) as a decoupled archive for completed match JSONB payloads (state, actionHistory, transactionLog, eventLog). Created migration 0011_match_payloads.sql. Added `archiveMatchPayload(matchId)` to MatchRepository: copies heavy columns from matches to matchPayloads, then nulls them out in the matches table, using onConflictDoNothing for idempotency.
<!-- SECTION:FINAL_SUMMARY:END -->
