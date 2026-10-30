---
id: TASK-112
title: Fix Production Migration Discrepancy (final_state_hash)
status: Done
assignee: []
created_date: '2026-03-23 15:06'
updated_date: '2026-03-23 15:12'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Migration 0006 was added to the repository but not recorded in the Drizzle journal. This caused the migration to be skipped during deployment, leading to production errors when the server tried to save matches with the missing `final_state_hash` column. This task will restore the journal entry to trigger the migration application.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 _journal.json contains entry for 0006_add_final_state_hash migration
- [x] #2 checkPendingMigrations no longer fails (server starts) or fails as expected if migration not applied in DB yet
- [x] #3 Matches can be saved to the database without column "final_state_hash" does not exist error
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed a production issue where the `final_state_hash` column was missing from the `matches` table.

Root Cause:
Migration 0006 (`0006_add_final_state_hash.sql`) was present in the codebase but missing from the Drizzle migration journal (`server/drizzle/meta/_journal.json`). As a result, the migration was ignored during deployment, and the startup check (`checkPendingMigrations`) failed to detect the discrepancy because it relies on the journal to determine the expected number of migrations.

Resolution:
1. Updated `server/drizzle/meta/_journal.json` to include the entry for migration 0006.
2. Created the missing `server/drizzle/meta/0006_snapshot.json` by branching from the previous snapshot and adding the `final_state_hash` column definition to the `matches` table.

These changes ensure that the next server startup will correctly identify and apply the pending migration, resolving the database error.
<!-- SECTION:FINAL_SUMMARY:END -->
