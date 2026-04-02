---
id: TASK-167
title: Make api-integration gate act-compatible
status: In Progress
assignee:
  - '@codex'
created_date: '2026-04-02 00:06'
updated_date: '2026-04-02 00:09'
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

- [ ] #1 The `api-integration` workflow starts the server in a CI-oriented way
  that does not rely on the interactive `dev:server` wrapper.
- [ ] #2 A local `act` run can reach the API playthrough step instead of
  failing at the initial server health probe.
- [ ] #3 Failure handling distinguishes GitHub-hosted runs from local `act`
  runs so `actions/upload-artifact` is only used where runtime token support
  exists.
- [ ] #4 The task notes document the verified local `act` behavior and any
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
- Current observed failure under `act`:
  - cold install now succeeds after the `axios` lockfile fix
  - the server never becomes healthy on `127.0.0.1:3001`
  - failure artifact upload errors because `ACTIONS_RUNTIME_TOKEN` is missing

## Verification

- Pending implementation.
