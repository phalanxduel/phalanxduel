---
id: TASK-253
title: 'Achievement System Infrastructure: Schema & Persistence'
status: Done
assignee: []
created_date: '2026-04-30 22:32'
updated_date: '2026-05-01 13:07'
labels:
  - infra
  - server
  - database
milestone: 'Wave 4: Player Engagement & Achievements'
dependencies: []
priority: high
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Set up the persistence and data structures for the achievements system. This includes the database migration and the shared type definitions that both the engine (for detection) and client (for rendering) will use.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 Add `achievements` table to the database (user_id, type, awarded_at, match_id, metadata).
- [x] #2 #2 Define the shared `AchievementType` enum and metadata structures in `shared/src/schema.ts`.
- [x] #3 #3 Create a server-side API endpoint `/api/users/:userId/achievements` to retrieve the badge gallery.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
SQL migration 0007 creates achievements table with cascade delete and unique-per-type index. Drizzle schema added. AchievementTypeSchema/AchievementSchema/AchievementListSchema added to shared/src/schema.ts (duplicate inferred types removed from schema, kept in types.ts). GET /api/users/:userId/achievements endpoint added to profiles routes. OpenAPI snapshot updated. All 317 server tests passing.
<!-- SECTION:FINAL_SUMMARY:END -->
