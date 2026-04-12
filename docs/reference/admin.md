# Admin Operations

This document defines operational behavior for authenticated admin routes and
A/B experiment configuration.

For the full runtime flag and experiment playbook, see
[`docs/architecture/feature-flags.md`](docs/architecture/feature-flags.md).

## Admin Authentication

Admin routes (`/admin`, `/admin/ab-tests`, replay validation routes) use HTTP
Basic Auth.

Credential resolution order:

1. `PHALANX_ADMIN_USER` + `PHALANX_ADMIN_PASSWORD` from environment.
2. Fallback to `phalanx` / `phalanx` only when `NODE_ENV` is `development` or
   `test`.
3. In production-like environments, no fallback exists.

## A/B Configuration Contract

### Server source of truth

A/B tests are configured via `PHALANX_AB_TESTS_JSON`.

Expected shape: JSON array.

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

`variants` may be either:

- object map (`{ "control": 90, "preact": 10 }`), or
- array (`[{ "name": "control", "ratio": 90 }, ...]`).

Validation rules:

- `id` must be non-empty.
- `variants` must be non-empty.
- ratios must be finite and non-negative.
- duplicate `id` entries are ignored after first occurrence, with a warning.
- total ratio is not forced to 100, but non-100 totals emit warnings.

### Admin visibility

`GET /admin/ab-tests` returns normalized tests + warnings:

```json
{
  "tests": [
    {
      "id": "lobby_framework",
      "description": "Preact lobby rollout",
      "variants": [
        { "name": "control", "ratio": 90 },
        { "name": "preact", "ratio": 10 }
      ],
      "totalRatio": 100
    }
  ],
  "warnings": []
}
```

`/admin` dashboard renders A/B status by fetching this endpoint.

## Client Rollout Knob

Client-side lobby assignment supports this environment variable:

- `VITE_AB_LOBBY_PREACT_PERCENT` (0..100)

Behavior:

- Bucketing is deterministic per visitor id.
- `0` means all `control`.
- `100` means all `preact`.
- values outside range are clamped.
