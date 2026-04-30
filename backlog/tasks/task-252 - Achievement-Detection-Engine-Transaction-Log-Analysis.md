---
id: TASK-252
title: 'Achievement Detection Engine: Transaction Log Analysis'
status: Backlog
assignee: []
created_date: '2026-04-30 22:32'
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
- [ ] #1 #1 Implement a `processMatchAchievements` helper that runs after match completion.
- [ ] #2 #2 Create a plugin-style 'Detector' architecture where new patterns can be added as pure functions.
- [ ] #3 #3 Ensure detectors can scan the full `transactionLog` to identify sequential actions (like 'Triple Threat').
<!-- AC:END -->
