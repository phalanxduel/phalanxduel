---
id: TASK-343
title: 'Workstream: Scientific Gameplay Assurance and Mathematical Explanation'
status: In Progress
assignee:
  - codex
created_date: '2026-07-13 13:59'
updated_date: '2026-08-30 13:45'
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

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Execute the approved workstream sequentially on main using the child-task DAG. Begin with TASK-343.01 to establish the assurance charter and stable rule evidence registry; resolve versioned semantics in TASK-343.02; build the independent reference model in TASK-343.03; prove stateful invariants and liveness in TASK-343.04; add authoritative calculation provenance in TASK-343.05; enforce observer knowledge in TASK-343.07 before presenting formulas in TASK-343.06; correct rating settlement in TASK-343.08; run preregistered statistical experiments in TASK-343.09; and finish with the generated assurance manifest and release gates in TASK-343.10. Preserve historical replay compatibility, keep competitive v1 scoped to verified behavior, and run the relevant gameplay, schema, replay, database-isolated, playability, and release verification at each slice.

Execution sequence (2026-08-30, durable operating plan): finish TASK-383 verification and documentation first; then execute TASK-343.13 canonical versioned run evidence; then TASK-343.14 shared trajectories across engine/WebSocket/REST/browser/MCP/Go; then TASK-360.03 semantic browser adapter; then TASK-343.10 assurance manifest and release gates; finally TASK-343.15 capability matrix. Each stage must pass its acceptance criteria and relevant checks before the next dependency starts.

Current evidence baseline: the TypeScript playthrough Harness records deterministic manifests, replay/screenshots, QA run and match identifiers, optional O2 correlation attachments, Panoramic View, and Markdown scenario reports. A fresh local capture passed with O2 evidence attached.

Execution gates: preserve server-authoritative rules and observer redaction; use isolated database wrappers for DB work; run schema generation/checks when contracts change; run the playability gate before UI automation changes; record evidence and blockers in the active task; do not advance a dependency on a warning or untested row.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-08-30 @codex: Durable sequential plan established. The immediate blocker is TASK-383, whose implementation is largely present but AC #7 and DoD #3-#5 remain open. The fresh Harness/O2 run validates the intended evidence shape but does not replace TASK-343.13.
<!-- SECTION:NOTES:END -->
