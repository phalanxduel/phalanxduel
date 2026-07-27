---
id: TASK-381
title: >-
  Web client: bare ?match= link for a non-participant fails with raw 'Invalid
  message format' instead of offering to join
status: To Do
assignee: []
created_date: '2026-07-26 23:07'
labels: []
dependencies: []
priority: low
type: bug
ordinal: 248800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found while live-testing a duel-cli-generated invite link against a real user (SwiftUI client) in a live match on play.phalanxduel.com.

`client/src/lobby.tsx`'s deep-link dispatcher treats a bare `matchId`/`match` URL param with no `action` as a session-resume attempt: it sends `rejoinMatch` with `playerId: state.user?.id ?? 'guest'`. For an unauthenticated user this is the literal string `'guest'`, which fails `RejoinMatchMessage`'s `playerId: z.uuid()` schema check server-side, producing a generic `matchError` / "Invalid message format" (VALIDATION_ERROR) with no indication of what went wrong or what to do next.

`docs/architecture/site-flow.md` documents an intended `lobby.join-link` screen (`renderJoinViaLink`, "accept join, or 'Start your own match instead'") for exactly this bare-`?match=` case — this appears to be either stale documentation from an earlier (possibly vanilla-JS) implementation, or a regression where that confirmation UX was dropped.

The web client's own invite-link generation (`href={`?action=join&matchId=${match.matchId}`}` at lobby.tsx:3426) correctly avoids this by always including `action=join` — so this only bites external link generators (like duel-cli's `buildPlayLink`, fixed separately this session) or anyone hand-constructing/sharing a bare `?match=<id>` URL, including the "resume my own active match" button's own href pattern if copy-pasted by a user and sent to someone else.

Immediate impact was avoided for duel-cli (its links now include `action=join`), but the underlying gap remains: any bare `?match=` link shared with someone not already a match participant currently fails ungracefully instead of offering to join.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A bare `?match=<id>` link opened by a user who is not already a participant in that match results in a clear 'join this match?' prompt (or an automatic joinMatch attempt with a friendly fallback), not a raw VALIDATION_ERROR.
- [ ] #2 docs/architecture/site-flow.md is either updated to match actual current behavior, or the documented lobby.join-link/renderJoinViaLink UX is restored.
- [ ] #3 Regression test covers: unauthenticated user opens a bare ?match= link for a match they are not part of.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
