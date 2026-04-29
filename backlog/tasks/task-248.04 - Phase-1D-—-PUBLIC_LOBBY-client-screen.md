---
id: TASK-248.04
title: Phase 1D — PUBLIC_LOBBY client screen
status: Planned
assignee: []
created_date: '2026-04-29 02:06'
labels:
  - phase-1
  - client
  - ui
milestone: m-3
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
- [ ] #1 PUBLIC_LOBBY screen is reachable from the main lobby
- [ ] #2 Each open/expiring match card shows player name, ELO, Glicko, W/L/abandons, matches created/started, created-at, freshness badge, countdown, and JOIN button
- [ ] #3 FRESH badge shown for >15 min remaining, EXPIRING badge for 0-15 min
- [ ] #4 Countdown counts down live using expiresAt
- [ ] #5 Clicking player name navigates to that player's public profile
- [ ] #6 JOIN button is disabled when joinable: false (rating gate, own match, etc.)
- [ ] #7 Recently-expired section shows greyed cards with EXPIRED badge and no join button
- [ ] #8 List refreshes every 30 seconds
- [ ] #9 pnpm check passes
<!-- AC:END -->
