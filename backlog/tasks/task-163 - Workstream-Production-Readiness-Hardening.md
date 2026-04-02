---
id: TASK-163
title: 'Workstream: Production Readiness Hardening'
status: Human Review
assignee:
  - '@codex'
created_date: '2026-04-01 20:27'
labels: []
dependencies: []
priority: high
ordinal: 1000
updated_date: '2026-04-01 23:34'
---

## Description

Coordinator workstream for the remaining production-readiness gaps after the
external-client expansion. Focus areas are transport resilience, restart-safe
recovery, compatibility gates, auth/trust boundaries, and release/version
control.

## Acceptance Criteria

- [x] #1 A ranked production-readiness queue exists and is reflected in the
  backlog.
- [x] #2 Degraded connectivity, restart survivability, contract gating, auth
  boundaries, and release versioning each have an executable child task.
- [x] #3 The workstream explicitly identifies which items block a
  production-ready release.

## Implementation Notes

- Established the ordered production-readiness chain under this workstream:
  `TASK-129 -> TASK-164 -> TASK-160 -> TASK-162 -> TASK-165 -> TASK-161 ->
  TASK-49 -> TASK-166 -> TASK-94`.
- `TASK-129` is now review-ready with the API integration gate implemented and
  verified from the repo side.
- Release blockers for a production-ready release are currently:
  - `TASK-164` degraded-connectivity fallback decision
  - `TASK-160` restart-safe reconnect
  - `TASK-162` auth and participant-boundary audit
  - `TASK-165` first-class client compatibility verification
  - `TASK-161` release-version bump planning
- The remaining downstream tasks stay in `To Do` behind those blockers.

## Verification

- Reviewed `AGENTS.md` and the linked child backlog tasks to confirm the ranked
  queue and dependency chain are reflected in the live backlog state.
- Verified `TASK-129` moved to `Human Review` with implementation notes and
  verification evidence recorded.
