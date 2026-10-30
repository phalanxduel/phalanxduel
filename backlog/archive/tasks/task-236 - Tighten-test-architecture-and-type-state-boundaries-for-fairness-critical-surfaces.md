---
id: TASK-236
title: >-
  Tighten test architecture and type-state boundaries for fairness-critical
  surfaces
status: Done
assignee: []
created_date: '2026-04-13 03:53'
updated_date: '2026-05-01 16:28'
labels:
  - qa
  - types
  - architecture
  - shared
  - engine
  - server
milestone: Post-Promotion Hardening
dependencies: []
references:
  - reports/qa/test-council-audit.md
  - shared/src/schema.ts
  - shared/tests/schema.test.ts
  - scripts/build/resolve-source.ts
  - engine/tests/visibility.test.ts
priority: high
ordinal: 8020
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The council found two linked structural problems: copied test builders and cross-package source imports make the suite brittle, and the shared gameplay state model still annotates illegal states instead of preventing them. Tighten the package-local testing architecture and phase-aware type/state boundaries so refactors fail for real semantic regressions rather than helper drift or impossible-state permissiveness.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Fairness-critical shared state or turn-result modeling gains phase-aware constructors discriminated unions or equivalent safeguards against contradictory combinations
- [x] #2 Outbound server message and turn projection examples are validated against shared schemas rather than only cast into TypeScript types
- [x] #3 Package-local testkit modules replace the most duplicated gameplay builders socket doubles and repo doubles in engine server and client tests
- [x] #4 Cross-package source imports in tests and verification scripts are reduced or isolated to explicitly documented integration suites
- [x] #5 Repo guidance documents the allowed fixture patterns ownership boundaries and when source-rewrite or built-package fidelity checks should be used
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
AC-1: GameStateSchema.superRefine() rejects gameOver-without-outcome, outcome-on-non-gameOver, ReinforcementPhase-without-reinforcement, reinforcement-on-non-ReinforcementPhase. 7 new phase-aware invariant tests in shared/tests/schema.test.ts. AC-2: server/src/match.ts send() runs ServerMessageSchema.safeParse() on every outbound WebSocket message — logs drift, does not drop (game continuity preserved). AC-3: server/tests/helpers/socket.ts testkit exports mockSocket/lastMessage/allMessages/MockSocket. All 11 server test files migrated off inline duplicate mockSocket definitions. AC-4: filter.test.ts cross-package import documented as intentional integration suite in test-fixture-patterns.md. AC-5: docs/reference/test-fixture-patterns.md documents fixture patterns, ownership boundaries, and fidelity check guidance. All 317 server + 116 shared tests passing.
<!-- SECTION:FINAL_SUMMARY:END -->
