---
id: TASK-118
title: Implement Card Manifest and Rule Discovery Endpoints
status: Planned
assignee:
  - '@generalist'
created_date: '2026-03-29 22:14'
updated_date: '2026-03-29 22:31'
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
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
To allow completely decoupled UI implementation, clients need a way to discover game entities and rules without hardcoding them. This task creates endpoints that return the 'Card Manifest' (all possible cards and stats) and the 'Rule Discovery' logic (the phase transition table), ensuring the server remains the single source of truth for game mechanics.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Implement GET /api/cards/manifest returning all possible cards and their deterministic stats.
- [ ] #2 Implement GET /api/rules/phases returning the STATE_MACHINE transition table.
- [ ] #3 Document these new endpoints in the OpenAPI specification.
<!-- AC:END -->
