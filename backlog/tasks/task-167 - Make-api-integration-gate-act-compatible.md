---
id: TASK-167
title: Make api-integration gate act-compatible
status: Human Review
assignee:
  - '@codex'
created_date: '2026-04-02 00:06'
updated_date: '2026-04-02 08:36'
labels: []
dependencies:
  - TASK-129
priority: high
ordinal: 2500
---

## Description

The `api-integration` GitHub Actions job is review-ready for hosted CI, but the
repo still cannot validate it cleanly under local `act`. The current workflow
starts `pnpm dev:server` in the background, and under `act` the health probe on
`127.0.0.1:3001` never succeeds. On failure, `actions/upload-artifact` also
errors because `ACTIONS_RUNTIME_TOKEN` is not available in local `act`
environments.

This task hardens the workflow so local `act` runs provide meaningful parity
without weakening the real GitHub-hosted CI behavior.

## Acceptance Criteria

- [x] #1 The `api-integration` workflow starts the server in a CI-oriented way
  that does not rely on the interactive `dev:server` wrapper.
- [x] #2 A local `act` run can reach the API playthrough step instead of
  failing at the initial server health probe.
- [x] #3 Failure handling distinguishes GitHub-hosted runs from local `act`
  runs so `actions/upload-artifact` is only used where runtime token support
  exists.
- [x] #4 The task notes document the verified local `act` behavior and any
  remaining parity limits.

## Implementation Plan

- Replace the workflow’s `pnpm dev:server` background process with an explicit
  CI bootstrap flow: bring up Postgres, run migrations, then start the server
  with a non-watch entrypoint.
- Adjust the health probe and runtime environment so the server is reachable in
  both GitHub-hosted runners and local `act`.
- Split failure-artifact handling into:
  - hosted GitHub upload via `actions/upload-artifact`
  - local `act` fallback that preserves logs on disk without requiring
    `ACTIONS_RUNTIME_TOKEN`
- Re-run the local `act` workflow job after the change and record the result.

## Implementation Notes

- Source context from
  [task-129 - Establish-Continuous-API-Integration-Testing-Gate.md](/Users/mike/github.com/phalanxduel/game/backlog/tasks/task-129%20-%20Establish-Continuous-API-Integration-Testing-Gate.md).
- Official `act` guidance used for this task:
  - the local runner can persist action artifacts with
    `--artifact-server-path ...`
  - `.actrc` is the supported place to encode stable local defaults
- Current observed failure under `act`:
  - cold install now succeeds after the `axios` lockfile fix
  - local artifact upload now works when `act` is launched with the repo `.actrc`
    defaults, which add the documented `--artifact-server-path .artifacts/act`
  - the workflow now uses a native Postgres service, builds the server package
    graph, runs migrations, and starts the built server instead of relying on
    `pnpm dev:server`
  - while fixing the workflow, two repo bugs surfaced and were corrected:
    - the built server could not resolve its custom Pino transport because
      `server/src/app.ts` hardcoded the source `.ts` path
    - `scripts/ci/check-server.sh` assumed `lsof` existed instead of checking
      the HTTP health endpoint first
  - the `api-integration` job now reaches the actual playthrough loop under
    local `act`; verified output included successful execution of multiple games
    after the `Run API integration gate` step started
  - the workflow now calls `tsx bin/qa/api-playthrough.ts` directly in CI
    instead of forwarding args through `pnpm qa:api:run`, which had inserted an
    extra `--` and broken CLI parsing

## Verification

- `rtk actionlint .github/workflows/pipeline.yml`
- `rtk pnpm --filter @phalanxduel/server... build`
- `rtk act pull_request -W .github/workflows/pipeline.yml -j api-integration -P ubuntu-latest=catthehacker/ubuntu:act-latest`
  - Verified progression under local `act`:
    - Postgres service became healthy
    - server package graph built successfully
    - migrations completed
    - built server passed the `/health` probe
    - `Run API integration gate` started and executed live API-only games
  - Artifact uploads now succeed under local `act` via `.actrc`
    `--artifact-server-path .artifacts/act`
