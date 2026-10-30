---
id: TASK-46
title: TASK-46 - Document missing HTTP API routes in SITE_FLOW.md
status: Done
assignee:
  - '@claude'
created_date: '2026-03-16 02:26'
updated_date: '2026-03-16 02:47'
labels: []
dependencies: []
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SITE_FLOW.md covers the game-loop surface (matches, WebSocket, admin) but omits the entire auth subsystem and the stats endpoint. Any agent or human reasoning about the full HTTP API surface of the server gets an incomplete picture. This task closes that documentation gap.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 SITE_FLOW.md URL table includes all auth routes (register, login, me, gamertag, profile, logout) and the stats route
- [x] #2 Each new entry lists the HTTP method, path, and a one-line purpose description consistent with the existing table style
- [x] #3 No routes present in server/src/routes/ are omitted from SITE_FLOW.md after this change
- [x] #4 pnpm lint passes with no new markdown lint errors
<!-- AC:END -->

## Definition of Done
--------------------------------------------------
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit all route files under `server/src/routes/` and `server/src/app.ts` to produce a complete route inventory.
2. Diff the inventory against the existing URL table in `docs/architecture/site-flow.md`.
3. Add a new "Auth & Stats" subsection to the URL table covering the eight missing routes:
   - `POST /api/auth/register`
   - `POST /api/auth/login`
   - `GET  /api/auth/me`
   - `POST /api/auth/gamertag`
   - `POST /api/auth/profile`
   - `POST /api/auth/logout`
   - `GET  /api/stats`
   - `GET  /api/matches/:matchId/verify`
4. Run `pnpm lint` to confirm no markdown lint regressions.
5. Commit task file + doc update together and push.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Audited `server/src/routes/auth.ts`, `server/src/routes/stats.ts`, `server/src/routes/matches.ts`, and `server/src/app.ts`. Found eight routes absent from the URL table:

- Six auth routes (`/api/auth/{register,login,me,gamertag,profile,logout}`) — all in `routes/auth.ts`.
- `GET /api/stats` — in `routes/stats.ts`, open (no auth).
- `GET /api/matches/:matchId/verify` — also in `routes/stats.ts`; differs from the admin-auth-protected `/matches/:matchId/replay` in `app.ts`. Both call `replayGame` but serve different audiences.

Added all eight as new rows in the `SITE_FLOW.md` URL table, below the existing WebSocket entry.

## Verification

- `pnpm lint` passed with no new errors after the doc change.
- Cross-checked every `fastify.get/post` call across all route files; all paths now appear in SITE_FLOW.md.
<!-- SECTION:NOTES:END -->
