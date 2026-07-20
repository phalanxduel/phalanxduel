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
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://127.0.0.1:4318` | OTLP collector intake |

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

## Security Rules

- **Never commit live secrets.** Only `*.example` templates are safe to commit.
- The pre-commit hook automatically blocks attempts to commit `.env` files.
- Use `pnpm env:audit:*` regularly to ensure your local environment is in sync with production.

## Feature Flags

Some features are controlled by environment variables or admin-level flags.
- `VITE_AB_LOBBY_PREACT_PERCENT`: Percentage rollout for the new lobby experience.
- `VITE_PREACT_LOBBY`: Force-enable the new lobby regardless of rollout.

See [Feature Flags Architecture](./architecture/feature-flags.md) for more details.
