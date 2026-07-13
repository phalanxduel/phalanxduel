---
id: TASK-343.04
title: Prove Stateful Invariants Replay Semantics and Match Liveness
status: Done
assignee:
  - '@codex'
created_date: '2026-07-13 14:00'
updated_date: '2026-07-13 17:18'
labels:
  - gameplay
  - assurance
  - replay
dependencies:
  - TASK-343.02
  - TASK-343.03
documentation:
  - docs/gameplay/rules.md
  - docs/reference/test-constitution.md
  - docs/architecture/principles.md
parent_task_id: TASK-343
priority: high
ordinal: 189800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend gameplay assurance from isolated examples to generated legal action sequences, metamorphic relations, semantic replay equivalence, and a normative termination policy using repetition, no-progress, and hard-turn limits.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Generated legal sequences preserve card identity conservation HP and LP bounds phase legality and rejection integrity
- [x] #2 Live preview and replay agree semantically with committed execution
- [x] #3 Player and initiative mirroring properties are tested where symmetry is expected
- [x] #4 Threefold repetition no-progress and hard-turn policies produce deterministic draws
- [x] #5 Every legal match terminates under the supported normative rules
- [x] #6 Mutation testing detects changes to fairness-critical predicates and arithmetic
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory the authoritative action, preview, replay, hash, phase, victory, and termination paths plus existing property/metamorphic tests and legal-action generators.
2. Define finite/generated sequence domains and explicit invariants for identity conservation, bounded HP/LP, legal phases, rejection purity, semantic replay equivalence, and expected symmetries.
3. Add deterministic draw termination semantics for threefold repetition, no-progress, and hard-turn limits with versioned state/events and replay coverage.
4. Add mutation-sensitivity checks for fairness-critical predicates and arithmetic, then map evidence to stable rule IDs without overstating proof scope.
5. Run targeted gameplay/replay/property tests, rules/schema/docs gates, full repository verification, and playability verification; document and commit the completed slice.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented rules v3.0 as the replay-safe major version for deterministic match liveness while preserving v2.0 corrected-combat/pre-liveness replay and v1.0 legacy combat. Added exact threefold repetition, a 50-completed-turn irreversible-progress recurrence, and a completed-turn-200 hard cap with decisive-result precedence and nullable draw outcomes. Made attack preview derive from an authoritative cloned transition/event, added generated identity/HP/LP/phase/rejection/replay properties and player-seat metamorphic tests, projected internal liveness state away from viewers, and made client/server/MCP draw consumers explicit. Extended the independent combat proof to all three rules versions (2,355,388 comparisons; digest 9e3d7f6d1a034c70eca28998bb1636184d520a7815bd8231f0684ab3ab8741dc). Added a focused semantic mutation gate with a 90% floor; the reviewed baseline kills 204/204 included combat/liveness mutants with zero survivors or timeouts. Pinned Babel 7.29.7 because the prior unbounded override resolved Babel 8, which is incompatible with Stryker 9.6.1.

Verification evidence: all shared (148), engine (395), server (382), client (212), admin (7), and MCP (5) tests pass; rules/FSM/event evidence passes; schema and documentation freshness gates pass; playability matrix passes 12/12 with zero anomalies; semantic mutation score is 100.00%. Generated schemas, OpenAPI, rule evidence, dependency graph, and OpenAPI snapshot are refreshed and verified.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Established replay-safe rules v3.0 with deterministic threefold-repetition, no-progress, and hard-turn draws while preserving v2.0 and v1.0 replay semantics. Unified attack preview with authoritative committed-event derivation; added generated exact-identity, bounds, rejection-purity, replay-equivalence, liveness, and metamorphic-symmetry evidence; made draw outcomes nullable and explicit across client, server, and MCP while keeping hidden liveness state out of viewer projections. Expanded the exhaustive combat proof to 2,355,388 cases and added a 204-mutant semantic gate scoring 100%. Regenerated shared schemas, OpenAPI, rule evidence, dependency documentation, and proof artifacts. Verified pnpm check, rules:check, schema:check, docs:check, the mutation gate, and the 12/12 playability matrix.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
