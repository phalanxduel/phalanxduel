---
id: TASK-343.02
title: Resolve and Version Canonical Gameplay Semantic Gaps
status: Done
assignee:
  - codex
created_date: '2026-07-13 14:00'
updated_date: '2026-07-13 15:56'
labels:
  - gameplay
  - rules
  - replay
dependencies:
  - TASK-343.01
documentation:
  - docs/gameplay/rules.md
  - docs/reference/test-constitution.md
  - docs/architecture/principles.md
modified_files:
  - shared/src/schema.ts
  - shared/src/types.ts
  - shared/tests/schema.test.ts
  - shared/schemas/client-messages.schema.json
  - shared/schemas/server-messages.schema.json
  - shared/schemas/game-state.schema.json
  - shared/schemas/turn-result.schema.json
  - engine/src/state.ts
  - engine/src/combat.ts
  - engine/tests/rules-version.test.ts
  - engine/tests/rules-coverage.test.ts
  - engine/tests/pass-rules.test.ts
  - engine/tests/replay.test.ts
  - docs/gameplay/rules.md
  - docs/gameplay/rule-evidence.json
  - docs/quality/gameplay-rule-evidence.md
  - docs/gameplay/rule-amendments.md
  - docs/architecture/schema-evolution.md
  - docs/architecture/versioning.md
  - docs/api/openapi.json
  - server/tests/__snapshots__/openapi.test.ts.snap
  - scripts/ci/verify-rule-evidence.ts
parent_task_id: TASK-343
priority: high
ordinal: 187800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolve known gameplay ambiguities using the approved defaults while preserving historical replay compatibility. The corrected rule set uses shield-before-weapon ordering, shield-only Hearts, threshold semantics for pass loss, face-up competitive deployment, canonical face-card values, and a two-rank competitive Duel scope until generalized combat is verified.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Canonical equations unambiguously define suit operation order and clamping
- [x] #2 Pass loss semantics and player-facing terminology agree
- [x] #3 Competitive supported geometry and visibility semantics are explicit
- [x] #4 Historical matches remain replayable under their recorded rules version
- [x] #5 Positive negative and replay evidence cover each changed semantic
- [x] #6 Documentation and generated contracts agree with the resolved rules
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Map the current rules-version dispatch, combat boundary ordering, pass thresholds/copy, face-card values, supported geometry, visibility, and replay entry points. Introduce an explicit corrected rules version while retaining the historical v1.0 path. Encode Shield → Weapon → Clamp, shield-only Hearts, threshold (`>=`) pass loss, face-up competitive deployment, J/Q/K value 11, integer arithmetic, and competitive 2×4 scope in authoritative rules/contracts. Add positive, negative, boundary, and cross-version replay tests for every changed semantic; update the evidence registry and generated traceability. Run rules, schema, replay, and complete repository verification before finalization.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Introduced explicit major rules dispatch: new matches default to specVersion 2.0, while 1.0 remains accepted and preserves historical Weapon → Shield boundary ordering. GameState and params versions must agree.

Rules v2.0 computes Shield → Weapon → Clamp with integer arithmetic at both card and player boundaries. Hearts remain a non-stacking shield and cannot create healing. Pass losses trigger exactly at configured >= thresholds. J/Q/K remain canonical value 11.

Strict Classic v2.0 is constrained to competitive 2x4 and face-up deployment. Non-2x4 partial requests normalize to Hybrid unless the caller explicitly asserts Strict mode, preserving experimental custom formats without presenting them as verified competition.

Generated public JSON schemas, OpenAPI, snapshots, and rule evidence were refreshed. Evidence baseline improved from 40 aligned / 10 partial / 3 divergent / 1 unverified to 43 aligned / 10 partial / 0 divergent / 1 unverified.

Verification passed: rules:check, schema:check, focused cross-version and server contract tests, and the complete pnpm check gate. One intermediate Vitest worker-console teardown race occurred after 377/377 server assertions; isolated server rerun and the repeated unified gate both passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Versioned and resolved the canonical gameplay semantic gaps as rules v2.0 without sacrificing historical replay. The engine now dispatches boundary math by immutable specVersion: v1.0 preserves Weapon → Shield for old hashes, while v2.0 uses the corrected Shield → Weapon → Clamp equations at card and player boundaries. The contract enforces matching state/parameter versions, threshold (`>=`) pass loss, integer J/Q/K value 11, shield-only non-healing Hearts, face-up competitive play, and Strict Classic 2×4 geometry; custom geometry remains available as explicitly Hybrid/Manual. Added positive, negative, boundary, schema, and replay tests, regenerated JSON schemas and OpenAPI, and reduced the assurance registry to zero known divergent rules. Verified with `pnpm rules:check`, `pnpm schema:check`, and a clean repeated `pnpm check`.
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
