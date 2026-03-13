---
id: TASK-3
title: Replay Verification Endpoints
status: Done
assignee: []
created_date: '2026-03-12 01:31'
updated_date: '2026-03-13 14:50'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Support and dispute workflows need a deterministic way to inspect persisted
matches and verify that replaying the recorded action history still produces the
same outcome. This task is complete: the server now exposes replay-focused
endpoints for both admin inspection and machine-readable verification.

## Historical Outcome

Given a stored match, when an operator requests replay data or verification,
then the server can either replay the match for admin inspection or return a
verification result that includes replay validity and the final state hash.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given an authenticated admin request, when `/matches/:matchId/replay` is
  called, then the server replays the stored action history and returns the
  replay result.
- [x] #2 Given a match id, when `/api/matches/:matchId/verify` is called, then the
  server returns whether replay succeeded plus the computed final state hash.
- [x] #3 Given an unknown match id, when either verification endpoint is called,
  then the server returns a not-found response instead of a silent failure.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- `server/src/app.ts` serves the admin replay route.
- `server/src/routes/stats.ts` serves the verification JSON endpoint.
- `engine/src/replay.ts` is the canonical replay engine used by both flows.
- `server/tests/replay.test.ts` covers replay-route behavior.

## Verification

- `pnpm -C server test -- replay.test.ts`
<!-- SECTION:NOTES:END -->
