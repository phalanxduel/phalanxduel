---
id: TASK-246
title: Standardize Identity Terminology (Operative ID vs Gamertag vs PlayerName)
status: Done
assignee: []
created_date: '2026-04-28 15:33'
updated_date: '2026-05-01 16:38'
labels: []
milestone: Post-Promotion Hardening
dependencies: []
priority: medium
ordinal: 8100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor and consolidate sprawling terminology: OPERATIVE_ID, gamertag, player_name, and the #suffix. Standardize on "Operative ID" for the user-facing identity string.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Public UI consistently uses "OPERATIVE_ID" for the formatted gamertag#suffix string.
- [x] #2 Internal state clearly distinguishes between `gamertag` (raw), `suffix` (number), and `playerName` (transient/display).
- [x] #3 Guest identification is explicitly labeled as "GUEST_OPERATIVE" or similar to avoid confusion with registered accounts.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
AC-1: OPERATIVE_ID is consistently used for the formatted identity string in validation messages, the GUEST_OPERATIVE_ID input label, and profile headers. AC-2: state.ts AppState now has JSDoc on gamertag (raw base handle), suffix (numeric discriminator), operativeId (persisted callsign), and playerName (transient session name kept in sync) — clearly distinguishing their roles. AC-3: GUEST_MODE button and alert message renamed to GUEST_OPERATIVE, explicitly labeling unregistered sessions as distinct from registered accounts.
<!-- SECTION:FINAL_SUMMARY:END -->
