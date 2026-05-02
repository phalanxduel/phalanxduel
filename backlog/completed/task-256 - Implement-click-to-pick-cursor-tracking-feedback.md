---
id: TASK-256
title: Implement click-to-pick cursor tracking feedback
status: Done
assignee: []
created_date: '2026-05-02 04:15'
labels:
  - ui
  - ux
  - client
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement a visual "ghost card" overlay that follows the cursor when a card is selected for an action (deploy or attack). This provides immediate visual feedback for the click-to-pick, click-to-place interaction model.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Ghost card overlay tracks cursor position during selection.
- [ ] #2 Ghost card appears for both hand deployment and battlefield attacks.
- [ ] #3 Ghost card does not block underlying click events (pointer-events: none).
- [ ] #4 Automation scripts (simulate-ui.ts) continue to pass without modification.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the `GhostCardOverlay` component in `client/src/game.tsx` and added supporting CSS styles. Verified that the overlay tracks the cursor/touch position correctly and does not interfere with automated UI tests. The change is strictly visual and maintains full compatibility with existing interaction logic.
<!-- SECTION:FINAL_SUMMARY:END -->
