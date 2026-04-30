---
id: TASK-251
title: 'Achievement Patterns: Poker-themed Tactical Detectors'
status: Backlog
assignee: []
created_date: '2026-04-30 22:32'
labels:
  - engine
  - rules
  - gameplay
milestone: 'Wave 4: Player Engagement & Achievements'
dependencies: []
priority: medium
ordinal: 4020
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the specific tactical patterns for the first set of achievements. These use the transaction log and board state to verify accomplishments like poker hands or specific tactical shutdowns.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 Implement 'Full House' detector (3 of one rank, 2 of another on board).
- [ ] #2 #2 Implement 'Deuce Coup' detector (Destroying two 2s in one column).
- [ ] #3 #3 Implement 'Triple Threat' detector (Deploying three of the same rank sequentially across turns).
- [ ] #4 #4 Implement 'Dead Man's Hand' detector (Aces & Eights in the back rank).
<!-- AC:END -->
