---
id: TASK-94.02
title: Extract MatchManager strategy seam for horizontal scaling
status: To Do
assignee: []
created_date: '2026-04-03 02:42'
labels: []
dependencies: []
documentation:
  - docs/architecture/principles.md
  - server/src/app.ts
  - server/src/match.ts
  - server/tests/reconnect.test.ts
parent_task_id: TASK-94
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the first bounded implementation slice for the horizontal-scaling workstream by separating the server app from the concrete in-memory MatchManager. The goal is to introduce an IMatchManager-style abstraction and composition boundary that preserves current local behavior while making later distributed backplane work possible without rewriting routes or engine integration again. This task should keep restart-safe rejoin, persisted match recovery, and current WebSocket/HTTP behavior intact while clarifying the transport boundary in code and docs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A manager interface or equivalent abstraction exists for the server-facing match lifecycle and app wiring no longer depends directly on the concrete in-memory MatchManager class.
- [ ] #2 The existing local MatchManager remains the default implementation and current REST/WebSocket behavior stays unchanged for create, join, action, reconnect, and log retrieval flows.
- [ ] #3 The abstraction boundary is documented in the relevant system or architecture docs with enough context for the later distributed adapter task to build on it safely.
- [ ] #4 Targeted automated coverage proves the abstraction preserves the current local behavior for at least app construction and one reconnect-sensitive path.
<!-- AC:END -->
