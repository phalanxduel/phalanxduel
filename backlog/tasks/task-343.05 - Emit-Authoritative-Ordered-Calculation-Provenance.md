---
id: TASK-343.05
title: Emit Authoritative Ordered Calculation Provenance
status: Done
assignee:
  - '@codex'
created_date: '2026-07-13 14:00'
updated_date: '2026-07-13 17:41'
labels:
  - gameplay
  - mathematical-narration
  - shared
  - engine
dependencies:
  - TASK-343.01
  - TASK-343.02
documentation:
  - docs/gameplay/rules.md
  - docs/reference/test-constitution.md
  - docs/architecture/principles.md
modified_files:
  - client/src/game.tsx
  - client/src/narration-producer.ts
  - docs/api/openapi.json
  - docs/gameplay/rule-evidence.json
  - docs/gameplay/rules.md
  - docs/quality/gameplay-rule-evidence.md
  - docs/reference/gameplay-assurance.md
  - docs/system/dependency-graph.svg
  - engine/src/calculation-provenance.ts
  - engine/src/combat.ts
  - engine/src/events.ts
  - engine/src/state.ts
  - engine/src/turns.ts
  - engine/tests/calculation-provenance.test.ts
  - scripts/ci/verify-combat-reference.ts
  - scripts/ci/verify-rule-evidence.ts
  - server/tests/__snapshots__/openapi.test.ts.snap
  - shared/schemas/game-state.schema.json
  - shared/schemas/server-messages.schema.json
  - shared/schemas/turn-result.schema.json
  - shared/src/calculation-provenance.ts
  - shared/src/combat-resolution.ts
  - shared/src/index.ts
  - shared/src/schema.ts
  - shared/src/types.ts
  - shared/tests/calculation-provenance.test.ts
parent_task_id: TASK-343
priority: high
ordinal: 190800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make mathematical explanation a first-class replay-safe gameplay artifact. Each resolved combat operation records its stable rule identifier, ordered operator, named inputs, result, target quantity, and observer visibility so verification and presentation consume the same evidence.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Combat resolution emits ordered structured calculation provenance for absorption overflow modifiers clamps HP and LP changes
- [x] #2 Every calculation step references a stable normative rule identifier
- [x] #3 Calculation chains satisfy arithmetic closure and step continuity
- [x] #4 Preview live execution and replay emit identical provenance for identical inputs
- [x] #5 Calculation provenance participates in event integrity and schema generation
- [x] #6 No presentation caller must recalculate authoritative damage
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory authoritative combat event, preview, replay, schema, hashing, and consumer paths plus reusable structured-evidence conventions.
2. Define a versioned ordered calculation-step contract with stable rule IDs, named operands, operators, results, target quantities, and observer visibility.
3. Emit the trace from the single authoritative combat transition and make preview/live/replay consume the same artifact without presentation-side damage recomputation.
4. Add arithmetic-closure, continuity, rule-evidence, schema-integrity, replay-parity, and consumer-boundary tests.
5. Regenerate schemas and documentation artifacts; run gameplay, rules, schema, docs, mutation/playability where relevant, and full repository verification; close and commit the slice.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a schema-versioned v3.0 CalculationProvenance arithmetic witness at the authoritative combat computation site. Each ordered step records a stable PD-RULE identifier, operator, named integer operands with explicit state/constant/prior-step origins, result, target quantity, and visibility. The engine evaluates each step as it records it; the independent shared verifier proves integer closure, exact prior-step continuity, valid ordering, and source equality. The stored resolution is reused verbatim by preview, live events, replay, and client narration readers; v1/v2 retain historical payload shapes through an explicit compatibility reader. Event fingerprints cover the trace, generated schemas/OpenAPI expose it, and rule evidence includes PD-RULE-064 through PD-RULE-066. During verification, the recorder exposed a latent partial-GameOptions bug that could initialize LP as undefined and propagate NaN; state initialization now applies the documented 20-LP default with regression coverage.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Established v3.0 authoritative calculation provenance as a schema-versioned ordered arithmetic witness stored with each combat transaction and resolution. Every step carries a stable rule ID, operator, named operands with explicit origins, integer result, target quantity, and visibility; the engine and an independent shared verifier enforce closure and exact prior-step continuity. Preview, live events, replay, and client narration consume the same stored artifact, while v1/v2 retain historical shapes through an explicit compatibility reader. Added PD-RULE-064–066, regenerated schemas/OpenAPI/evidence, and fixed a partial-GameOptions bug that previously allowed undefined LP/NaN combat. Verified pnpm check, rules/schema/docs gates, the 2,355,388-case independent combat oracle (digest 9e3d7f6d1a034c70eca28998bb1636184d520a7815bd8231f0684ab3ab8741dc), and the 12/12 playability gate.
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
