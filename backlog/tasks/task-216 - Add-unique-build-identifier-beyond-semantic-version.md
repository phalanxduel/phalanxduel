---
id: TASK-216
title: Add unique build identifier beyond semantic version
status: To Do
assignee: []
created_date: '2026-04-07 02:36'
labels:
  - client
  - server
  - infra
  - p0
  - promotion-readiness
dependencies: []
references:
  - client/vite.config.ts
  - shared/src/index.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The current version string (v0.4.1-rev.1) does not uniquely identify which build is deployed. For promotion readiness, need a build identifier (e.g. git short SHA or build timestamp) embedded at build time so that the exact deployed version can be traced when receiving feedback from Reddit users. Should be visible in the lobby version tag, health endpoint, and client console.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Lobby version tag shows semantic version plus unique build ID (e.g. v0.4.1+abc1234)
- [ ] #2 Health endpoint /health response includes the build identifier
- [ ] #3 Build identifier changes on every new build/deploy
- [ ] #4 bin/check passes
<!-- AC:END -->
