---
id: TASK-121
title: Refactor Current UI as API Reference Implementation
status: Planned
assignee: []
created_date: '2026-03-29 22:24'
labels: []
milestone: m-1
dependencies:
  - TASK-120
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
To prove the API is complete and decoupled, we must refactor the existing React/Preact UI to act as a 'Reference Implementation'. It must rely entirely on the ViewModel and Discovery endpoints, with zero hardcoded game logic. This ensures that any change to server-side rules is automatically reflected in the UI without a code change.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Identify logic in the current React/Preact UI that calculates card stats or move legality.
- [ ] #2 Refactor the UI to use the ViewModel's 'validActions' array for interaction gating.
- [ ] #3 Refactor the UI to use /api/cards/manifest for entity metadata.
- [ ] #4 Verify that the UI remains fully playable while having zero 'hardcoded' game engine rules.
<!-- AC:END -->
