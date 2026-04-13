---
id: TASK-239
title: Decompose Docker recovery commands by blast radius and lifecycle intent
status: To Do
assignee: []
created_date: '2026-04-13 10:47'
labels:
  - docker
  - devex
  - infra
dependencies: []
references:
  - reports/qa/test-council-audit.md
  - package.json
  - docker-compose.yml
  - Dockerfile
  - Dockerfile.dev
  - scripts/dev-dashboard.ts
priority: medium
ordinal: 155
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Current Docker command surface conflates start rebuild stack reset and machine-wide reclaim. Make local infra flows explicit so fast path stays cheap, repo-scoped reset stays safe, and machine-wide cleanup is reserved for true disk-pressure recovery.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Default Docker start path no longer forces rebuild when plain stack startup is intended
- [ ] #2 Repo-scoped stack reset and machine-scoped reclaim are separate commands with explicit names and documented blast radius
- [ ] #3 Normal rebuild path no longer performs machine-wide prune or Colima reclaim implicitly
- [ ] #4 Service-specific log or debug commands exist for common failure domains used in local recovery
- [ ] #5 Dashboard or script docs point to renamed recovery commands and no longer advertise stale or ambiguous Docker commands
<!-- AC:END -->
