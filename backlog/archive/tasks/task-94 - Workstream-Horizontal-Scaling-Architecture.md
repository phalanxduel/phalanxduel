---
id: TASK-94
title: 'Workstream: Horizontal Scaling Architecture'
status: Done
assignee:
  - '@codex'
created_date: '2026-03-20 22:11'
updated_date: '2026-05-02 12:50'
labels:
  - workstream
  - architecture
  - scaling
dependencies:
  - TASK-166
priority: high
ordinal: 11300
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
- [x] #4 A Strategy Pattern (IMatchManager interface) allows hot-swapping between InMemory and Distributed modes
- [ ] #5 The app degrades gracefully to local/bot mode when the distributed backplane is unavailable
- [x] #6 Architectural Firewalls ensure the Engine and App are completely agnostic to the Transport mechanism
- [ ] #7 A distinct testing strategy is defined leveraging Vitest for local mechanics and Playwright/K6 for cross-node WS validation
- [ ] #8 A Docker Compose cluster definition is scoped to simulate the HAProxy scaled layout locally
- [x] #9 A distinction between horizontal and Node.js vertical scaling constraints is formally documented
- [ ] #10 The architecture must support future Global Edge deployments utilizing cross-region backplanes seamlessly via the established IStateStore interfaces
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Treat TASK-94 as the coordinator workstream rather than a single implementation patch, and use it to define the execution DAG for horizontal scaling.
2. First implementation slice: introduce the strategy/composition boundary only by defining an IMatchManager-style contract, preserving the existing in-memory MatchManager as the local implementation, and wiring buildApp to depend on the abstraction instead of a concrete class.
3. Second slice: document and pin down the distributed backplane contract before transport code lands, including Neon/Postgres LISTEN/NOTIFY fanout semantics, match ownership, graceful local fallback, and the horizontal-vs-vertical scaling distinction.
4. Later slices: implement the Postgres adapter, distributed broadcast path, multi-node validation strategy, and local HA/docker simulation as separate dependent tasks instead of one large refactor.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-03 discovery: TASK-94 is a true L2 workstream, not a single patch. Current server authority lives in server/src/match.ts, where MatchManager still owns in-memory matches, socketMap, reconnect timers, and broadcast behavior directly. Persistence already exists through server/src/db/match-repo.ts, and server/src/app.ts already has a useful composition seam because buildApp can accept an injected MatchManager.

2026-04-03 recommended next slice: start by extracting the strategy/interface seam rather than attempting the full distributed transport. That keeps engine and app code transport-agnostic first, which is upstream of the Neon LISTEN/NOTIFY adapter, distributed fanout, graceful fallback, and multi-node test harness work.

2026-04-05 progress: Three more acceptance criteria confirmed complete.
- #4 IMatchManager interface extracted in `server/src/match.ts:199` — all routes and app.ts depend on the abstraction. Commit: 919ce1bd.
- #6 Engine and App are now fully agnostic to the transport mechanism via IMatchManager injection in buildApp. Commit: 919ce1bd.
- #9 Horizontal vs. vertical scaling distinction formally documented in docs/arch. Commit: bc08242c.
- #2 ILedgerStore + match_actions table implemented (TASK-96 → Human Review). Commit: 7d44fe53.

Next slice: TASK-97 (Refactor MatchManager into Actor Supervisor). Blocked pending TASK-96 Human Review sign-off.
<!-- SECTION:NOTES:END -->
