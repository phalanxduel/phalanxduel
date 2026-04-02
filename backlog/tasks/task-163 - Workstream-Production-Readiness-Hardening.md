---
id: TASK-163
title: 'Workstream: Production Readiness Hardening'
status: Human Review
assignee:
  - '@codex'
created_date: '2026-04-01 20:27'
updated_date: '2026-04-02 20:02'
labels: []
dependencies: []
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Coordinator workstream for the remaining production-readiness gaps after the
external-client expansion. Focus areas are transport resilience, restart-safe
recovery, compatibility gates, auth/trust boundaries, and release/version
control.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 A ranked production-readiness queue exists and is reflected in the
  backlog.
- [x] #2 #2 Degraded connectivity, restart survivability, contract gating, auth
  boundaries, and release versioning each have an executable child task.
- [x] #3 #3 The workstream explicitly identifies which items block a
  production-ready release.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
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
- Rules compliance audit on 2026-04-02 added the following upstream
  remediation chain and root checks:
  `TASK-168 -> TASK-170 -> TASK-171`, plus independent tasks `TASK-169` and
  `TASK-172`.

2026-04-02 release reprioritization: keep `TASK-160` as the active implementation slice, then pull the newly discovered critical rules/runtime gaps into the release queue ahead of the older audit/compatibility tail. Updated practical release order: `TASK-160 -> TASK-171 -> TASK-172 -> TASK-162 -> TASK-165 -> TASK-161 -> TASK-49 -> TASK-166 -> TASK-94`. `TASK-168`, `TASK-169`, and `TASK-170` remain high-signal upstream review items but are already in `Human Review` rather than the active implementation queue.

Release blockers now explicitly include the unresolved runtime/rules gaps from the 2026-04-02 audit: `TASK-171` (canonical rule modes and Special Start semantics) and `TASK-172` (event span / unrecoverable-error alignment), in addition to `TASK-160`, `TASK-162`, `TASK-165`, and `TASK-161`.
<!-- SECTION:NOTES:END -->
