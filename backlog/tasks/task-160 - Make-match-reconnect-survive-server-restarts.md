---
id: TASK-160
title: Make match reconnect survive server restarts
status: Planned
assignee: []
created_date: '2026-04-01 20:27'
labels: []
dependencies: []
priority: high
ordinal: 4000
---

## Description

Reconnect semantics currently depend on live in-memory match/session state.
Production readiness requires recovery to survive server restarts, rolling
deploys, and process crashes during an active reconnect window.

## Acceptance Criteria

- [ ] #1 Active player reconnect succeeds after a server restart within the
  reconnect grace window.
- [ ] #2 Recovery does not require the original in-memory socket/session map to
  still exist.
- [ ] #3 Browser and Go clients can resume an active match after restart using
  the supported reconnect identity.
- [ ] #4 Automated integration coverage proves restart-safe reconnect for at
  least one live match scenario.

## Implementation Plan

- Identify which reconnect state must be made durable or derivable after a
  process restart.
- Define a transport-agnostic resume contract that works for both browser and
  external clients.
- Add restart-aware integration coverage before treating reconnect as
  production-ready.
