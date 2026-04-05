---
id: TASK-170
title: Enforce the full canonical match-parameter contract in shared and server
status: Done
assignee:
  - '@codex'
created_date: '2026-04-02 15:48'
updated_date: '2026-04-02 20:21'
labels: []
dependencies:
  - TASK-168
priority: high
ordinal: 83000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Context
The audit found that the shared schema and server match creation path accept or normalize match parameters using a subset of the documented rules. The current validation omits the card-scarcity invariant, only checks part of strict-mode parity, and duplicates config logic in `server/src/match.ts` instead of relying on one canonical contract.

## Evidence
- Rule IDs: R-3.1, R-3.2, R-3.3, R-19
- Audit sections: Phase 3, Phase 5, Phase 7, Phase 8
- Code: `shared/src/schema.ts`, `server/src/match.ts`
- Runtime proof: on 2026-04-02 `MatchParametersSchema.safeParse(...)` accepted a 12x4 / initialDraw=52 config, and `createInitialState(...)` drew 52 cards per player and left zero cards in drawpile despite the reserve-of-4 rule.

## Impact
- determinism
- integrity
- consistency
- exploit-risk

## Metadata
- Surface: shared, server, tests, docs
- Type: bug, determinism, consistency
- Priority: critical
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The shared validation path rejects every rule-invalid configuration defined by the resolved canonical contract, including card-scarcity violations and full strict-mode parity mismatches.
- [x] #2 Server match creation uses the shared canonical validation or normalization path instead of maintaining a divergent handwritten subset.
- [x] #3 Edge cases such as 12x4 geometry, initiative/pass-rule parity, and unsupported hybrid/manual inputs behave consistently across schema validation and server match creation.
- [x] #4 Generated API/schema artifacts and tests reflect the exact same accepted parameter surface.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the reduced create-match parameter input shape in shared with a partial canonical contract plus a shared normalization helper that merges onto DEFAULT_MATCH_PARAMS and validates through MatchParametersSchema.
2. Extend MatchParametersSchema validation to enforce the card-scarcity invariant and full strict-mode parity, including initiative and pass-rule fields.
3. Remove server-local handwritten match-param resolution in server/src/match.ts and use the shared normalization path for initialization and lifecycle payloads.
4. Replace the internal route’s reduced matchParams schema with the shared partial canonical schema so REST/internal surfaces accept the same parameter contract.
5. Update engine state initialization to preserve the resolved canonical match params in GameState.params instead of reconstructing hardcoded defaults.
6. Add or update shared and server tests for scarcity rejection, strict parity coverage, preserved non-default canonical params, and internal-route/OpenAPI contract fallout.
7. Regenerate affected schema artifacts and run targeted verification, then broaden to repo-level checks if the targeted pass succeeds.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented shared canonical create-match normalization with full partial contract support, derived defaults, card-scarcity enforcement, and strict parity checks for initiative/pass rules.

Replaced server-local match-param resolution with the shared normalization path, widened the internal route schema to the canonical partial contract, and preserved normalized canonical params through engine initialization while keeping legacy gameOptions quickStart/classicDeployment compatibility when canonical matchParams are absent.

Verification: `rtk pnpm --filter @phalanxduel/shared exec vitest run tests/schema.test.ts tests/defaults.test.ts`; `rtk pnpm --filter @phalanxduel/shared build`; `rtk pnpm --filter @phalanxduel/engine build`; `rtk pnpm --filter @phalanxduel/engine exec vitest run tests/quick-start.test.ts tests/state-machine.test.ts tests/visibility.test.ts`; `rtk pnpm --filter @phalanxduel/server exec vitest run tests/custom-params-match.test.ts tests/internal.test.ts tests/openapi.test.ts`; `rtk pnpm --filter @phalanxduel/shared schema:gen`.

`rtk bin/check` now passes build, lint, typecheck, tests, and Go-client checks, then stops in schema/doc verification because regenerated artifacts are intentionally modified in the worktree until committed. `rtk bash scripts/ci/verify-schema.sh` fails for the same expected reason with the updated `shared/schemas/client-messages.schema.json` diff.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code updated
- [x] #2 Tests updated
- [ ] #3 Rules updated if needed
- [x] #4 Cross-surface alignment verified
<!-- DOD:END -->
