---
id: TASK-110
title: Replace Encoded Card IDs with Opaque Identifiers
status: To Do
assignee: []
created_date: '2026-03-23 04:18'
updated_date: '2026-03-23 04:19'
labels: []
milestone: v0.5.0 - Stability & Playability
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Card IDs currently encode the card's suit and face (e.g., `...::HK::...` for Hearts King). If face-down states are used, this allows players to identify cards without revealing them by inspecting the ID in the client state or network messages.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Refactor `drawCards` in `engine/src/state.ts` to generate opaque IDs (e.g., UUID or salted hash).
- [ ] #2 Ensure opaque IDs are deterministic based on the provided timestamp and existing match state to maintain replay integrity.
- [ ] #3 Update all engine and server tests that rely on parsing card IDs to use alternative identification methods.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Behavior changes traced to rule IDs or schemas or architectural constraints
- [ ] #2 Verification matches risk (pnpm verify:all for cross-package or CI-impacting changes)
- [ ] #3 Verification evidence recorded in task or PR with actual commands and results
- [ ] #4 No hidden information leaks across player or spectator or admin boundaries
- [ ] #5 AI-assisted changes move to Human Review status before Done
<!-- DOD:END -->
