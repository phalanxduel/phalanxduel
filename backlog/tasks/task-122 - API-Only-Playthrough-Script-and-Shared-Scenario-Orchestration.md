---
id: TASK-122
title: API-Only Playthrough Script and Shared Scenario Orchestration
status: Human Review
assignee: ['@antigravity']
created_date: '2026-03-30 09:24'
updated_date: '2026-03-30 14:32'
labels:
  - qa
  - api
  - testing
milestone: 'Decoupled gameplay via API automation'
dependencies: []
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The existing QA playthrough tooling (`bin/qa/simulate-headless.ts`, `bin/qa/simulate-ui.ts`) drives gameplay exclusively through the Playwright browser automation layer. This means API completeness is only validated indirectly — if the UI happens to call an endpoint, it gets tested; if it doesn't, the gap is invisible.

This task creates a pure API-driven playthrough script that exercises the full game lifecycle (match creation → deployment → attack/pass → reinforcement → draw → victory/forfeit) using only the exposed HTTP and WebSocket APIs — no browser, no DOM, no UI. This script becomes the authoritative proof that the server API contract is complete and sufficient for any client implementation.

Additionally, both the API script and the existing UI-driven playthrough should be orchestratable from a shared scenario definition, so the same gameplay sequence can be validated in both environments and their outcomes compared.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A `bin/qa/api-playthrough.ts` (or similar) script exists that drives a full game lifecycle using only WebSocket messages (or HTTP + WebSocket). No Playwright, no browser. Connects two "players" as WS clients, sends `createMatch` → `joinMatch` → `deploy` → `attack`/`pass` → `reinforce` → game completion. Validates server responses at each step against the shared schema types.
- [ ] #2 The script supports the same configuration surface as the existing headless playthrough: `--seed`, `--damage-modes`, `--starting-lps`, `--batch`, `--max-turns`, `--p1`/`--p2` (bot strategies).
- [ ] #3 A shared scenario format exists (JSON, TS module, or similar) that defines a reproducible sequence of actions. Both the API script and the existing UI playthrough can consume the same scenario and execute it in their respective environments.
- [ ] #4 A `pnpm qa:api:run` script (and `pnpm qa:api:matrix` for matrix runs) is registered in `package.json`.
- [ ] #5 Running `pnpm qa:api:run` against a live local server completes a full game to victory or forfeit, and the run log confirms every phase transition was exercised.
- [ ] #6 The script detects API gaps: if a required game action cannot be expressed through the exposed API, the script fails with a clear error identifying the missing capability.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. **Scenario format** — Define a `GameScenario` type (TS module in `shared/` or `bin/qa/`) that describes a sequence of player actions with expected phase transitions. Include a `fromSeed` factory that generates a scenario by running the engine with bot strategies.
2. **API playthrough script** — Create `bin/qa/api-playthrough.ts`:
   - Connect two `ws` clients to the server
   - Send `createMatch` (P1) → `joinMatch` (P2)
   - Read `gameViewModel` to get initial state and valid actions
   - Loop: pick action from scenario (or bot strategy), send `action` message, validate `gameState` response
   - Track phase transitions, validate against expected lifecycle
   - On game over: verify `outcome` is present in final state
   - Output: structured JSON run manifest (same format as `simulate-headless.ts`)
3. **Shared orchestration** — Add a `--scenario` flag to both the API script and a thin adapter for `simulate-headless.ts` so the same scenario file drives both environments.
4. **pnpm scripts** — Register `qa:api:run`, `qa:api:matrix` in `package.json`.
5. **Verification** — Run both `pnpm qa:api:run` and `pnpm qa:playthrough:run` with the same seed and compare the action sequences and final state hashes.
<!-- SECTION:PLAN:END -->

## Verification

- `pnpm qa:api:run` completes a full game against a local server
- `pnpm qa:api:run --batch 5` runs 5 games with different seeds, all complete
- `pnpm qa:api:matrix` runs the damage-mode × starting-LP matrix
- Same seed produces identical final state hash in API and UI playthroughs
- `verify-playthrough-anomalies.ts` can consume API playthrough output
