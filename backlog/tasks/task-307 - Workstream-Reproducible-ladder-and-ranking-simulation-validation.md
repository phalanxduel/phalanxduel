---
id: TASK-307
title: 'Workstream: Reproducible ladder and ranking simulation validation'
status: In Progress
assignee: []
created_date: '2026-05-21 14:58'
updated_date: '2026-05-21 16:21'
labels:
  - ranked
  - ladder
  - qa
  - validation
dependencies: []
references:
  - server/src/elo.ts
  - server/src/ratings.ts
  - server/src/ladder.ts
  - server/tests/elo.test.ts
  - server/tests/ladder.test.ts
  - server/tests/ladder-routes.test.ts
  - server/tests/is-automated-leaderboard.test.ts
  - bin/qa/simulate-headless.ts
  - bin/qa/simulate-ui.ts
documentation:
  - docs/quality/ranking-ladder-validation.md
  - docs/qa/SWARM_TESTING.md
  - docs/reference/qa-runners.md
  - docs/reference/pnpm-scripts.md
modified_files:
  - bin/qa/ladder-season.ts
  - server/src/ladder-simulation.ts
  - server/tests/ladder-simulation.test.ts
  - package.json
  - docs/quality/ranking-ladder-validation.md
  - docs/reference/qa-runners.md
  - docs/reference/pnpm-scripts.md
priority: medium
ordinal: 149000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a reproducible validation path for the ladder/ranking system so rating behavior can be exercised, measured, and iterated with stable evidence instead of ad hoc manual checks.

Context:
- Ranked play is a trust surface. The repo now documents validation concerns in `docs/quality/ranking-ladder-validation.md`.
- Existing tools cover parts of the path: `bin/qa/simulate-headless.ts` for seeded gameplay corpus generation, `bin/qa/simulate-ui.ts --mini-tournament` for vertical product exercise, `server/src/elo.ts`, `server/src/ratings.ts`, `server/src/ladder.ts` for rating/ladder services, and server tests for Elo, ladder routes, and automated-match exclusion.
- The missing capability is a first-class reproducible ladder exercise: deterministic synthetic seasons, measurable reports, shadow replay, and a seedable product-level tournament path.

Structured plan to iterate:
1. Define the exercise contract: modes, inclusion/exclusion rules, scenarios, and success metrics.
2. Add a deterministic service-level season harness that can generate synthetic players, match schedules, outcomes, and a report from a fixed seed.
3. Add a small golden simulation test that protects core ladder behavior in the server test suite.
4. Add shadow replay/reporting so the same match corpus can compare current and candidate rating policies.
5. Make the existing UI mini-tournament path seedable so product-level rating updates can be reproduced.
6. Add package scripts for simulation, replay, and a lightweight verification gate.
7. Decide which parts belong in normal tests, release verification, and manual QA based on runtime and stability.

This task is the planning/workstream anchor. Implementation may be split into child tasks once the plan is reviewed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The task contains enough context for a future agent to understand why reproducible ladder validation is needed and which existing repo tools are relevant.
- [ ] #2 The plan identifies the validation layers: rating model, DB/service season simulation, shadow replay, and product-level mini tournament.
- [ ] #3 The plan identifies the expected outputs: deterministic artifacts, metrics, golden tests, and verification commands/scripts.
- [ ] #4 The plan captures that `simulate-ui.ts --mini-tournament` needs seeded pairing/randomness before it can be used as a reproducible product-level ladder exercise.
- [ ] #5 The plan captures that broad ladder simulation should not be wired into quick/CI gates until runtime and stability are known.
- [ ] #6 Follow-up implementation work can be split into child tasks from this workstream without relying on chat history.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-05-21 recommendation: The current architecture appears sufficient for a reproducible ladder/ranking simulation without significant product-system changes. Treat this primarily as QA/tooling plus small service-test hardening, not a ranking-system rewrite.

Recommended first slice: build a deterministic service-level season harness around the existing rating and ladder services. It should create synthetic players, schedules, outcomes, rating updates, ladder snapshots, and a JSON/Markdown report from a fixed seed. This gives fast, inspectable evidence before adding browser or production-like complexity.

Recommended layering: keep `server/src/elo.ts`, `server/src/ratings.ts`, and `server/src/ladder.ts` as the core unit/service validation layer; use shadow replay to compare candidate policies; use `bin/qa/simulate-ui.ts --mini-tournament` only as the product-level smoke/exercise layer after adding seeded RNG for pairing, action choice, and report/run IDs.

Likely small system-adjacent improvements: expose or reuse cleaner test helpers for inserting completed synthetic matches, improve audit/report reads for before/after ratings and ladder placement, strengthen idempotency and automated-match-exclusion tests, and clarify Elo vs derived Glicko-like terminology in docs/report output.

Avoid first: do not wire broad ladder simulation into quick CI before runtime and flake profile are known; do not start by expanding browser automation; do not change ranking math until the reproducible exercise can show the current baseline behavior.

2026-05-21 execution slice: Added the first deterministic offline ladder season exercise as `bin/qa/ladder-season.ts`, wired `pnpm qa:ladder:simulate` and `pnpm qa:ladder:verify`, and documented the runner in ranking validation plus QA/script references. Default verification seed produced ratingSkillSpearman=0.8783 and topNOverlap=0.6667.

2026-05-21 execution slice: Extracted the deterministic season model into `server/src/ladder-simulation.ts` so the CLI and tests share one implementation. Added `server/tests/ladder-simulation.test.ts` as a golden baseline for default seed metrics and top standing behavior.

2026-05-21 execution slice: Added shadow K-factor comparison for the deterministic ladder season. `pnpm qa:ladder:simulate -- --shadow-k-factors 16,32,48` now appends same-season policy comparison metrics and top-N membership to the report without changing production rating behavior.

2026-05-21 execution slice: Added `--seed` support to `bin/qa/simulate-ui.ts` so the mini-tournament product exercise can reproduce QA run IDs, tournament pairing, match option selection, forfeit rolls, and bot action choices. The report artifact now records the seed. External browser/server timing remains nondeterministic, so this is a reproducible exercise path rather than bit-for-bit replay.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
