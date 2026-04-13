---
id: TASK-236
title: >-
  Tighten test architecture and type-state boundaries for fairness-critical
  surfaces
status: To Do
assignee: []
created_date: '2026-04-13 03:53'
labels:
  - qa
  - types
  - architecture
  - shared
  - engine
  - server
dependencies: []
references:
  - reports/qa/test-council-audit.md
  - shared/src/schema.ts
  - shared/tests/schema.test.ts
  - scripts/build/resolve-source.ts
  - engine/tests/visibility.test.ts
priority: high
ordinal: 140
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The council found two linked structural problems: copied test builders and cross-package source imports make the suite brittle, and the shared gameplay state model still annotates illegal states instead of preventing them. Tighten the package-local testing architecture and phase-aware type/state boundaries so refactors fail for real semantic regressions rather than helper drift or impossible-state permissiveness.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Fairness-critical shared state or turn-result modeling gains phase-aware constructors discriminated unions or equivalent safeguards against contradictory combinations
- [ ] #2 Outbound server message and turn projection examples are validated against shared schemas rather than only cast into TypeScript types
- [ ] #3 Package-local testkit modules replace the most duplicated gameplay builders socket doubles and repo doubles in engine server and client tests
- [ ] #4 Cross-package source imports in tests and verification scripts are reduced or isolated to explicitly documented integration suites
- [ ] #5 Repo guidance documents the allowed fixture patterns ownership boundaries and when source-rewrite or built-package fidelity checks should be used
<!-- AC:END -->
