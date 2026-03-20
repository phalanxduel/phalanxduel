---
id: TASK-94
title: 'Workstream: Horizontal Scaling Architecture'
status: To Do
assignee: []
created_date: '2026-03-20 22:11'
labels:
  - workstream
  - architecture
  - scaling
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Epic-level coordinator for scaling the single-instance Node.js backend to a stateless, multi-node architecture utilizing a Redis backplane to handle distributed Websocket communication and concurrent state locks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An MVP Redis cache is securely integrated
- [ ] #2 MatchManager transitions from local Map<> to a distributed Redis client
- [ ] #3 WebSocket broadcasts rely on Redis Pub/Sub
<!-- AC:END -->
