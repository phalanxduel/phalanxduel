---
id: TASK-94
title: 'Workstream: Horizontal Scaling Architecture'
status: To Do
assignee: []
created_date: '2026-03-20 22:11'
updated_date: '2026-03-20 22:51'
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
- [ ] #4 A Strategy Pattern (IMatchManager interface) allows hot-swapping between InMemory and Distributed modes
- [ ] #5 The app degrades gracefully to local/bot mode when the distributed backplane is unavailable
- [ ] #6 Architectural Firewalls ensure the Engine and App are completely agnostic to the Transport mechanism
- [ ] #7 A distinct testing strategy is defined leveraging Vitest for local mechanics and Playwright/K6 for cross-node WS validation
<!-- AC:END -->
