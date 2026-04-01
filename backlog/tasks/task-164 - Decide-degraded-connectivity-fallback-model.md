---
id: TASK-164
title: Decide degraded-connectivity fallback model
status: Planned
assignee: []
created_date: '2026-04-01 20:27'
labels: []
dependencies: []
priority: high
ordinal: 3000
---

## Description

The current transport is still effectively single-channel for live play. Before
implementing more fallback mechanics, the repo needs a clear decision on
whether production support means WebSocket-only recovery, REST+poll/SSE
degraded mode, or explicit pause/resume semantics.

## Acceptance Criteria

- [ ] #1 One fallback strategy is selected as the supported production model.
- [ ] #2 The decision explicitly addresses unstable networks, ghost
  connections, and long disconnects.
- [ ] #3 The decision states whether reconnect must survive server restarts and
  what that implies for architecture.
- [ ] #4 Follow-on implementation tasks are aligned to the chosen model.
