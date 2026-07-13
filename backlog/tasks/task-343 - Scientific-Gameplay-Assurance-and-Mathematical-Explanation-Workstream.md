---
id: TASK-343
title: 'Workstream: Scientific Gameplay Assurance and Mathematical Explanation'
status: In Progress
assignee:
  - codex
created_date: '2026-07-13 13:59'
updated_date: '2026-07-13 14:01'
labels:
  - gameplay
  - assurance
  - mathematical-narration
  - workstream
dependencies: []
documentation:
  - docs/gameplay/rules.md
  - docs/reference/test-constitution.md
  - docs/architecture/principles.md
  - docs/adr/ADR-001-authority-model-is-explicit.md
  - docs/adr/ADR-005-deterministic-replay-hash-compatibility.md
  - docs/adr/ADR-020-centralized-game-rule-schemas.md
  - docs/adr/ADR-031-agentic-gameplay-safety-and-bot-tiers.md
priority: high
ordinal: 185800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Establish a versioned, evidence-backed assurance program for Phalanx Duel that proves formalizable gameplay claims within a declared scope, quantifies empirical claims, resolves known semantic gaps, and turns authoritative calculation provenance into replay-safe mathematical narration and event displays. Approved defaults include shield-before-weapon ordering, face-up competitive v1 deployment, two-rank competitive Duel until generalized combat is verified, draw-based repetition/no-progress limits, observer-safe bots, atomic mode-isolated ratings, and progressive mathematical narration.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every normative gameplay rule has a stable identifier and current evidence classification
- [ ] #2 Production gameplay and an independent reference model have no unexplained mismatches over the supported finite domain
- [ ] #3 Safety determinism replay liveness information-integrity rating and statistical-fairness claims have declared evidence
- [ ] #4 Authoritative ordered calculation provenance powers verified narration preview replay and event displays
- [ ] #5 Protected release verification emits a versioned assurance manifest with no unresolved critical or high gaps
- [ ] #6 Historical replay behavior remains reproducible under its recorded rules version
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Execute the approved workstream sequentially on main using the child-task DAG. Begin with TASK-343.01 to establish the assurance charter and stable rule evidence registry; resolve versioned semantics in TASK-343.02; build the independent reference model in TASK-343.03; prove stateful invariants and liveness in TASK-343.04; add authoritative calculation provenance in TASK-343.05; enforce observer knowledge in TASK-343.07 before presenting formulas in TASK-343.06; correct rating settlement in TASK-343.08; run preregistered statistical experiments in TASK-343.09; and finish with the generated assurance manifest and release gates in TASK-343.10. Preserve historical replay compatibility, keep competitive v1 scoped to verified behavior, and run the relevant gameplay, schema, replay, database-isolated, playability, and release verification at each slice.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
