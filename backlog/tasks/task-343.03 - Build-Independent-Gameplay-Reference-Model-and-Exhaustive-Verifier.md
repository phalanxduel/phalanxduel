---
id: TASK-343.03
title: Build Independent Gameplay Reference Model and Exhaustive Verifier
status: Done
assignee:
  - '@codex'
created_date: '2026-07-13 14:00'
updated_date: '2026-07-13 16:32'
labels:
  - gameplay
  - assurance
  - engine
dependencies:
  - TASK-343.01
  - TASK-343.02
documentation:
  - docs/gameplay/rules.md
  - docs/reference/test-constitution.md
  - docs/architecture/principles.md
modified_files:
  - engine/src/combat.ts
  - engine/src/combat-math.ts
  - engine/src/assurance/combat-reference.ts
  - engine/src/assurance/combat-proof-domain.ts
  - engine/tests/combat-reference.test.ts
  - engine/tests/rules-coverage.test.ts
  - engine/tests/rules-version.test.ts
  - scripts/ci/verify-combat-reference.ts
  - docs/gameplay/rules.md
  - docs/gameplay/rule-evidence.json
  - docs/quality/combat-reference-proof.md
  - docs/quality/combat-reference-proof.json
  - docs/quality/gameplay-rule-evidence.md
  - docs/reference/gameplay-assurance.md
  - docs/reference/pnpm-scripts.md
  - docs/system/dependency-graph.svg
  - package.json
parent_task_id: TASK-343
priority: high
ordinal: 188800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create an intentionally independent executable model for supported configuration, target-chain combat, eligibility, modifiers, and outcomes so production behavior can be differentially checked over the finite gameplay domain.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The reference model does not call production combat resolution
- [x] #2 Supported card values types suits modes and target-chain states are exhaustively enumerated
- [x] #3 Production and reference results have zero unexplained mismatches
- [x] #4 Failures emit minimal reproducible counterexamples with rule identifiers
- [x] #5 The verifier is deterministic and suitable for protected CI
- [x] #6 Tests and documentation describe the finite domain actually proved
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Define the finite proof domain from the v2.0 rules and the exact combat inputs read by the engine, including canonical cards, rules modes, legal HP boundaries, two-rank target-chain states, and player-damage boundaries.
2. Implement a pure reference model that depends only on shared data types and rule constants, never on production combat resolution.
3. Implement deterministic differential enumeration against the production resolver with stable ordering, rule-attributed comparisons, and minimized reproducible counterexamples.
4. Add focused tests that enforce model independence, enumerator completeness, determinism, and zero mismatches; wire the verifier into the protected rules check.
5. Document the proved finite domain and its explicit limits, then run targeted checks followed by the repository Definition of Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented an independent reference combat interpreter and finite-domain generator under `engine/src/assurance/`, with no production engine imports. Extracted the authoritative resolver's deterministic card, card-boundary, and player-boundary transitions into `engine/src/combat-math.ts` so the verifier can compare stage relations and end-to-end orchestration separately. The verifier enumerates 1,786,152 ordered cases, emits rule-attributed counterexamples, and pins a SHA-256 result/domain digest. Differential checking surfaced four v2 semantic defects; all were corrected behind `specVersion: 2.0` while v1 replay behavior remains explicit and preserved. Joker remains reserved schema vocabulary and is explicitly outside the canonical competitive proof domain.

Verification evidence: `pnpm rules:check` passed with 1,786,152 comparisons and digest `938e26025dc42cbe2c4163b51e3c7369d326ea85e464aa9be8b5463c7dc37846`; `pnpm test:run:all` passed (shared 147, engine 365, server 381 across its two invocations, client 209, admin 7, MCP 5); `pnpm qa:playthrough:verify` passed 12/12 across classic/cumulative and LP 1/20/100 with zero anomalies.

Resolved counterexamples: Club doubling without a first destruction; Diamond shielding a direct Card→Player transition; v2 LP-step `absorbed` reporting a net post-multiplier difference instead of the actual Heart term; and an earlier destroyed Heart shielding after a later non-Heart was destroyed. Historical v1 behavior is version-dispatched and documented as replay axioms.

Final repository gate: escalated `rtk proxy pnpm check` passed after granting the documented local Docker/Postgres route-generation access. The initial sandboxed run stopped only at Docker socket permission; all preceding phases were green. `pnpm schema:gen` and `pnpm schema:check` also passed, and documentation artifacts regenerated without drift.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Delivered an independent executable combat reference model, finite proof-domain enumerator, and protected differential verifier. The new gate performs 1,786,152 deterministic comparisons and pins a reviewed SHA-256 digest. It found and resolved four v2 combat inconsistencies while preserving v1 replay semantics behind explicit version dispatch. Combat rules PD-RULE-017 through PD-RULE-032 now carry E4 model-checking evidence except generalized multi-rank target-chain coverage, which remains honestly marked partial. The proof boundary, composition argument, finite counts, Joker exclusion, and non-claims are documented. Full repository checks, schema checks, rules checks, and the 12-scenario playability matrix pass.
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
