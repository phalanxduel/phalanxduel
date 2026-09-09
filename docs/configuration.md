# Configuration and Environment Management

Phalanx Duel uses environment variables for runtime configuration and a custom
DSL for managing secrets across local and production environments. Staging is
retired.

## Environment Variable Reference

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `APP_ENV` | none | Deployment environment (`production`) |
| `NODE_ENV` | `development` | Node runtime mode |
| `DATABASE_URL` | none | Postgres connection string (required for server/admin) |
| `JWT_SECRET` | none | Shared session signing key (required for server/admin in production) |
| `GAME_SERVER_INTERNAL_URL` | local game server | Private game origin (required for admin in production) |
| `ADMIN_INTERNAL_TOKEN` | none | Shared admin-to-game bearer token (required in production) |
| `PHALANX_SERVER_PORT`| `3001` | HTTP listen port |
| `PHALANX_CLIENT_PORT` | `5173` | Vite client port used by local tooling |
| `PHALANX_ADMIN_PORT` | `3102` | Admin API port |
| `PHALANX_ADMIN_UI_PORT` | `3103` | Admin Vite UI port |
| `PHALANX_POSTGRES_PORT` | `5432` | Host Postgres port used by diagnostics |
| `PHALANX_DEMO_HOST` | `localhost` | Hostname used to build local demo URLs |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://127.0.0.1:4318` | OTLP collector intake |
| `ZDOTS_APP_LOG` | none | Local-only JSONL path for match-scoped Panoramic View filelog evidence |
| `PHALANX_DEMO_JAEGER_URL` | `https://jaeger.localhost` | Local demo cockpit Jaeger Search, dependency graph, and Monitor links |
| `PHALANX_DEMO_SKIP_EMAIL_VERIFICATION` | unset | With `PHALANX_DEMO_MODE=1`, auto-verifies demo registrations; local only |

When `observability-mode lan` is enabled in zdots, point the demo cockpit and
SwiftBar at the protected reverse-proxy hostname instead of loopback services:

```bash
export PHALANX_DEMO_O2_URL=https://observability.lan.phalanxduel.com
export PHALANX_DEMO_JAEGER_URL=https://observability.lan.phalanxduel.com/jaeger
```

Keep the default `.localhost` values for `LOCAL_ONLY`. Do not configure the
collector, OpenObserve, or Jaeger ports as participant-facing URLs; game
browser telemetry continues to use `/otel/` and `/rum/` on the
`play.lan.phalanxduel.com` route.

For a full list of supported variables, see [Environment Variables Reference](./reference/environment-variables.md).

## Secret Management Flow

We use a lightweight DSL in local `.env` files to manage secrets.

### DSL Annotations
Sync tools read comment decorators immediately above each key in `.env` files:
- `# @target: ALL|RUNTIME|PIPELINE|LOCAL`
- `# @concern: GENERAL|DATABASE|OBSERVABILITY|ADMIN|AUTH|EMAIL`
- `# @description: <text>`

### Syncing Secrets
We use `pnpm env:*` commands to push configuration to Fly.io and GitHub environments.

| Command | Purpose |
| :--- | :--- |
| `pnpm env:push:production` | Push annotated production secrets to supported targets |
| `pnpm env:audit:production` | Detect production secret-name drift |
| `pnpm env:bootstrap:production` | Pull remote secret metadata into the local DSL for review |
| `pnpm env:rotate:production` | Generate new random values for reviewed local secrets |

The dedicated admin app receives only `DATABASE_URL`, `JWT_SECRET`, and
`ADMIN_INTERNAL_TOKEN`; provision these explicitly rather than copying every
game-service secret.

For development-only browser RUM, declare `VITE_PHX_RUM_TOKEN` in the local
secret DSL with `@target: LOCAL` and `@concern: OBSERVABILITY`. Let the local
environment/bootstrap tooling make it available to the Vite process; do not
read or source `.env.secrets*` manually, and never provision this token to a
production build.

The root `.env` is the first runtime layer and should provide shared safe
defaults. The committed `.env.example` provides safe host-native localhost
defaults for
the browser, API, admin, cockpit, OpenObserve, and Grafana endpoints. The local
demo controller loads only `PHALANX_DEMO_*` settings from the root `.env.local`.

The demo controller enables `PHALANX_DEMO_MODE=1` and defaults
`PHALANX_DEMO_SKIP_EMAIL_VERIFICATION=1`, so newly registered demo accounts can
sign in without email delivery. The server honors this only when `APP_ENV=local`;
staging and production always retain normal email verification. Disable it by
setting the variable to `0` or by running the server outside `bin/phx-demo-ctl`.

Spectator delivery defaults to an immediate redacted frame in local mode and a
three-turn delay elsewhere. Set `SPECTATOR_DELAY_TURNS=2` or `3` for a delayed
LAN/tournament view; set it to `0` only for trusted demos.
These are non-secret URL overrides for rehearsal surfaces; they are not loaded
by production deployment tooling. Production and staging should provide their
own deployment-specific server origins rather than inheriting local URLs.

For the host-native Panoramic View filelog seam, keep the non-secret override
in the ignored `.zdots.local` file:

The local `bin/phx-demo-ctl` launcher supplies a deterministic development-only
`ADMIN_INTERNAL_TOKEN` to the paired game and admin processes when no local
override is present. Production startup still requires an explicitly managed
token.

```bash
export ZDOTS_APP_LOG=/Users/mike/github.com/phalanxduel/game/logs/panoramic.jsonl
```

`bin/services` carries this value into local daemon processes. The server emits
one JSON object per line only for local/development runs; telemetry write
failures are non-fatal. Production never receives this filelog setting.

## Security Rules

- **Never commit live secrets.** Only `*.example` templates are safe to commit.
- The pre-commit hook automatically blocks attempts to commit `.env` files.
- Use `pnpm env:audit:*` regularly to ensure your local environment is in sync with production.

## Feature Flags

Some features are controlled by environment variables or admin-level flags.
- `VITE_AB_LOBBY_PREACT_PERCENT`: Percentage rollout for the new lobby experience.
- `VITE_PREACT_LOBBY`: Force-enable the new lobby regardless of rollout.

See [Feature Flags Architecture](./architecture/feature-flags.md) for more details.
