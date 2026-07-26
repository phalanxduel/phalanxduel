---
id: TASK-366
title: 'SwiftUI real account/identity system (signup, login, session persistence)'
status: To Do
assignee: []
created_date: '2026-07-26 15:49'
labels:
  - swiftui
  - app-store-readiness
  - auth
dependencies: []
references:
  - 'game-swiftui:PhalanxDuelClient/UI/ServerConnectView.swift'
  - 'game-swiftui:PhalanxDuelClient/Domain/Messages.swift'
  - 'game-swiftui:PhalanxDuelClient/GameState/SessionStore.swift'
  - server/src/routes/auth.ts
priority: high
type: feature
ordinal: 233800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The SwiftUI client has no account system at all. "Your Name" in `ServerConnectView`'s session controls is a free-text field re-typed every launch — there is zero persistence anywhere in the app (`UserDefaults`/`Keychain`/`@AppStorage` all return no hits in `PhalanxDuelClient/`). The wire protocol already defines `authenticate(token:)` (client→server) and `authenticated(user:)` (server→client) in `Messages.swift`, but `authenticate` is never constructed or sent anywhere in the client.

This is not a backend gap: `server/src/routes/auth.ts` is a full, real implementation — register, login, change-gamertag, password reset (with email via `mailer.ts`), email verification, delete-account, bcrypt password hashing, a real `UserRepository`/Drizzle-backed `users` table. The server side has existed and been covered by tests (per `server` coverage reports) this whole time; the client simply never built UI for it.

Surfaced during an App-Store-readiness research pass alongside TASK-367 through TASK-373.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 A real signup screen (gamertag + email + password) posts to the server's register endpoint and a real login screen posts to the login endpoint, both surfacing server-side validation errors
- [ ] #2 #2 A session token from a successful login/register is persisted in Keychain (not UserDefaults, since it's a credential) and restored on next launch, sending authenticate(token:) automatically instead of requiring the player to re-enter a name every session
- [ ] #3 #3 ServerConnectView's free-text 'Your Name' field is replaced by the authenticated identity once logged in; an unauthenticated/guest path (if kept) is clearly distinct from a real account, not silently indistinguishable from one
- [ ] #4 #4 Logout clears the persisted token and returns to the login/signup screen
- [ ] #5 #5 bin/qa/swiftui-proof.sh is updated if needed and continues to pass (the existing bot-match automation path must keep working, whether via a test-only bypass or a scripted login)
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
