---
id: TASK-161
title: Plan release version bump for expanded external-client surface
status: To Do
assignee: []
created_date: '2026-04-01 20:27'
labels: []
dependencies:
  - TASK-165
priority: high
ordinal: 7000
---

## Description

The repo has materially expanded its public client surface with REST
matchmaking, REST action submission, generated SDKs, and a first-class Go
client. Production release needs an explicit version-bump decision that matches
the actual compatibility impact of that work.

## Acceptance Criteria

- [ ] #1 A recommended target version is chosen for the production-readiness
  wave (`0.6.0` if additive, `1.0.0` if breaking).
- [ ] #2 The plan explicitly maps transport/client changes to MINOR vs MAJOR
  bump criteria from `docs/system/VERSIONING.md`.
- [ ] #3 The release plan names the exact artifacts that must move together:
  package versions, `SCHEMA_VERSION`, OpenAPI/AsyncAPI artifacts, SDKs, and
  client-facing docs.
- [ ] #4 The plan states which readiness tasks must complete before the bump is
  executed.
