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
Epic-level coordinator for scaling the single-instance Node.js backend to a stateless, multi-node architecture utilizing Neon Postgres as a state backplane, leveraging `LISTEN` and `NOTIFY` to handle distributed Websocket communication and concurrent state locks. Discards the need for Redis.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An MVP Postgres listen/notify adapter is integrated
- [ ] #2 MatchManager transitions from local Map<> to a distributed Neon client mapping
- [ ] #3 WebSocket broadcasts rely on Postgres Pub/Sub
<!-- AC:END -->
