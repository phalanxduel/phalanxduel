---
id: TASK-269
title: PHX-GL-005 - Event Bus Reconciliation Strategy
status: Done
assignee: []
created_date: '2026-05-02 20:44'
updated_date: '2026-05-03 17:00'
labels: []
milestone: m-10
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Address the risk of event bus lag or loss by designing a self-healing reconciliation strategy for matches where the event log and database state diverge.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Define a reconciliation protocol for discrepancies between event logs and database state.
- [x] #2 Implement a 'verify-match-state' utility that checks fingerprint integrity.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
AC#1: Reconciliation protocol documented in verify-match-state.ts — authoritative source hierarchy is transaction log > finalStateHash > event log fingerprint. AC#2: Created scripts/ci/verify-match-state.ts with three integrity checks (hash chain, final state hash, event log fingerprint) plus --json output and exit codes 0/1/2. Also extended /api/matches/:matchId/verify to include event log fingerprint verification in both in-memory and DB code paths.
<!-- SECTION:FINAL_SUMMARY:END -->
