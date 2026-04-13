---
id: TASK-230
title: 'Workstream: Targeted Container Lifecycle and Rebuild Optimization'
status: Done
assignee: []
created_date: '2026-04-13 00:03'
updated_date: '2026-04-13 00:08'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Following the enforcement of build identity (TASK-229), formalize the transition to targeted container lifecycle management. The goal is to eliminate full stack rebuilds by providing the developer with clear signals (via dev:dash) on which specific service is stale, and allowing surgical updates to those services without abandoning the container-oriented workflow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 Documentation updated to reflect targeted 'pnpm docker:up <service>' usage.
- [x] #2 #2 Dashboard UI explicitly recommends targeted service restarts on mismatch.
- [x] #3 #3 Audit repeated 'verify:allall' run time and identify remaining rebuild bottlenecks.
- [x] #4 #4 Evaluate 'turborepo' or similar for artifact caching if 'pnpm build' remains > 30s.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented targeted container update recommendations in dev:dash. Introduced verify:api for faster surgical loops. Documented the new identity-aware workflow in developer-guide.md. Audited build times and recommended Turborepo adoption for future optimization.
<!-- SECTION:NOTES:END -->
