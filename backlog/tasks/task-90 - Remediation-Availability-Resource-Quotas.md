---
id: TASK-90
title: 'Remediation: Availability & Resource Quotas'
status: Human Review
assignee: []
created_date: '2026-03-20 15:25'
updated_date: '2026-03-20 16:13'
labels:
  - security
  - hardening
milestone: m-0
dependencies: []
priority: medium
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
