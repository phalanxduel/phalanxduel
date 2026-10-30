---
id: TASK-252
title: 'Achievement Detection Engine: Transaction Log Analysis'
status: Done
assignee: []
created_date: '2026-04-30 22:32'
updated_date: '2026-05-01 16:33'
labels:
  - engine
  - server
  - logic
milestone: 'Wave 4: Player Engagement & Achievements'
dependencies: []
priority: medium
ordinal: 4010
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build the logic that analyzes a completed match's transaction log to award achievements. This engine should be decoupled from the core rules but run as a post-match hook on the server to ensure authoritative awarding.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 Implement a `processMatchAchievements` helper that runs after match completion.
- [x] #2 #2 Create a plugin-style 'Detector' architecture where new patterns can be added as pure functions.
- [x] #3 #3 Ensure detectors can scan the full `transactionLog` to identify sequential actions (like 'Triple Threat').
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
server/src/achievements/detector.ts defines DetectorContext, DetectorResult, AchievementDetector types. server/src/achievements/index.ts exports processMatchAchievements() — runs ALL_DETECTORS, persists via INSERT ON CONFLICT DO NOTHING, skips guests/bots. Hooked into match.ts after ladderService.onMatchComplete. Detectors can read full transactionLog for sequential analysis.
<!-- SECTION:FINAL_SUMMARY:END -->
