---
id: TASK-162
title: Audit participant identity and action authorization boundaries
status: Planned
assignee: []
created_date: '2026-04-01 20:27'
labels: []
dependencies: []
priority: high
ordinal: 5000
---

## Description

Recent REST gameplay work exposed a real boundary bug where anonymous requests
could be misidentified as a participant through shared route logic. Production
readiness needs a deliberate audit of participant identity, player ownership,
spectator boundaries, and action authorization.

## Acceptance Criteria

- [ ] #1 All match-related HTTP and WebSocket entrypoints are reviewed for
  participant identity resolution and player ownership checks.
- [ ] #2 Findings are captured as explicit fixes or accepted residual risks.
- [ ] #3 Automated tests cover the discovered trust-boundary edge cases.
- [ ] #4 The audit confirms the server remains authoritative for player
  identity across REST and WebSocket flows.
