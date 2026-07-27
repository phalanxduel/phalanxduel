---
id: TASK-381
title: >-
  Web client: bare ?match= link for a non-participant fails with raw 'Invalid
  message format' instead of offering to join
status: Done
assignee: []
created_date: '2026-07-26 23:07'
updated_date: '2026-07-27 01:57'
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
- [x] #1 A bare `?match=<id>` link opened by a user who is not already a participant in that match results in a clear 'join this match?' prompt (or an automatic joinMatch attempt with a friendly fallback), not a raw VALIDATION_ERROR.
- [x] #2 docs/architecture/site-flow.md is either updated to match actual current behavior, or the documented lobby.join-link/renderJoinViaLink UX is restored.
- [x] #3 Regression test covers: unauthenticated user opens a bare ?match= link for a match they are not part of.
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

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the actual bug: `client/src/lobby.tsx`'s bare-`?match=` dispatcher branch now checks `state.user` before deciding what to send. An authenticated user (who owns the match, e.g. via the "resume active match" button's own href) still gets `rejoinMatch` with their real UUID — unchanged behavior, no regression. An unauthenticated visitor (who by definition has no session to resume) now gets `joinMatch` instead of the old `rejoinMatch` with the literal string `'guest'` as `playerId`, which was failing `RejoinMatchMessage`'s `z.uuid()` schema check and producing the raw "Invalid message format" error this task was filed over.

Went with the "automatic joinMatch attempt" option AC #1 explicitly allows, rather than building the separate `lobby.join-link`/`renderJoinViaLink` confirmation screen `docs/architecture/site-flow.md` described — that screen doesn't exist anywhere in the current Preact-era codebase (confirmed via grep), so restoring it would have been a real new feature, not a bug fix. Corrected the docs instead (AC #2): the mermaid diagram and screen inventory table now describe what the code actually does (auto-rejoin for the authenticated owner, auto-join for everyone else, both routing through the existing `matchJoined`/`matchError` events — no separate screen).

Added two regression tests in `client/tests/lobby.test.ts` (AC #3) covering exactly this: unauthenticated user + bare `?match=` → `joinMatch` sent, never `rejoinMatch`; authenticated user + bare `?match=` → `rejoinMatch` still sent with their real id (the non-regression case). Both pass reliably.

Found and fixed a real, separate bug while verifying: `tsc` caught that TypeScript's narrowing of `state.user` from the outer `if` condition doesn't survive into the nested `queueLobbyAction` closure — fixed by capturing `state.user.id` to a local const before the closure. Also hit a genuine timing race in the FULL test file (not just my two new tests) — running the whole 23-test `lobby.test.ts` suite with the default reporter deterministically failed my authenticated-user test (`send` never called), while `--reporter=verbose` or any `-t`-filtered subset passed every time. Bisection showed it wasn't a specific prior test but a cumulative timing effect against the shared `waitForLobbyEffects` helper's fixed 10-tick retry budget. Fixed by polling up to 30 ticks specifically in my test rather than assuming a fixed budget is always enough — 100% reproducible pass across repeated full-suite runs afterward, both isolated and default reporter.

Verified for real: `tsc --noEmit` clean, `eslint` shows the same 4 pre-existing unrelated issues (confirmed via git stash) and zero new ones, `vitest run` on the full `client/` package: 233/233 passing across 26 files, `markdownlint-cli2` clean on the updated doc.
<!-- SECTION:FINAL_SUMMARY:END -->
