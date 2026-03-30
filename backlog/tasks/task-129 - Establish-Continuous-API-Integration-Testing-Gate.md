---
id: TASK-129
title: Establish Continuous API Integration Testing Gate
status: To Do
assignee: []
created_date: '2026-03-30 19:54'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Transition API testing from a manual 'smoke test' to a continuous verification gate. This ensures that changes to the server (like middleware or database logic) never break the core game loop.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 Add a --continuous or --until-failure flag to bin/qa/api-playthrough.ts.
- [ ] #2 #2 Configure a CI job (GitHub Action) that runs 100 random games against a spawned dev server on every PR.
- [ ] #3 #3 Ensure logs and traces are archived as artifacts on failure.
<!-- AC:END -->
