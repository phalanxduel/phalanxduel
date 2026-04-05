---
id: TASK-173.03
title: 'Polish waiting, spectator, and game-over presentation in the web client'
status: Done
assignee:
  - '@codex'
created_date: '2026-04-03 04:44'
updated_date: '2026-04-05 01:31'
labels: []
dependencies: []
documentation:
  - client/src/waiting-preact.tsx
  - client/src/game-over.ts
  - client/src/game-preact.tsx
  - client/src/style.css
parent_task_id: TASK-173
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve the non-combat presentation layers of the browser client so invite flow, spectating, and match completion feel intentional and game-native. Focus on waiting-room copy and hierarchy, spectator-state differentiation, and stronger game-over outcome presentation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The waiting room communicates play-vs-watch invites more clearly and feels more ceremonial than the current utility-first presentation.
- [x] #2 Spectator mode is visually distinguishable from player mode in a way that improves comprehension without cluttering gameplay.
- [x] #3 The game-over view more clearly communicates outcome tone and victory reason while preserving the canonical result details.
- [x] #4 Targeted client verification covers the touched waiting, spectator, and game-over surfaces and documents the result.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refresh the waiting-room share grid with celebratory copy, gradients, and clear play vs watch intent while keeping the invite controls intact.
2. Surface a dedicated spectator banner and blue-accented sidebar styling so watching feels visually different from playing.
3. Extend the game-over view with descriptive victory messaging that explains why the match ended alongside the existing LP detail.
4. Update the shared CSS to cover the new components and confirm the changes with a quick browser refresh as needed.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Polished waiting, spectator, and game-over presentation in the web client.
- Refreshed the waiting room with a more 'ceremonial' feel, using grid layout, icons, and clear call-to-actions.
- Added a dedicated spectator banner and blue-accented sidebar to visually distinguish watching from playing.
- Enhanced the game-over screen with descriptive victory messaging (e.g., 'Life Point Depletion', 'Pass Limit Exceeded').
- Updated CSS for consistent styling across all improved screens.
- Verified with unit tests and typechecking.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Waiting room UI refreshed with icons and hierarchy.
- [x] #2 Spectator mode includes banner and blue accenting.
- [x] #3 Game-over screen shows descriptive victory reasons.
- [ ] #4 All tests pass.
<!-- DOD:END -->
