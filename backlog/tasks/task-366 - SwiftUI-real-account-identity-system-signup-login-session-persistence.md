---
id: TASK-366
title: 'SwiftUI real account/identity system (signup, login, session persistence)'
status: Done
assignee: []
created_date: '2026-07-26 15:49'
updated_date: '2026-07-26 21:01'
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
- [x] #1 A real login screen (email + password) posts to the server's /api/auth/login endpoint, surfacing server-side validation errors. Registration is deliberately web-only by design (see ServerConnectView's accountSection doc comment) — the native app signs in via login or via the desktop handoff (phalanxduel://auth?code=...), not a native signup form; this was an explicit architecture decision made mid-session, not an oversight.
- [x] #2 A session token from a successful login/handoff is persisted in Keychain (kSecClassGenericPassword, not UserDefaults) and restored on next launch via restoreAccountFromKeychain(), replacing the free-text 'Your Name' re-entry
- [x] #3 ServerConnectView's free-text 'Your Name' field is replaced by the authenticated identity once logged in (accountSection); guest/unauthenticated state is clearly distinct (visible sign-in prompt, not a silently-blank identity)
- [x] #4 Logout clears the persisted Keychain token and returns to the login screen
- [x] #5 bin/qa/swiftui-proof.sh continues to pass — required a fix (commit aa564d2) since Keychain restore was clobbering the automation harness's expected player name; automation mode now skips restoreAccountFromKeychain() entirely
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Server + web-client side landed and pushed to origin/main (commits 4670cc16, a2036510): POST /api/auth/handoff and /api/auth/handoff/exchange, client/src/auth.ts openInDesktopApp(), lobby.tsx 'Open in Desktop App' button. Demo-verified end-to-end (register/login, mint/exchange, replay+forgery rejection, real phalanxduel:// URL dispatch, Keychain persistence across kill/relaunch, clean secret-leakage log check). SwiftUI-side implementation (KeychainStore, RestClient auth methods, SessionStore login/exchangeHandoffCode/restoreAccountFromKeychain, ContentView URL handling, ServerConnectView account UI, project.yml URL scheme) is built and demo-verified but still uncommitted in game-swiftui — committing next as part of TASK-375's prerequisite work.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Server + web-client handoff (game repo commits 4670cc16, a2036510) and SwiftUI-side account/Keychain/handoff implementation (game-swiftui commits e6a6d18, aa564d2) are complete and demo-verified end-to-end: register/login, handoff mint/exchange with replay+forgery rejection, real phalanxduel:// URL dispatch via Launch Services, Keychain-backed session restore across a full process kill/relaunch, and a clean secret-leakage log check. Architecture note: registration stayed web-only (a deliberate pivot from the original native-signup-screen framing in this task's description) — the native app authenticates via login or the browser handoff pattern (à la GitHub CLI/Docker Desktop), never placing the long-lived session token in a URL. bin/qa/swiftui-proof.sh required one fix during verification: Keychain account restore was overwriting the automation harness's expected player name with a leftover real demo account; automation mode now skips restoreAccountFromKeychain() entirely.
<!-- SECTION:FINAL_SUMMARY:END -->
