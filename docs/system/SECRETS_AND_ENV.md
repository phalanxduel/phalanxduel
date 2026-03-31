# Secrets and Environment Management

This repo uses a small DSL in local `.env` files plus `pnpm env:*` commands to
push deploy-time configuration to Fly.io and GitHub environments. The supported
observability model is OpenTelemetry plus a local collector that forwards to
the centralized LGTM stack.

## Source Files

### `.env.secrets` / `.env.secrets.local`

Shared values used across environments.

- `FLY_API_TOKEN` belongs in `.env.secrets.local` and must not be committed.
- `OTEL_UPSTREAM_OTLP_ENDPOINT` can live here when both staging and production
  forward to the same centralized intake.

### `.env.staging` / `.env.production`

Environment-specific runtime values.

- `DATABASE_URL`
- `APP_ENV`
- `NODE_ENV`
- `JWT_SECRET`
- admin credentials when needed
- collector-upstream selection if it truly differs by environment

## DSL Annotations

The sync tool reads comment decorators immediately above each key:

- `# @target: ALL|RUNTIME|PIPELINE|LOCAL`
- `# @concern: GENERAL|DATABASE|OBSERVABILITY|ADMIN|AUTH`
- `# @ref: <link>`
- `# @description: <text>`

`ALL` pushes to both Fly.io and GitHub environment secrets. `RUNTIME` is
Fly-only. `PIPELINE` is GitHub-only. `LOCAL` stays local.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm env:push:staging` | Push staging secrets from the local DSL |
| `pnpm env:push:production` | Push production secrets from the local DSL |
| `pnpm env:audit:staging` | Compare local staging DSL against remotes |
| `pnpm env:audit:production` | Compare local production DSL against remotes |
| `pnpm env:prune:staging` | Remove remote secrets not present in local staging DSL |
| `pnpm env:prune:production` | Remove remote secrets not present in local production DSL |
| `pnpm env:bootstrap:staging` | Pull staging secrets into local DSL for review |
| `pnpm env:bootstrap:production` | Pull production secrets into local DSL for review |

## Supported Observability Secret Model

Use:

- `OTEL_EXPORTER_OTLP_ENDPOINT` for app runtime export to the local or
  in-container collector
- `OTEL_UPSTREAM_OTLP_ENDPOINT` for the local collector helper’s upstream
  destination

Do not introduce vendor-specific DSNs or source-map upload tokens into the
active secrets contract unless a new decision explicitly adds them.

## Security Rules

- Do not commit live secrets.
- Keep `.env.secrets.local` for workstation-only values.
- Use `pnpm env:audit:*` regularly to detect drift.
- Prefer rotating compromised values rather than editing remote UIs by hand.
- Treat repo-tracked env templates as examples only; real deploy values belong
  in ignored local files or managed secret stores.

## References

- `scripts/maint/sync-secrets.ts`
- `.github/workflows/pipeline.yml`
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
