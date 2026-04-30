---
id: TASK-253
title: 'Achievement System Infrastructure: Schema & Persistence'
status: Backlog
assignee: []
created_date: '2026-04-30 22:32'
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
- [ ] #1 #1 Add `achievements` table to the database (user_id, type, awarded_at, match_id, metadata).
- [ ] #2 #2 Define the shared `AchievementType` enum and metadata structures in `shared/src/schema.ts`.
- [ ] #3 #3 Create a server-side API endpoint `/api/users/:userId/achievements` to retrieve the badge gallery.
<!-- AC:END -->
