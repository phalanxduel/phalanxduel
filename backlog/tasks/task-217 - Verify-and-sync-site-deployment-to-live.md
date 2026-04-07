---
id: TASK-217
title: Verify and sync site deployment to live
status: To Do
assignee: []
created_date: '2026-04-07 02:38'
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
