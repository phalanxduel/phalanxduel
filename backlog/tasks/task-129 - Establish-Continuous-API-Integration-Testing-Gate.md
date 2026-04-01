---
id: TASK-129
title: Establish Continuous API Integration Testing Gate
status: In Progress
assignee:
  - '@codex'
created_date: '2026-03-30 19:54'
updated_date: '2026-04-01 18:27'
labels: []
dependencies:
  - TASK-163
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Transition API testing from a manual 'smoke test' to a continuous verification gate. This ensures that changes to the server (like middleware or database logic) never break the core game loop.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 Add a --continuous or --until-failure flag to bin/qa/api-playthrough.ts.
- [ ] #2 #2 Configure a CI job (GitHub Action) that runs 100 random games against a spawned dev server on every PR.
- [ ] #3 #3 Ensure logs and traces are archived as artifacts on failure.
<!-- AC:END -->

## Implementation Plan

- Extend `bin/qa/api-playthrough.ts` with a bounded continuous mode that can
  run until failure or until a configured run cap is reached.
- Add a dedicated pipeline job that boots the local server, runs 100 API-only
  random games on pull requests, and uploads playthrough/server artifacts when
  the gate fails.
- Record the verification trail in this task once the CLI mode and workflow
  both pass.

## Implementation Notes

- Linked the production-readiness chain under `TASK-163` so the gate now blocks
  the degraded-connectivity, restart-safe reconnect, auth-boundary, client
  compatibility, and release-version tasks in order.
- Added `--max-runs`, `--continuous`, and `--until-failure` support to
  `bin/qa/api-playthrough.ts` so the runner can operate as a bounded CI gate
  instead of only as a one-off smoke test.
- Added a dedicated `api-integration` GitHub Actions job in
  `.github/workflows/pipeline.yml` that boots the dev server, waits for
  `/health`, runs 100 API-only games, and uploads logs/artifacts on failure.
- Fixed a contract regression in the QA runner: reliable WebSocket messages now
  attach a generated `msgId` before telemetry wrapping so the runner stays valid
  after the hardened WS protocol began requiring `msgId` for reliable client
  messages.

## Verification

- `rtk pnpm exec tsx bin/qa/api-playthrough.ts --help`
- `rtk pnpm exec prettier --check .github/workflows/pipeline.yml package.json bin/qa/api-playthrough.ts`
- `rtk pnpm exec tsx bin/qa/api-playthrough.ts --base-url ws://127.0.0.1:3101/ws --until-failure --max-runs 5 --out-dir artifacts/playthrough-api-task129-smoke`
  - Before the `msgId` fix, this failed immediately because `createMatch` was
    rejected by the server schema as an invalid reliable client message.
  - After the fix, this passed `5/5` runs on an isolated local dev server and
    exercised all required turn lifecycle phases.

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
