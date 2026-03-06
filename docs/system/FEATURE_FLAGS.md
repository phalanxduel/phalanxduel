# Feature Flags & A/B Experiments

This document is the canonical reference for runtime flags and experiment
controls in Phalanx Duel.

## Why this exists

We use runtime flags to:

- safely roll out UI/platform changes,
- force known-good behavior during incidents,
- run deterministic A/B experiments,
- expose operational diagnostics only when explicitly enabled.

## Taxonomy

### 1) Release Flags (force behavior)

Release flags deterministically enable/disable behavior for all users in a
runtime environment.

### 2) Experiment Flags (traffic split)

Experiment flags assign users to variants via deterministic bucketing, then
record exposure + funnel metrics.

### 3) Operational Toggles (debug/ops)

Operational toggles gate debugging routes and admin behavior.

## Active Flags

| Surface | Flag / Param | Type | Default | Purpose |
|---|---|---|---|---|
| Client | `VITE_PREACT_LOBBY` | release flag (`0` or `1`) | unset / off | Force-enable Preact lobby renderer. |
| Client URL | `?preactLobby=1` | local override | absent / off | Ad-hoc enable Preact lobby for manual QA. |
| Client | `VITE_AB_LOBBY_PREACT_PERCENT` | experiment control (`0..100`) | `0` | Percentage of users assigned to `preact` in `lobby_framework` experiment. |
| Server | `PHALANX_AB_TESTS_JSON` | experiment catalog JSON | unset | Normalized and shown in `/admin` + `/admin/ab-tests`. |
| Server | `PHALANX_ENABLE_DEBUG_ERROR_ROUTE` | ops toggle (`'1'`) | off | Enables `/debug/error` outside dev/test. |
| Server | `PHALANX_ADMIN_USER` / `PHALANX_ADMIN_PASSWORD` | admin credential config | fallback in dev/test only | Credentials for `/admin` and related protected routes. |

## Lobby framework decision logic

The lobby uses Preact when all of the following are true:

1. Request is not in special lobby mode (`?match=...` or `?watch=...`), and
2. At least one enablement source is true:
   - `VITE_PREACT_LOBBY === '1'`, or
   - `?preactLobby=1`, or
   - experiment assignment variant is `preact`.

This provides:

- explicit force-on controls for QA/incident response,
- deterministic experiment assignment for rollout,
- guardrail to keep join/watch flows on stable path.

## Experiment assignment details

Current experiment: `lobby_framework` (`control` vs `preact`).

Assignment behavior:

- visitor id from `localStorage['phalanx_visitor_id']` (created if missing),
- deterministic hash bucket in `[0..99]`,
- user assigned to `preact` when `bucket < VITE_AB_LOBBY_PREACT_PERCENT`.

Notes:

- assignment is sticky for a visitor id,
- percent is clamped to `0..100`,
- invalid or unset percent behaves as `0`.

## Server experiment config contract (`PHALANX_AB_TESTS_JSON`)

Expected value: JSON array of experiment definitions.

Example:

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

`variants` can be either:

- map format: `{ "control": 90, "preact": 10 }`
- array format: `[{ "name": "control", "ratio": 90 }, ...]`

Validation/normalization rules:

- `id` must be non-empty,
- `variants` must be non-empty,
- ratios must be finite and non-negative,
- duplicate experiment ids are ignored after first instance (warning emitted),
- totals not equal to 100 are accepted but emit warnings.

## Admin visibility

- `/admin` (HTML) fetches `/admin/ab-tests` and renders:
  - configured experiments,
  - variant ratios,
  - total ratio badge,
  - parser warnings.
- `/admin/ab-tests` (JSON, basic auth protected) is the machine-readable source.

## Telemetry events for lobby experiment

The client emits `client.event` counters with `event` attribute.

### Exposure

- `lobby_framework_exposure`
  - `variant`: `control | preact`
  - `preact_enabled`: boolean
  - `preact_percent`: number

### Funnel intents

- `lobby_create_match_click`
  - `variant`, `opponent`, `damage_mode`, `starting_lp`, `rows`, `columns`
- `lobby_join_match_click`
  - `variant`, `match_id_present`
- `lobby_watch_match_click`
  - `variant`, `match_id_present`
- `lobby_join_link_accept_click`
  - `variant`, `match_id_present`

## Recommended rollout progression

Suggested progression for `VITE_AB_LOBBY_PREACT_PERCENT`:

- `0 → 10 → 25 → 50 → 100`

At each step, verify:

- no material increase in lobby error signals,
- no material drop in create/join/watch intent rates,
- no increase in support incidents tied to lobby interactions.

If a regression is detected, set rollout back to prior stable percentage or use
`VITE_PREACT_LOBBY=0` in the affected environment.
