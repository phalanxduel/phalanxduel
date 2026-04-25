---
id: TASK-243
title: Add public open matches and internal Glicko matchmaking
status: In Progress
assignee: ['@claude']
created_date: '2026-04-24 21:12'
labels:
  - matchmaking
  - ratings
  - profile
  - ui
dependencies: []
references:
  - server/src/match.ts
  - server/src/db/schema.ts
  - server/src/db/match-repo.ts
  - server/src/ladder.ts
  - client/src/lobby.tsx
documentation:
  - AGENTS.md
  - docs/tutorials/ai-agent-workflow.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the existing match system with a public-open match visibility mode, internal Glicko-based matchmaking confidence fields, and a public profile read model while preserving the current private/share-link flow and ELO display behavior. Keep the scope incremental: no lobby rewrite, no real-time matchmaking requirement, no engine rewrite, and no backend identity overhaul.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Existing private/share-link match creation and join flow still works unchanged.
- [ ] #2 A player can create a public-open match that appears in an open matches list.
- [ ] #3 Eligible players can join an open match and claimed matches cannot be joined twice.
- [ ] #4 ELO remains the public-facing ranking value and existing leaderboard behavior is preserved.
- [ ] #5 Glicko fields are stored and updated as internal matchmaking confidence metadata.
- [ ] #6 Public profile read model shows record, recent matches, and confidence label without exposing raw Glicko internals.
- [ ] #7 Joining open matches is transactional and rating/result updates are idempotent.
- [ ] #8 Minimal abuse controls exist for creator self-join, stale expiration, and repeated cancellations.
<!-- AC:END -->
