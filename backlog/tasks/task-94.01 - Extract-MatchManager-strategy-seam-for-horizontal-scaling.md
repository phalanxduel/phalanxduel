---
id: TASK-94.01
title: Extract MatchManager strategy seam for horizontal scaling
status: Done
assignee: []
created_date: '2026-04-03 02:39'
updated_date: '2026-04-05 02:37'
labels: []
dependencies:
  - TASK-166
documentation:
  - docs/system/ARCHITECTURE.md
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
- [x] #1 A manager interface or equivalent abstraction exists for the server-facing match lifecycle and app wiring no longer depends directly on the concrete in-memory MatchManager class.
- [x] #2 The existing local MatchManager remains the default implementation and current REST/WebSocket behavior stays unchanged for create, join, action, reconnect, and log retrieval flows.
- [x] #3 The abstraction boundary is documented in the relevant system or architecture docs with enough context for the later distributed adapter task to build on it safely.
- [x] #4 Targeted automated coverage proves the abstraction preserves the current local behavior for at least app construction and one reconnect-sensitive path.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Extracted the MatchManager strategy seam for horizontal scaling.
- Defined the IMatchManager interface in server/src/match.ts.
- Updated MatchManager to implement IMatchManager.
- Decoupled buildApp in server/src/app.ts from the concrete MatchManager implementation.
- Refactored routes (internal, matches, matchmaking, stats) to use the IMatchManager abstraction.
- Updated core integration tests to use the new interface.
- Documented the horizontal scaling seam in docs/system/ARCHITECTURE.md.
- Verified that existing REST and WebSocket behavior remains unchanged with all 261 server tests passing.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 IMatchManager interface extracted and implemented.
- [x] #2 buildApp decoupled from concrete MatchManager class.
- [x] #3 All routes updated to use the abstraction.
- [x] #4 Integration tests pass with the new abstraction.
- [ ] #5 IMatchManager interface extracted and implemented.
- [ ] #6 buildApp decoupled from concrete MatchManager class.
- [ ] #7 All routes updated to use the abstraction.
- [ ] #8 Integration tests pass with the new abstraction.
- [ ] #9 IMatchManager interface extracted and implemented.
- [ ] #10 buildApp decoupled from concrete MatchManager class.
- [ ] #11 All routes updated to use the abstraction.
- [ ] #12 Integration tests pass with the new abstraction.
<!-- DOD:END -->
