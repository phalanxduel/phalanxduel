---
id: TASK-165
title: 'Verify first-class client compatibility across browser, Go, and generated SDKs'
status: Planned
assignee: []
created_date: '2026-04-01 20:28'
labels: []
dependencies: []
priority: high
ordinal: 6000
---

## Description

The browser UI is the first citizen, but the Go client and generated SDKs are
part of the supported architecture now. Production readiness requires explicit
compatibility verification across those client surfaces against the same server
contracts.

## Acceptance Criteria

- [ ] #1 Browser, Go, and generated SDK client flows are mapped to the same
  server contract expectations.
- [ ] #2 Compatibility checks exist for matchmaking, join, reconnect, and
  action submission across supported client surfaces.
- [ ] #3 Known parity gaps are documented as backlog follow-ups or explicit
  release limitations.
- [ ] #4 The reference-client story is documented as part of the supported
  production architecture.
