# Environment Variables Reference

Complete reference for all environment variables used by Phalanx Duel in different environments.

## Quick Reference

| Variable | Scope | Default | Required | Example |
|----------|-------|---------|----------|---------|
| `NODE_ENV` | Server | `development` | Yes | `production` |
| `PORT` | Server | `3001` | No | `3001` |
| `HOST` | Server | `0.0.0.0` | No | `0.0.0.0` |
| `DATABASE_URL` | Server | None | Yes (prod) | `postgresql://...` |
| `SENTRY_DSN` | Server | None | No | `https://...@sentry.io/...` |
| `VITE_SENTRY_DSN` | Client (build) | None | No | `https://...@sentry.io/...` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Server | `http://localhost:4318` | No | `http://otel:4318` |
| `OTEL_SERVICE_NAME` | Server | `phalanxduel-server` | No | `phalanxduel-server` |
| `FLY_MACHINE_ID` | Server (Fly.io) | None | Auto | `50087... (auto-set by Fly.io)` |
| `FLY_REGION` | Server (Fly.io) | None | Auto | `ord` (auto-set by Fly.io) |

---

## Server Environment Variables

### Application Runtime

#### NODE_ENV

**Purpose**: Environment mode (enables/disables optimizations, logging)  
**Type**: `string`  
**Default**: `development`  
**Required**: Yes  
**Allowed Values**: `development`, `production`, `staging`  
**Used By**: Express, logging, Sentry

**Examples**:
```bash
NODE_ENV=production  # Production: strict mode, no debug logging
NODE_ENV=development # Development: verbose logging, source maps
```

#### PORT

**Purpose**: Server listen port (exposed via `EXPOSE` in Dockerfile)  
**Type**: `number`  
**Default**: `3001`  
**Required**: No  
**Valid Range**: 1-65535  
**Used By**: Express server startup

**Examples**:
```bash
PORT=3001     # Standard app port
PORT=8080     # Alternative port for testing
```

**Note**: Fly.io routes to port `3001` by default; change only if necessary.

#### HOST

**Purpose**: Server bind address (which network interface to listen on)  
**Type**: `string`  
**Default**: `0.0.0.0`  
**Required**: No  
**Used By**: Express server startup

**Examples**:
```bash
HOST=0.0.0.0       # Listen on all interfaces (Fly.io/Docker)
HOST=localhost     # Development: localhost only
HOST=127.0.0.1     # Development: loopback only
```

#### DATABASE_URL

**Purpose**: PostgreSQL connection string (Neon or self-hosted)  
**Type**: `string` (URI)  
**Default**: None  
**Required**: Yes (production/staging); No (development with local DB)  
**Format**: `postgresql://[user[:password]@][host][:port]/[dbname][?params]`  
**Used By**: Drizzle ORM migrations and queries

**Examples**:
```bash
# Neon (managed)
DATABASE_URL="postgresql://user:password@c.neon.tech/phalanxduel?sslmode=require"

# Local PostgreSQL
DATABASE_URL="postgresql://localhost/phalanxduel"

# Self-hosted PostgreSQL
DATABASE_URL="postgresql://user:pass@db.example.com:5432/phalanxduel"
```

**How to get**:
- **Neon**: Dashboard → Project → Connection strings → Pooled
- **Fly.io Postgres**: `fly pg attach` (creates DATABASE_URL automatically)
- **Local**: `psql postgres -c "CREATE DATABASE phalanxduel"`

### Observability & Error Tracking

#### SENTRY_DSN

**Purpose**: Sentry server-side error tracking endpoint  
**Type**: `string` (URI)  
**Default**: None  
**Required**: No (optional; disables Sentry if missing)  
**Format**: `https://key@sentry.io/project-id`  
**Used By**: `server/src/instrument.ts` (Sentry initialization)

**Examples**:
```bash
SENTRY_DSN="https://abc123@sentry.io/456789"
```

**How to get**:
1. Create Sentry project: https://sentry.io
2. Select Node.js as platform
3. Copy DSN from Settings → Client Keys (DSN)

#### SENTRY_DEBUG

**Purpose**: Enable verbose Sentry initialization logging (development only)  
**Type**: `boolean` (env var presence = true)  
**Default**: `false`  
**Required**: No  
**Used By**: `server/src/instrument.ts`

**Examples**:
```bash
SENTRY_DEBUG=1        # Enable debug logging
SENTRY_DEBUG=true     # Alternative
# Omit to disable
```

#### SENTRY_RELEASE

**Purpose**: Release version for Sentry error grouping  
**Type**: `string`  
**Default**: `phalanxduel-server@{schema_version}`  
**Required**: No  
**Used By**: Sentry error tracking

**Examples**:
```bash
SENTRY_RELEASE="phalanxduel-server@1.2.3"
SENTRY_RELEASE="phalanxduel-server@main-abc123"  # CI build
```

#### SENTRY_TRACES_SAMPLE_RATE

**Purpose**: Percentage of transactions to send to Sentry (0.0-1.0)  
**Type**: `float`  
**Default**: `0.1` (10% sampling)  
**Required**: No  
**Valid Range**: 0.0-1.0

**Examples**:
```bash
SENTRY_TRACES_SAMPLE_RATE=0.1      # 10% sampling (default)
SENTRY_TRACES_SAMPLE_RATE=1.0      # 100% (for testing only)
SENTRY_TRACES_SAMPLE_RATE=0.01     # 1% (high-traffic production)
```

#### SENTRY_PROFILES_SAMPLE_RATE

**Purpose**: Percentage of traces to profile with Sentry Profiler  
**Type**: `float`  
**Default**: `0.1`  
**Required**: No  
**Valid Range**: 0.0-1.0

**Examples**:
```bash
SENTRY_PROFILES_SAMPLE_RATE=0.1    # 10% of traces profiled
SENTRY_PROFILES_SAMPLE_RATE=0.0    # Disable profiling
```

### OpenTelemetry (OTEL)

#### OTEL_EXPORTER_OTLP_ENDPOINT

**Purpose**: OpenTelemetry collector endpoint for distributed tracing  
**Type**: `string` (URI)  
**Default**: `http://localhost:4318`  
**Required**: No  
**Format**: `http://[host]:[port]`  
**Used By**: `server/src/instrument.ts` (OTEL trace exporter)

**Examples**:
```bash
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"     # Local dev
OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318" # Docker Compose
OTEL_EXPORTER_OTLP_ENDPOINT="http://sentry.example.com:4318" # Production
```

#### OTEL_EXPORTER_OTLP_PROTOCOL

**Purpose**: Protocol for OTEL export (grpc or http/protobuf)  
**Type**: `string`  
**Default**: `http/protobuf`  
**Required**: No  
**Allowed Values**: `grpc`, `http/protobuf`, `http/json`  
**Used By**: OTEL SDK

**Examples**:
```bash
OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"  # HTTP with protobuf encoding
OTEL_EXPORTER_OTLP_PROTOCOL="grpc"           # gRPC (less common)
```

#### OTEL_SERVICE_NAME

**Purpose**: Service name in OTEL traces (for dashboards/filtering)  
**Type**: `string`  
**Default**: `phalanxduel-server`  
**Required**: No  
**Used By**: OTEL SDK, trace exporters

**Examples**:
```bash
OTEL_SERVICE_NAME="phalanxduel-server"        # Default
OTEL_SERVICE_NAME="phalanxduel-server-prod"   # Distinguish prod
```

#### OTEL_SERVICE_VERSION

**Purpose**: App version for OTEL traces  
**Type**: `string`  
**Default**: `unknown`  
**Required**: No  
**Used By**: OTEL SDK, trace exporters

**Examples**:
```bash
OTEL_SERVICE_VERSION="1.2.3"        # Semver
OTEL_SERVICE_VERSION="main-abc123"  # Git commit
OTEL_SERVICE_VERSION="unknown"      # Default
```

#### OTEL_CONSOLE_LOGS_ENABLED

**Purpose**: Enable OTEL console logging (for debugging)  
**Type**: `boolean` (1/true = enabled)  
**Default**: `false`  
**Required**: No  
**Used By**: `server/src/instrument.ts`

**Examples**:
```bash
OTEL_CONSOLE_LOGS_ENABLED=1     # Enable debug logs
OTEL_CONSOLE_LOGS_ENABLED=true  # Alternative
# Omit to disable
```

### Fly.io-Specific Variables (Auto-Set)

These are automatically set by Fly.io; don't set manually unless testing.

#### FLY_MACHINE_ID

**Purpose**: Unique machine identifier in Fly.io region  
**Type**: `string` (UUID-like)  
**Default**: None  
**Set By**: Fly.io (auto)  
**Used By**: Sentry attributes (uniquely identify crashed instance)

**Examples**:
```bash
FLY_MACHINE_ID="50087c652a5938"  # Fly.io auto-generated
```

#### FLY_REGION

**Purpose**: Fly.io region code  
**Type**: `string`  
**Default**: None  
**Set By**: Fly.io (auto)  
**Used By**: Sentry attributes (regional debugging)

**Examples**:
```bash
FLY_REGION="ord"   # Chicago
FLY_REGION="lax"   # Los Angeles
FLY_REGION="fra"   # Frankfurt
```

#### FLY_APP_NAME

**Purpose**: Fly.io app name  
**Type**: `string`  
**Default**: None  
**Set By**: Fly.io (auto)  
**Used By**: `server/src/instrument.ts` (detect Fly.io environment)

**Examples**:
```bash
FLY_APP_NAME="phalanxduel-staging"
FLY_APP_NAME="phalanxduel-production"
```

---

## Client (Browser) Environment Variables

All client variables are prefixed with `VITE_` and baked into the build at **compile time** (not runtime).

### Error Tracking

#### VITE_SENTRY_DSN

**Purpose**: Sentry endpoint for client-side error tracking  
**Type**: `string` (URI)  
**Default**: None  
**Required**: No  
**Build-Time**: Yes (set during `pnpm build`)  
**Used By**: `client/src/main.ts` (Sentry initialization)

**Examples**:
```bash
export VITE_SENTRY_DSN="https://key@sentry.io/123456"
pnpm build
# Value is baked into dist/assets/*.js
```

#### VITE_ENABLE_LOCAL_SENTRY

**Purpose**: Route Sentry events to local endpoint (for testing)  
**Type**: `boolean` (1/true = enabled)  
**Default**: `false`  
**Required**: No  
**Build-Time**: Yes  
**Used By**: `client/src/main.ts`

**Examples**:
```bash
VITE_ENABLE_LOCAL_SENTRY=1 pnpm build
```

### Feature Flags (A/B Tests)

#### VITE_AB_LOBBY_PREACT_PERCENT

**Purpose**: Percentage of users to show new Preact lobby UI  
**Type**: `number` (0-100)  
**Default**: `0` (disabled)  
**Required**: No  
**Build-Time**: Yes  
**Used By**: `client/src/experiments.ts`

**Examples**:
```bash
VITE_AB_LOBBY_PREACT_PERCENT=50 pnpm build    # 50% of users
VITE_AB_LOBBY_PREACT_PERCENT=100 pnpm build   # 100% rollout
VITE_AB_LOBBY_PREACT_PERCENT=0 pnpm build     # Disabled
```

#### VITE_PREACT_LOBBY

**Purpose**: Force enable/disable Preact lobby (overrides A/B test)  
**Type**: `boolean` (1 = force enabled)  
**Default**: `false`  
**Required**: No  
**Build-Time**: Yes  
**Used By**: `client/src/renderer.ts`

**Examples**:
```bash
VITE_PREACT_LOBBY=1 pnpm build    # Force enable for testing
```

---

## Build-Time Secrets (Docker Only)

These are **never** available at runtime; they're only used during `docker build`.

### SENTRY_AUTH_TOKEN

**Purpose**: Upload source maps to Sentry (Vite plugin)  
**Type**: `string` (Sentry auth token)  
**Default**: None  
**Required**: No (build continues without it; source maps just won't upload)  
**Passed Via**: `--secret SENTRY_AUTH_TOKEN=...` (Docker build secret mount)  
**Used By**: Vite plugin, `@sentry/cli` in Dockerfile

**Examples**:
```bash
# GitHub Actions
docker build --secret SENTRY_AUTH_TOKEN=${{ secrets.SENTRY_AUTH_TOKEN }} .

# Local
docker build --secret SENTRY_AUTH_TOKEN="$(cat ~/.sentry_token)" .
```

**Security**: Mounted read-only via `--mount=type=secret`; never persisted in image layers.

---

## Environment by Deployment Target

### Development (Local)

Create `.env.local` (ignored by Git):

```bash
NODE_ENV=development
PORT=3001
HOST=localhost
DATABASE_URL="postgresql://localhost/phalanxduel"
SENTRY_DSN=                              # Optional
VITE_SENTRY_DSN=         # Optional
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
```

Run:
```bash
pnpm dev
```

### Docker Compose (Local/Staging)

Create `.env.compose`:

```bash
NODE_ENV=staging
PORT=3001
HOST=0.0.0.0
DATABASE_URL="postgresql://postgres:password@postgres:5432/phalanxduel"
SENTRY_DSN="https://...@sentry.io/..."
VITE_SENTRY_DSN="https://...@sentry.io/..."
OTEL_EXPORTER_OTLP_ENDPOINT="http://otel:4318"
```

Run:
```bash
docker compose up --build
```

### GitHub Actions (CI/CD)

Stored as secrets in GitHub → Settings → Secrets and variables:

```yaml
jobs:
  build:
    env:
      NODE_ENV: production
      SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
      VITE_SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
    steps:
      - uses: docker/build-push-action@v5
        with:
          secrets: |
            SENTRY_AUTH_TOKEN=${{ secrets.SENTRY_AUTH_TOKEN }}
```

### Fly.io (Production)

Set via `fly secrets`:

```bash
fly secrets set NODE_ENV="production"
fly secrets set PORT="3001"
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set SENTRY_DSN="https://...@sentry.io/..."
fly secrets set VITE_SENTRY_DSN="https://...@sentry.io/..."
fly secrets set SENTRY_AUTH_TOKEN="sntrys_..."
```

Reference in `fly.toml`:

```toml
[env]
  NODE_ENV = "production"
  PORT = "3001"
  DATABASE_URL = "${DATABASE_URL}"
  SENTRY_DSN = "${SENTRY_DSN}"
```

Deploy:
```bash
fly deploy
```

---

## Validation & Debugging

### Check What's Set

```bash
# All env vars
env | sort

# Specific var
echo $DATABASE_URL

# In Node.js
node -e "console.log(process.env.DATABASE_URL)"
```

### Server Startup Logs

When the app starts, it logs which variables are configured:

```text
[info] Node environment: production
[info] Sentry DSN: https://...@sentry.io/...
[info] OpenTelemetry endpoint: http://localhost:4318
[info] Database: postgresql://...
```

Missing critical vars will cause startup failure with clear error messages.

### Client Build Vars

Check what was baked in:

```bash
# After build
grep -r "VITE_" dist/assets/*.js | head -3
```

---

## References

- [Dockerfile](../../Dockerfile) — See ENV statements
- [fly.toml](../../fly.toml) — See `[env]` section
- [SECRETS_AND_ENV.md](./SECRETS_AND_ENV.md) — Secret management
- [FLYIO_PRODUCTION_GUIDE.md](../deployment/FLYIO_PRODUCTION_GUIDE.md) — Fly.io deployment
- [Sentry Documentation](https://docs.sentry.io/)
- [OpenTelemetry SDK](https://opentelemetry.io/)
