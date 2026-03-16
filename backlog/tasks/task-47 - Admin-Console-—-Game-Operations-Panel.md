---
id: TASK-47
title: Admin Console — Game Operations Panel
status: In Progress
assignee:
  - '@claude'
created_date: '2026-03-16 04:19'
updated_date: '2026-03-16 04:19'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A standalone game operations console that centralises all the controls,
views, and reports needed to reason with production data. Replaces the
current pattern of context-switching across multiple tools (WS client,
Neon console, curl, etc.).

### Architectural decisions (from design session 2026-03-16)

- **Deployment model:** Standalone service — a new `admin/` pnpm workspace
  package alongside `server/` and `client/`. Separate Fly.io app, same Neon
  DB (dedicated connection pool). Zero coupling to the game server at
  runtime.
- **Access model:** Read + targeted writes. Browse and inspect all entities
  by default; specific write actions (Elo adjustment, password reset, match
  cancellation) are explicit, labelled operations — not CRUD forms.
- **Auth:** Reuses game JWT (shared secret). Admin flag checked against the
  `users` table at login. No separate admin user store.
- **Stack:** Fastify API (`/admin-api/` prefix) + Preact SPA (Vite). Shares
  `@phalanxduel/shared` types and Zod schemas. Same toolchain as the rest of
  the monorepo (pnpm, Vitest, ESLint, Prettier, Drizzle ORM).
- **Reports:** Pre-defined queries rendered with the SQL visible and
  copy-able so the operator can paste directly into Neon console or psql for
  further analysis.

### Package structure

```text
admin/
  src/
    server/           ← Fastify API (admin-api routes, auth middleware)
      routes/         ← matches.ts, users.ts, reports.ts
      index.ts
    client/           ← Preact SPA
      pages/          ← Dashboard, MatchDetail, UserDetail, Reports, MatchCreator
      components/     ← DataTable, SqlBlock, StatBadge, …
      main.tsx
  vite.config.ts
  tsconfig.json
  package.json        ← depends on @phalanxduel/shared, drizzle-orm, fastify
```

### Primary views (starter scope)

1. **Dashboard** — live match grid + last N completed games
2. **Match creator** — full-parameter form covering every option available
   at match creation (game options, bot strategy, match params, RNG seed)
3. **Match detail** — state snapshot, transaction log, event log, turnHash
   integrity badge
4. **User list / User detail** — gamertag, Elo, match history, password
   reset action
5. **Reports** — pre-built queries with visible rendered SQL
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

- Given the admin package exists, when built, then it produces a standalone
  Fastify server and Vite SPA with no runtime dependency on the game server.
- Given a user with `isAdmin: true` on their DB row, when they log in with
  their game credentials, then they gain access to the admin console.
- Given the Dashboard is loaded, when matches are active, then they appear
  in a live grid alongside the last N completed games.
- Given the Match Creator form is submitted with valid parameters, then a
  new match is created (via direct DB insert or game-server WS) and appears
  in the dashboard.
- Given a Match detail page is opened, then the transaction log entries
  display `turnHash` with an integrity status indicator.
- Given a Report page is opened, then the rendered SQL is visible and
  copy-able alongside the result set.
- Given a User detail page is opened, then a password reset action is
  available and leaves an audit trail.

## Implementation Plan

> Spec in progress — see `docs/superpowers/specs/` once design session
> completes. Implementation plan will be added after spec review.
