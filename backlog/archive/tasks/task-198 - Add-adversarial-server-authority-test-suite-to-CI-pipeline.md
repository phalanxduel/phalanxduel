---
id: TASK-198
title: Add adversarial server-authority test suite to CI pipeline
status: Done
assignee:
  - '@codex'
created_date: '2026-04-06 15:25'
updated_date: '2026-04-30 19:22'
labels:
  - qa
  - server
  - ci
  - p0
  - adversarial
  - authority
dependencies: []
references:
  - 'server/src/match.ts:821-888'
  - 'server/src/app.ts:1341-1353'
  - .github/workflows/pipeline.yml
priority: high
ordinal: 124000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

The CI pipeline has zero tests that verify the server correctly rejects adversarial or malformed inputs. The `api-playthrough` tool only sends valid actions chosen from `validActions`. A regression in `assertAuthorizedPlayer`, `validateAction`, or JSON parse handling would not be caught before reaching staging.

No test currently covers:
1. Wrong player submitting an action (impersonation attempt)
2. Duplicate action submission with different msgId
3. Malformed JSON payload
4. Out-of-phase action (e.g., deploy during AttackPhase)
5. Invalid card ID in action
6. Action submitted before match start / after match end
7. Stale WebSocket action after disconnect

## Expected behavior

A dedicated adversarial test suite (WebSocket-level, real server + DB in CI) must verify that each of the above is rejected with the correct error code and does not corrupt game state.

## Implementation notes

The test should spin up a real server (same pattern as the `api-integration` CI job) and use two WebSocket clients. For each adversarial scenario, attempt the illegal action and assert the response contains the correct `matchError` code (`UNAUTHORIZED_ACTION`, `ILLEGAL_ACTION`, `PARSE_ERROR`, etc.). Assert game state is unchanged after each rejection.

Add a new `test:adversarial` script and a dedicated CI job that blocks merge on failure.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Wrong-player action returns UNAUTHORIZED_ACTION and does not advance game state
- [x] #2 Out-of-phase action returns ILLEGAL_ACTION and does not advance game state
- [x] #3 Invalid card ID returns ILLEGAL_ACTION
- [x] #4 Malformed JSON returns PARSE_ERROR
- [x] #5 Duplicate action with different msgId is handled safely (no state corruption)
- [x] #6 Action submitted after match end is rejected
- [x] #7 All adversarial tests run against a real server + Postgres in CI
- [x] #8 CI pipeline blocks merge on adversarial test failure
- [x] #9 New `test:adversarial` script added to package.json
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
2026-04-30 plan to make TASK-198 genuinely review-ready:

1. Convert `server/tests/adversarial.test.ts` from an injected in-memory `LocalMatchManager` to the default `buildApp()` path so the server uses `MatchRepository`, `PostgresLedgerStore`, and the configured `DATABASE_URL` when present.
2. Keep the tests WebSocket-level by listening on an ephemeral local port and driving real client messages over `/ws`.
3. Add test isolation for the Postgres-backed path by clearing match-related tables before/after the suite when `DATABASE_URL` is set; keep the suite able to fail loudly if CI forgot to provide a DB.
4. Add state-unchanged assertions for rejected adversarial actions by comparing `gameState` snapshots before and after each rejected message.
5. Cover all AC cases explicitly: wrong player, out-of-phase action, invalid card ID, malformed JSON, duplicate/different msgId safety, after-game-over rejection, stale/disconnected socket cleanup, CI job with Postgres, and `test:adversarial` script.
6. Update `.github/workflows/pipeline.yml` adversarial job to run with a Postgres service, `DATABASE_URL`, migration step, and `test:adversarial` as a blocking job.
7. Verify with `rtk pnpm --filter @phalanxduel/server test:adversarial` plus targeted checks; then check AC, write final summary, move to Human Review, and commit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-30 audit: moved out of Human Review. Implementation evidence exists (`server/tests/adversarial.test.ts`, `server/package.json` `test:adversarial`, `.github/workflows/pipeline.yml` adversarial job), but the task is not ready as recorded: all acceptance criteria remain unchecked, and AC #7 explicitly requires real server + Postgres in CI while the current adversarial suite uses an in-memory repository and the CI `adversarial` job has no Postgres service. Needs follow-up to align tests/CI with AC or revise AC before returning to Human Review.

2026-04-30 implementation: converted `server/tests/adversarial.test.ts` to use the default `buildApp()` path instead of injecting an in-memory `LocalMatchManager`, so CI runs the suite through the real server path with `MatchRepository`, `PostgresLedgerStore`, and `DATABASE_URL`. Added state snapshots for rejected actions to prove no state advancement/corruption. Added `REQUIRE_ADVERSARIAL_POSTGRES=1` guard for CI truthfulness. Updated `.github/workflows/pipeline.yml` adversarial job with Postgres service, `DATABASE_URL`, migration step, and made `build` depend on both `test` and `adversarial`. Verification: `rtk pnpm --filter @phalanxduel/server test:adversarial` passed 7/7; `rtk env REQUIRE_ADVERSARIAL_POSTGRES=1 pnpm --filter @phalanxduel/server test:adversarial` passed 7/7; `rtk pnpm --filter @phalanxduel/server exec tsc --noEmit` passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Made the adversarial server-authority suite review-ready and CI-truthful. `server/tests/adversarial.test.ts` now exercises the normal `buildApp()` WebSocket server path instead of an injected in-memory match manager, uses the real Postgres-backed app path whenever `DATABASE_URL` is configured, and fails fast in CI with `REQUIRE_ADVERSARIAL_POSTGRES=1` if Postgres is not available. Rejected adversarial actions now compare pre/post state snapshots to prove no state advancement or corruption. The duplicate-action case now covers same action content with a different `msgId`, which must reject cleanly after game over. `.github/workflows/pipeline.yml` now gives the adversarial job its own Postgres 17 service, runs migrations before `test:adversarial`, and makes production image build wait for both regular tests and adversarial tests.

Verification: `rtk pnpm --filter @phalanxduel/server test:adversarial` passed 7/7, `rtk env REQUIRE_ADVERSARIAL_POSTGRES=1 pnpm --filter @phalanxduel/server test:adversarial` passed 7/7, and `rtk pnpm --filter @phalanxduel/server exec tsc --noEmit` passed.
<!-- SECTION:FINAL_SUMMARY:END -->
