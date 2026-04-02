---
id: TASK-164
title: Decide degraded-connectivity fallback model
status: Human Review
assignee:
  - '@codex'
created_date: '2026-04-01 20:27'
updated_date: '2026-04-02 09:02'
labels: []
dependencies:
  - TASK-129
priority: high
ordinal: 3000
---

## Description

The current transport is still effectively single-channel for live play. Before
implementing more fallback mechanics, the repo needs a clear decision on
whether production support means WebSocket-only recovery, REST+poll/SSE
degraded mode, or explicit pause/resume semantics.

## Acceptance Criteria

- [x] #1 One fallback strategy is selected as the supported production model.
- [x] #2 The decision explicitly addresses unstable networks, ghost
  connections, and long disconnects.
- [x] #3 The decision states whether reconnect must survive server restarts and
  what that implies for architecture.
- [x] #4 Follow-on implementation tasks are aligned to the chosen model.

## Implementation Plan

- Convert the existing proposal in `doc-6` into one accepted architecture
  decision record under `backlog/decisions/`.
- Make the selected model explicit about both degraded-network behavior and
  restart-survivable reconnect.
- Sync downstream backlog items so the next tasks inherit a concrete direction
  rather than an open transport question.

## Implementation Notes

- Accepted
  [DEC-2B-003 - WebSocket-first degraded connectivity fallback](/Users/mike/github.com/phalanxduel/game/backlog/decisions/decision-027%20-%20DEC-2B-003%20-%20WebSocket-first%20degraded%20connectivity%20fallback.md).
- The chosen production model is:
  - WebSocket-first live play
  - HTTP action submission as degraded fallback
  - HTTP polling as the first required degraded read path
  - SSE allowed later as an optimization, not the initial requirement
- The decision explicitly rejects both:
  - WebSocket-only recovery as sufficient for production readiness
  - pause/resume as the primary degraded-connectivity answer
- Restart survivability is now mandatory: reconnect must survive rolling
  deploys and server restarts within the supported reconnect window.
- `doc-6` is now marked superseded so the repo has one canonical decision
  artifact instead of parallel active decision prose.

## Verification

- `rtk pnpm exec markdownlint-cli2 backlog/decisions/README.md "backlog/decisions/decision-027 - DEC-2B-003 - WebSocket-first degraded connectivity fallback.md" "backlog/docs/doc-6 - Degraded Connectivity Fallback Proposal.md" "backlog/tasks/task-164 - Decide-degraded-connectivity-fallback-model.md" --config .markdownlint-cli2.jsonc`
