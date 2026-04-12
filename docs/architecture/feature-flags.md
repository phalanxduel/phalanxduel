---
title: "Feature Flags & Admin"
description: "Runtime flags, experiment controls, admin authentication, and rollout procedures for Phalanx Duel."
status: active
updated: "2026-03-14"
audience: agent
authoritative_source: "server/src/abTests.ts, client/src/ab.ts"
related:
  - docs/reference/dod.md
---

# Feature Flags & Admin

Canonical reference for runtime flags, experiment controls, and admin operations.

## Active Flags

| Surface | Flag / Param | Type | Default | Purpose |
|---|---|---|---|---|
| Client | `VITE_PREACT_LOBBY` | release flag (`0` or `1`) | unset / off | Force-enable Preact lobby renderer. |
| Client URL | `?preactLobby=1` | local override | absent / off | Ad-hoc enable Preact lobby for manual QA. |
| Client | `VITE_AB_LOBBY_PREACT_PERCENT` | experiment control (`0..100`) | `0` | Percentage of users assigned to `preact` in `lobby_framework` experiment. |
| Server | `PHALANX_AB_TESTS_JSON` | experiment catalog JSON | unset | Normalized and shown in `/admin` + `/admin/ab-tests`. |
| Server | `PHALANX_ENABLE_DEBUG_ERROR_ROUTE` | ops toggle (`'1'`) | off | Enables `/debug/error` outside dev/test. |
| Server | `PHALANX_ADMIN_USER` / `PHALANX_ADMIN_PASSWORD` | admin credential config | fallback in dev/test only | Credentials for `/admin` and related protected routes. |

## Admin Authentication

Admin routes (`/admin`, `/admin/ab-tests`, replay validation routes) use HTTP Basic Auth.

Credential resolution order:

1. `PHALANX_ADMIN_USER` + `PHALANX_ADMIN_PASSWORD` from environment.
2. Fallback to `phalanx` / `phalanx` only when `NODE_ENV` is `development` or `test`.
3. In production-like environments, no fallback exists.

## Lobby Framework Decision Logic

The lobby uses Preact when all of the following are true:

1. Request is not in special lobby mode (`?match=...` or `?watch=...`), and
2. At least one enablement source is true:
   - `VITE_PREACT_LOBBY === '1'`, or
   - `?preactLobby=1`, or
   - experiment assignment variant is `preact`.

## Experiment Assignment (lobby_framework)

Current experiment: `lobby_framework` (`control` vs `preact`).

- Visitor id from `localStorage['phalanx_visitor_id']` (created if missing).
- Deterministic hash bucket in `[0..99]`; user assigned to `preact` when `bucket < VITE_AB_LOBBY_PREACT_PERCENT`.
- Assignment is sticky per visitor id; invalid or unset percent behaves as `0`.

## Server Experiment Config (`PHALANX_AB_TESTS_JSON`)

Expected value: JSON array of experiment definitions.

```json
[
  {
    "id": "lobby_framework",
    "description": "Preact lobby rollout",
    "variants": {
      "control": 90,
      "preact": 10
    }
  }
]
```

`variants` may be object map (`{ "control": 90, "preact": 10 }`) or array (`[{ "name": "control", "ratio": 90 }, ...]`).

Validation: `id` must be non-empty, `variants` must be non-empty, ratios must be finite and non-negative. Duplicate ids are ignored after first (warning emitted). Non-100 totals emit warnings.

`GET /admin/ab-tests` (basic auth) returns normalized tests + warnings. `/admin` dashboard fetches this endpoint.

## Telemetry Events (lobby_framework)

The client emits `client.event` counters with `event` attribute.

- `lobby_framework_exposure` — `variant`, `preact_enabled`, `preact_percent`
- `lobby_create_match_click` — `variant`, `opponent`, `damage_mode`, `starting_lp`, `rows`, `columns`
- `lobby_join_match_click` — `variant`, `match_id_present`
- `lobby_watch_match_click` — `variant`, `match_id_present`
- `lobby_join_link_accept_click` — `variant`, `match_id_present`

## Rollout Progression

Increment `VITE_AB_LOBBY_PREACT_PERCENT`: `0 → 10 → 25 → 50 → 100`.

At each step verify: no material increase in lobby error signals, no material drop in create/join/watch intent rates, no support incidents tied to lobby interactions.

Rollback: set to prior stable value. For immediate mitigation, set `VITE_PREACT_LOBBY=0`. Record incident before re-attempting promotion.

## Validation

- `pnpm flags:check` validates `VITE_AB_LOBBY_PREACT_PERCENT` (must be integer `0..100` when set).
- `pnpm verify:quick` and `pnpm verify:all` include `flags:check`.
