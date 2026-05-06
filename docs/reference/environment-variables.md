# Environment Variables Reference

Canonical reference for environment variables used by the supported Phalanx
Duel runtime and observability workflow.

## Quick Reference

| Variable | Scope | Default | Required | Purpose |
| --- | --- | --- | --- | --- |
| `APP_ENV` | Runtime | none | yes for deploys | Deployment environment label (`staging`, `production`) |
| `NODE_ENV` | Runtime | `development` | yes | Node runtime mode |
| `HOST` | Server | `0.0.0.0` | no | Bind address |
| `PORT` / `PHALANX_SERVER_PORT` | Server | `3001` | no | HTTP listen port |
| `DATABASE_URL` | Server | none | yes in staging/prod | Postgres connection string |
| `JWT_SECRET` | Server | none | yes in production | Session signing key |
| `PHALANX_ADMIN_USER` | Server/Admin | none | no | Admin basic-auth username |
| `PHALANX_ADMIN_PASSWORD` | Server/Admin | none | no | Admin basic-auth password |
| `ADMIN_INTERNAL_TOKEN` | Server/Admin | none | no | Shared internal auth token |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Server/Admin | `http://127.0.0.1:4318` | no | OTLP collector intake |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | Server/Admin | `http/protobuf` | no | OTLP transport protocol |
| `OTEL_SERVICE_NAME` | Server/Admin | service-specific | no | Service name in traces/logs/metrics |
| `OTEL_SERVICE_VERSION` | Server/Admin | `unknown` | no | Service version resource attribute |
| `OTEL_CONSOLE_LOGS_ENABLED` | Server/Admin | `false` in production | no | Forward console logs to OTLP |
| `OTEL_UPSTREAM_OTLP_ENDPOINT` | Local collector helper | `http://127.0.0.1:4318` or host Docker endpoint | no | Upstream centralized collector intake on the LGTM path |
| `FLY_APP_NAME` | Fly.io | auto | auto | Fly app name |
| `FLY_MACHINE_ID` | Fly.io | auto | auto | Fly machine identifier |
| `FLY_REGION` | Fly.io | auto | auto | Fly region code |
| `VITE_AB_LOBBY_PREACT_PERCENT` | Client build | `0` | no | Lobby rollout percentage |
| `VITE_PREACT_LOBBY` | Client build | `false` | no | Force-enable Preact lobby |
| `POSTMARK_SERVER_TOKEN` | Server/Email | none | yes in prod | Postmark API token |
| `MAIL_FROM` | Server/Email | auto | no | Verified sender identity |
| `SUPPORT_EMAIL` | Server/Email | auto | no | Reply-to address for system emails |

## Runtime Variables

### APP_ENV

Deployment label used for environment-specific behavior and telemetry tags.

Examples:

```bash
APP_ENV=staging
APP_ENV=production
```

### NODE_ENV

Node runtime mode. Keep `production` for deployed environments.

Examples:

```bash
NODE_ENV=development
NODE_ENV=production
```

### HOST

Bind address for the HTTP server.

Examples:

```bash
HOST=127.0.0.1
HOST=0.0.0.0
```

### PORT / PHALANX_SERVER_PORT

HTTP listen port for the main server. Fly and the production Docker image
expect `3001` unless there is an explicit reason to change it.

### DATABASE_URL

Postgres connection string. Required for staging and production, optional for
guest-only local flows that do not touch persistence.

For host-run local development, `pnpm dev:server` and `pnpm dev:admin` default
to the Compose-backed local database at
<!-- secretlint-disable-next-line -->
`postgresql://postgres:postgres@127.0.0.1:5432/phalanxduel` when `DATABASE_URL`
is unset and run the server migrations against that database before startup.
That same bootstrap path also seeds the default development admin account unless
an explicit `DATABASE_URL` is already set in the shell.

Examples:

```bash
DATABASE_URL="<postgres-uri-with-sslmode-require>"
DATABASE_URL="<local-postgres-uri>"
```

### JWT_SECRET

HS256 signing key for sessions and admin authentication. Production should fail
fast if this is unset.

### PHALANX_ADMIN_USER / PHALANX_ADMIN_PASSWORD

Credentials for the admin surface.

### ADMIN_INTERNAL_TOKEN

Shared token used for server-to-admin internal API calls.

## OpenTelemetry and Collector Topology

Applications should export to a collector boundary. Routing beyond that
boundary belongs to collector configuration, not application runtime code.

### OTEL_EXPORTER_OTLP_ENDPOINT

OTLP/HTTP or OTLP/gRPC endpoint for the local or in-container collector.

Examples:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT="http://127.0.0.1:4318"
OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"
```

### OTEL_EXPORTER_OTLP_PROTOCOL

Defaults to `http/protobuf`. Keep that unless you have a specific gRPC reason.

Examples:

```bash
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
```

### OTEL_SERVICE_NAME

Sets the service name attached to telemetry resource attributes.

Examples:

```bash
OTEL_SERVICE_NAME=phx-server
OTEL_SERVICE_NAME=phx-admin
```

### OTEL_SERVICE_VERSION

Optional service version for traces, logs, and metrics.

### Derived Topology Resource Attributes

The runtime also derives standard topology fields from the existing environment
contract so LGTM can render service structure more reliably:

- `service.namespace=phalanxduel`
- `deployment.environment` from `APP_ENV`, or `NODE_ENV` when `APP_ENV` is unset
- `service.instance.id`
  - server: `FLY_MACHINE_ID` when present, otherwise `<hostname>:<pid>`
  - CLI/QA tools: `<hostname>:<pid>:<script>`
  - browser client: `browser:<host>:<page-uuid>`
- `service.version`
  - server: shared schema version
  - client: compiled app version

### OTEL_CONSOLE_LOGS_ENABLED

When enabled, console output is forwarded to OTLP in addition to normal process
logging. Keep disabled if file or structured logs already provide the signal
you need.

Examples:

```bash
OTEL_CONSOLE_LOGS_ENABLED=1
OTEL_CONSOLE_LOGS_ENABLED=true
```

### OTEL_UPSTREAM_OTLP_ENDPOINT

Used by the local collector helper (`pnpm infra:otel:collector`) as the
upstream OTLP destination for the centralized collector intake on the LGTM
path.

Examples:

```bash
OTEL_UPSTREAM_OTLP_ENDPOINT=http://127.0.0.1:4318
OTEL_UPSTREAM_OTLP_ENDPOINT=http://host.docker.internal:4318
```

## Fly.io Auto-Set Variables

### FLY_MACHINE_ID

Unique Fly machine identifier. Used as a resource attribute for debugging and
regional correlation.

### FLY_REGION

Fly region code such as `ord` or `lax`.

### FLY_APP_NAME

Fly application name. Used to distinguish staging and production services.

## Email Configuration

Transactional email is handled via Postmark.

### POSTMARK_SERVER_TOKEN

Official Postmark API token. If unset, the server fallbacks to a `LogProvider`
that output email contents to the console for development and testing.

### MAIL_FROM

The verified sender identity in Postmark. Must match a verified Sender Signature
or Domain in your Postmark account.

Defaults to `Phalanx Duel <noreply@phalanxduel.com>`.

### SUPPORT_EMAIL

The address used for the `Reply-To` header in transactional emails.

Defaults to `Phalanx Duel Support <support@phalanxduel.com>`.

## Client Build Variables

All client-side variables must be prefixed with `VITE_` and are compiled into
the client bundle at build time.

### VITE_AB_LOBBY_PREACT_PERCENT

Percentage rollout for the new lobby experience.

Examples:

```bash
VITE_AB_LOBBY_PREACT_PERCENT=0
VITE_AB_LOBBY_PREACT_PERCENT=50
VITE_AB_LOBBY_PREACT_PERCENT=100
```

### VITE_PREACT_LOBBY

Force-enable the Preact lobby regardless of rollout percentage.

Examples:

```bash
VITE_PREACT_LOBBY=1
```

## Deployment Examples

### Local Development

```bash
NODE_ENV=development
HOST=127.0.0.1
PHALANX_SERVER_PORT=3001
DATABASE_URL="<local-postgres-uri>"
OTEL_EXPORTER_OTLP_ENDPOINT="http://127.0.0.1:4318"
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_SERVICE_NAME=phx-server
```

### Docker Compose

```bash
NODE_ENV=production
APP_ENV=staging
PHALANX_SERVER_PORT=3001
DATABASE_URL="<compose-postgres-uri>"
OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_SERVICE_NAME=phx-server
```

### Fly.io

```bash
APP_ENV=production
NODE_ENV=production
PHALANX_SERVER_PORT=3001
OTEL_EXPORTER_OTLP_ENDPOINT="http://127.0.0.1:4318"
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_SERVICE_NAME=phx-server
```

## Validation

```bash
env | sort
node -e "console.log(process.env.OTEL_EXPORTER_OTLP_ENDPOINT)"
rtk curl -sS http://127.0.0.1:3001/health
```

The `/health` endpoint should report `observability.otel_active: true` when
the OTLP endpoint is configured.

## References

- [Dockerfile](../../Dockerfile)
- [fly.production.toml](../../fly.production.toml)
- [fly.staging.toml](../../fly.staging.toml)
- [CONFIGURATION.md](docs/configuration.md)
- [DEPLOYMENT_CHECKLIST.md](docs/ops/deployment-checklist.md)
- [OpenTelemetry](https://opentelemetry.io/)
