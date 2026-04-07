---
id: TASK-211
title: Remove debug Trigger Test Error button from production client
status: Done
assignee: []
created_date: '2026-04-07 02:14'
updated_date: '2026-04-07 10:30'
labels:
  - client
  - p0
  - promotion-readiness
dependencies: []
references:
  - client/src/debug.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The debug.ts module renders a 'Trigger Test Error' button unconditionally in the lobby. This button deliberately throws an Error when clicked. It is visible in production at play.phalanxduel.com and screams 'unfinished dev build' to any user who sees it. Guard renderDebugButton() behind import.meta.env.DEV so it never renders in production builds.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 No 'Trigger Test Error' button visible on play.phalanxduel.com
- [ ] #2 renderDebugButton() returns early when import.meta.env.DEV is false
- [ ] #3 bin/check passes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Guarded renderDebugButton() behind import.meta.env.DEV check. Committed in 81e4eb80.
<!-- SECTION:NOTES:END -->
