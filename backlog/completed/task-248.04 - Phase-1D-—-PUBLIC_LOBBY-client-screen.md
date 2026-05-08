---
id: TASK-248.04
title: Phase 1D — PUBLIC_LOBBY client screen
status: Done
assignee:
  - '@codex'
created_date: '2026-04-29 02:06'
updated_date: '2026-04-30 22:24'
labels:
  - phase-1
  - client
  - ui
dependencies:
  - TASK-248.02
  - TASK-248.03
references:
  - client/src/state.ts
  - client/src/lobby.tsx
  - client/src/ux-derivations.ts
  - server/src/routes/matchmaking.ts
parent_task_id: TASK-248
priority: high
ordinal: 123000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add the PUBLIC_LOBBY screen to the client. This is the main discovery surface where a player can browse open matches posted by other players, see the creator's rating and stats, and join one.

## Screen structure

Add `'public_lobby'` to the `AppScreen` union in `client/src/state.ts`. Wire a nav entry / button from the main lobby to reach it.

### Match list (open/expiring section)

Each card shows:
- Initiating player name (clickable → public profile route)
- ELO rating + Glicko rating (with RD indicator — grey if RD > 100)
- W / L / Abandon counts
- Matches created, successful starts (displayed as "X of Y started")
- Created-at timestamp
- Freshness badge: `FRESH` (green) when >15 min, `EXPIRING` (amber) when 0–15 min
- Countdown timer (MM:SS) derived from `expiresAt`
- JOIN button (disabled if `joinable: false`)

### Recently-expired section (bottom)

Greyed-out cards fetched via `?includeRecentlyExpired=true`. Show "EXPIRED" badge and no join button. Label the section "Recently expired — unable to join".

### Refresh

Poll `GET /api/lobby/matches?includeRecentlyExpired=true` every 30 seconds, or on user focus. Show a manual refresh button.

## Key files

- `client/src/state.ts` — add `'public_lobby'` screen, lobby match list state slice
- `client/src/lobby.tsx` — PUBLIC_LOBBY screen render, match card component, join handler
- `client/src/ux-derivations.ts` — freshness / countdown derivations if needed
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 PUBLIC_LOBBY screen is reachable from the main lobby
- [x] #2 Each open/expiring match card shows player name, ELO, Glicko, W/L/abandons, matches created/started, created-at, freshness badge, countdown, and JOIN button
- [x] #3 FRESH badge shown for >15 min remaining, EXPIRING badge for 0-15 min
- [x] #4 Countdown counts down live using expiresAt
- [x] #5 Clicking player name navigates to that player's public profile
- [x] #6 JOIN button is disabled when joinable: false (rating gate, own match, etc.)
- [x] #7 Recently-expired section shows greyed cards with EXPIRED badge and no join button
- [x] #8 List refreshes every 30 seconds
- [x] #9 pnpm check passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
2026-04-30 implementation plan: add `public_lobby` to the client screen union and URL handling, repurpose the main lobby `PUBLIC_LOBBY` control as navigation to the discovery screen, fetch `/api/matches/lobby?includeRecentlyExpired=true`, poll every 30 seconds plus window focus, render open/expiring and recently-expired cards with creator stats/rating/freshness/countdown, wire creator-name profile navigation, and reuse the existing WebSocket `joinMatch` path with disabled handling for non-joinable matches. Verification target: client typecheck/tests and full `rtk pnpm check` before Human Review. Playability gate already passed immediately before this UI work with `rtk pnpm qa:playthrough:verify` 12/12 and zero warnings/errors.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-30 implementation: added `public_lobby` to the client screen union/URL handling and repurposed the main lobby `PUBLIC_LOBBY` control as navigation to the dedicated discovery screen. The screen fetches `/api/matches/lobby?includeRecentlyExpired=true`, refreshes on manual click, window focus, and every 30 seconds, and keeps countdowns live with a 1-second local timer. Match cards show creator profile link, ELO, Glicko/RD with low-confidence indicator, W/L/abandon counts, successful starts of matches created, exact created-at timestamp, FRESH/EXPIRING/EXPIRED badge, countdown, and disabled JOIN state with reason. Recently expired matches render in a greyed section with EXPIRED badge and no join button. Added `createdAt` to the lobby API response and updated the OpenAPI snapshot so the UI does not infer timestamps from age seconds.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
TASK-248.04 is ready for Human Review. The client now has a dedicated `public_lobby` screen reachable from the main lobby and URL `?screen=public_lobby`. It loads public matches with recently expired entries included, refreshes manually, on focus, and every 30 seconds, and renders open/expiring and recently-expired sections. Cards include creator profile navigation, ELO, Glicko/RD, W/L/abandons, successful starts of matches created, exact created-at timestamp, live countdown, FRESH/EXPIRING/EXPIRED badges, and JOIN disabled behavior for non-joinable rows. The lobby API now includes `createdAt`; OpenAPI snapshot was updated for that intentional contract addition.

Verification: playability gate before UI work `rtk pnpm qa:playthrough:verify` passed 12/12 with zero warnings/errors. Focused checks passed: client typecheck, server typecheck, client tests 189/189, matchmaking route tests 12/12, OpenAPI snapshot test after update. Final `rtk pnpm check` passed full verification: lint, typecheck, all tests (shared 107, engine 210, admin 4, client 189, server 304), Go client checks, schema/docs/rules checks, replay verify, playthrough verify, markdown lint, and formatting.
<!-- SECTION:FINAL_SUMMARY:END -->
