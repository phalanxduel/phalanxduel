---
id: TASK-370
title: SwiftUI real Profile data wiring (replace hardcoded stats and loadout)
status: To Do
assignee: []
created_date: '2026-07-26 15:50'
labels:
  - swiftui
  - app-store-readiness
dependencies:
  - TASK-366
references:
  - 'game-swiftui:PhalanxDuelClient/UI/ProfileView.swift'
  - server/src/routes/profiles.ts
priority: medium
type: bug
ordinal: 237800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`ProfileView` hardcodes every stat via its own default init parameters (`elo: 1850, wins: 110, losses: 32`) and a hardcoded "Rank #1 • Diamond Tier" string and three hardcoded "EQUIPPED LOADOUT" cosmetic rows — none of it reflects the actual player, regardless of who is signed in. Only the display name (`gamertag`) is threaded through from the caller.

Backend support already exists: `server/src/routes/profiles.ts` is a real implementation. Depends on TASK-366 (a real identity to fetch a profile for) and can reuse TASK-368's purchased-entitlements state (`StoreManager.purchasedProductIDs`) for the equipped-loadout section instead of hardcoded strings.

Surfaced during an App-Store-readiness research pass alongside TASK-366 through TASK-369, TASK-371 through TASK-373.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 ProfileView fetches real career stats (ELO, wins, losses, rank) from the server's profile endpoint for the signed-in player instead of using hardcoded default parameters
- [ ] #2 #2 The equipped-loadout section reflects real owned cosmetics (from StoreManager.purchasedProductIDs / server entitlements) instead of three hardcoded rows
- [ ] #3 #3 A signed-out or new-account state is handled distinctly (zero stats, no owned cosmetics) rather than falling back to the same hardcoded 1850/110/32 numbers
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
