---
id: TASK-273
title: >-
  PHX-UI-001 - Client UI Polish: Fallback labels, input validation, empty/error
  states
status: Done
assignee: []
created_date: '2026-05-03 17:11'
updated_date: '2026-05-03 17:14'
labels:
  - client
  - polish
  - ui
milestone: m-10
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix a cluster of UI rough edges identified by codebase survey. All are cosmetic/UX fixes with no gameplay logic changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Replace hardcoded all-caps fallbacks (UNKNOWN, UNK, PENDING, WAITING) with human-readable strings
- [x] #2 Join/Watch fields validate non-empty matchId before submitting — empty input shows inline error instead of silent failure
- [x] #3 MatchHistory distinguishes loading / empty / error states with distinct messages
- [x] #4 Public match card rating range shows 'Any' instead of literal MIN/MAX when unconstrained
- [x] #5 Action timeout error uses plain English instead of COMMAND_TIMEOUT: ENGINE_RESP_OVER_30S technical code
- [x] #6 Opponent name falls back to 'Waiting for opponent' instead of OPPONENT_PENDING when both bot and name are null
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced all hardcoded all-caps fallbacks (UNKNOWN, UNK, OPPONENT_PENDING, WAITING, NO_RECORD, NO_RATING_RANGE, ESTABLISHED_ONLY, UNKNOWN_PHASE, MIN/MAX) with human-readable strings across lobby.tsx. Added disabled guard and .trim() validation to JOIN/WATCH buttons so empty input cannot be submitted. Fixed action timeout error in state.ts to plain English. Rating range displays 'Any rating' or 'Rating N–M' instead of MIN/MAX literals. MIN_GAMES renders as 'Min N games'.
<!-- SECTION:FINAL_SUMMARY:END -->
