---
id: TASK-198
title: Add adversarial server-authority test suite to CI pipeline
status: To Do
assignee:
  - '@antigravity'
created_date: '2026-04-06 15:25'
updated_date: '2026-04-30 15:37'
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
ordinal: 200
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
- [ ] #1 Wrong-player action returns UNAUTHORIZED_ACTION and does not advance game state
- [ ] #2 Out-of-phase action returns ILLEGAL_ACTION and does not advance game state
- [ ] #3 Invalid card ID returns ILLEGAL_ACTION
- [ ] #4 Malformed JSON returns PARSE_ERROR
- [ ] #5 Duplicate action with different msgId is handled safely (no state corruption)
- [ ] #6 Action submitted after match end is rejected
- [ ] #7 All adversarial tests run against a real server + Postgres in CI
- [ ] #8 CI pipeline blocks merge on adversarial test failure
- [ ] #9 New `test:adversarial` script added to package.json
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-30 audit: moved out of Human Review. Implementation evidence exists (`server/tests/adversarial.test.ts`, `server/package.json` `test:adversarial`, `.github/workflows/pipeline.yml` adversarial job), but the task is not ready as recorded: all acceptance criteria remain unchecked, and AC #7 explicitly requires real server + Postgres in CI while the current adversarial suite uses an in-memory repository and the CI `adversarial` job has no Postgres service. Needs follow-up to align tests/CI with AC or revise AC before returning to Human Review.
<!-- SECTION:NOTES:END -->
