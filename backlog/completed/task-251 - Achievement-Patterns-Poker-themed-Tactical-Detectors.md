---
id: TASK-251
title: 'Achievement Patterns: Poker-themed Tactical Detectors'
status: Done
assignee: []
created_date: '2026-04-30 22:32'
updated_date: '2026-05-01 16:33'
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
- [x] #1 #1 Implement 'Full House' detector (3 of one rank, 2 of another on board).
- [x] #2 #2 Implement 'Deuce Coup' detector (Destroying two 2s in one column).
- [x] #3 #3 Implement 'Triple Threat' detector (Deploying three of the same rank sequentially across turns).
- [x] #4 #4 Implement 'Dead Man's Hand' detector (Aces & Eights in the back rank).
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
fullHouseDetector: 3 of one face + 2 of another on battlefield at game end. deuceCoupDetector: two rank-2 (face='2') cards destroyed in a single attack's combat steps. tripleThreatDetector: three consecutive deploys of same face by one player (resolves card face from finalState card pool since txlog only stores cardId). deadMansHandDetector: Ace (face='A') and Eight (face='8') both present in back rank at game end. DEUCE_COUP, TRIPLE_THREAT, DEAD_MANS_HAND added to AchievementTypeSchema. 9 unit tests in server/tests/achievements.test.ts.
<!-- SECTION:FINAL_SUMMARY:END -->
