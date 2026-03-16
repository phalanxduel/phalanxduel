---
id: TASK-18
title: Optional Player Accounts and Gamertags
status: Done
assignee: []
created_date: ''
updated_date: '2026-03-16 02:47'
labels: []
dependencies:
  - TASK-34.2
priority: medium
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ranked play, persistent identity, and player-owned history all depend on
optional accounts that do not block guest play. This task is complete: the repo
now supports registration, login, session restore, gamertag-based identity, and
WebSocket authentication tied to persistent user ids.

## Historical Outcome

Given a guest or returning player in the lobby, when they register, log in, or
refresh an authenticated session, then the client restores the player identity,
the server binds requests to a persistent user record, and the WebSocket can
upgrade the connection from guest to authenticated play.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given a new player, when they register, then the server persists a user
  record with gamertag, email, password hash, and default Elo.
- [x] #2 Given an existing player, when they log in or refresh the session, then
  the client restores the authenticated user without requiring match creation to
  fail for guests.
- [x] #3 Given an authenticated client, when the WebSocket sends `authenticate`,
  then the server binds the connection to the persistent user identity.
- [x] #4 Given a signed-in player, when the lobby renders, then the UI displays
  the formatted gamertag and sign-out flow.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- `server/src/routes/auth.ts` implements register, login, me, logout, and
  gamertag-change flows.
- `server/src/db/schema.ts` persists user accounts and gamertag metadata.
- `client/src/components/AuthPanel.tsx`, `client/src/auth.ts`, and
  `client/src/lobby.ts` implement the client-side account flows.
- `server/tests/auth.test.ts`, `server/tests/ws.test.ts`, and
  `client/tests/auth-panel.test.ts` cover the core paths.

## Verification

- `pnpm -C server test -- auth.test.ts ws.test.ts`
- `pnpm -C client test -- auth-panel.test.ts auth.test.ts connection.test.ts`
<!-- SECTION:NOTES:END -->
