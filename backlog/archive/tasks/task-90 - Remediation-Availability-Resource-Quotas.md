---
id: TASK-90
title: 'Remediation: Availability & Resource Quotas'
status: Done
assignee: []
created_date: '2026-03-20 15:25'
updated_date: '2026-03-20 18:31'
labels:
  - security
  - hardening
milestone: m-0
dependencies: []
priority: medium
ordinal: 65000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement resource quotas to prevent intentional or accidental resource exhaustion through "room flooding" or broadcast bandwidth saturation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Maximum of 3 concurrent active matches enforced per unique IP.
- [x] #2 Spectator quota (default 50) implemented per match instance.
- [x] #3 Verified that exceeding quotas results in appropriate error codes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Implemented `MAX_ACTIVE_MATCHES_PER_IP = 3` limit in `MatchManager.createMatch`.
- Implemented `MAX_SPECTATORS_PER_MATCH = 50` quota in `MatchManager.watchMatch`.
- Refactored `app.ts` to capture and pass `clientIp` to the match manager.
- Updated `MatchInstance` to store the `creatorIp` for active session tracking.
- Verified that exceeding these quotas triggers `MATCH_LIMIT_REACHED` and `SPECTATOR_LIMIT_REACHED` errors.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [x] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [x] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [x] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [x] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [x] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [x] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->
