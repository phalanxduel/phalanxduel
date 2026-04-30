---
id: TASK-217
title: Verify and sync site deployment to live
status: Done
assignee: []
created_date: '2026-04-07 02:38'
updated_date: '2026-04-30 22:08'
labels:
  - site
  - infra
  - p0
  - promotion-readiness
dependencies:
  - TASK-213
  - TASK-214
  - TASK-215
priority: high
ordinal: 1300
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The live site at phalanxduel.com is out of sync with the repo. The deployed homepage shows different hero text than the repo contains. All P0 site fixes (doc link corrections, OG image, mobile nav) must be deployed to take effect. Verify GitHub Pages deploy pipeline, ensure gh-pages branch reflects latest main, and confirm live site matches repo content.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Live site phalanxduel.com content matches latest repo commit
- [ ] #2 All P0 site fixes (TASK-213, TASK-214, TASK-215) are visible on live site
- [ ] #3 Hero text, navigation, and footer links match repo source
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Completed as part of v1.1.0 release. Visual identity and deployment state confirmed across site and game client.
<!-- SECTION:NOTES:END -->
