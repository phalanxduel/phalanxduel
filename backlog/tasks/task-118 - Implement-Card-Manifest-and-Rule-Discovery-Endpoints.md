---
id: TASK-118
title: Implement Card Manifest and Rule Discovery Endpoints
status: Done
assignee:
  - '@generalist'
created_date: '2026-03-29 22:14'
updated_date: '2026-03-31 13:51'
labels:
  - api
  - discovery
  - rules
milestone: m-1
dependencies:
  - TASK-117
references:
  - /Users/mike/github.com/just3ws/lawnstarter-engineer-assessment
priority: medium
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
To allow completely decoupled UI implementation, clients need a way to discover game entities and rules without hardcoding them. This task creates endpoints that return the 'Card Manifest' (all possible cards and stats) and the 'Rule Discovery' logic (the phase transition table), ensuring the server remains the single source of truth for game mechanics.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Implement GET /api/cards/manifest returning all possible cards and their deterministic stats.
- [x] #2 Implement GET /api/rules/phases returning the STATE_MACHINE transition table.
- [x] #3 Document these new endpoints in the OpenAPI specification.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented Card Manifest and Rule Discovery endpoints.

Key achievements:
1.  **Card Manifest**: Added `GET /api/cards/manifest` returning all 52 deterministic cards.
2.  **Rule Discovery**: Added `GET /api/rules/phases` returning the canonical `STATE_MACHINE` transition table.
3.  **Type Safety**: Moved `StateTransition` and `TransitionTrigger` schemas to `@phalanxduel/shared`, enabling full end-to-end type safety and automated documentation.
4.  **OpenAPI Spec**: Fully documented new endpoints with named schemas in Swagger components; updated automated contract snapshots.
5.  **Robustness**: Added `server/tests/discovery.test.ts` to verify the implementation.

All workspace verification checks passed.
<!-- SECTION:FINAL_SUMMARY:END -->
