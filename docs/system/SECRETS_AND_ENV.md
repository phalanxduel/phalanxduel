# Secrets and Environment Variables

This document defines all build-time secrets and runtime environment variables required for Phalanx Duel production deployments.

## Build-Time Secrets (CI/CD Only)

These secrets are **only** used during Docker image build and are **not** persisted in any image layer (mounted via `--mount=type=secret`).

### SENTRY_AUTH_TOKEN

**Purpose**: Upload source maps and release tracking info to Sentry for error debugging  
**Required**: No (build will skip sourcemap upload if missing)  
**Where to get**: [Sentry Dashboard → Settings → Auth Tokens](https://sentry.io/settings/account/api/auth-tokens/)  
**Scope**: `project:releases`, `org:read`, `project:write`

**How it's used**:
- Client-side source maps uploaded via Vite plugin during `pnpm build`
- Server-side source maps uploaded after build completes
- Used in `.github/workflows/ci.yml` and Fly.io deployments

**GitHub Actions setup**:
```yaml
- name: Build Docker image
  run: docker build -t phalanxduel:${{ github.sha }} \
    --secret SENTRY_AUTH_TOKEN=${{ secrets.SENTRY_AUTH_TOKEN }} \
    .
```

**Fly.io setup**:
```bash
fly secrets set SENTRY_AUTH_TOKEN="your-auth-token-here"
```

Then in `fly.toml`:
```toml
[build]
  [build.args]
    # Note: --secret is passed via Fly.io secrets, not args
```

## Runtime Environment Variables (Production)

These variables are set **at container runtime** via orchestrators (Fly.io, Docker Compose, Kubernetes) or `.env` files (development only).

### Required in Production

| Variable | Example | Purpose | Used By |
|----------|---------|---------|---------|
| `NODE_ENV` | `production` | Enables optimizations, disables dev logging | app startup |
| `PORT` | `3001` | Server listen port | server |
| `HOST` | `0.0.0.0` | Server bind address | server |
| `DATABASE_URL` | `postgresql://...` | Neon PostgreSQL connection string | Drizzle ORM |
| `SENTRY_DSN` | `https://...@sentry.io/...` | Sentry error tracking endpoint (server) | server error handler |
| `VITE_SENTRY__CLIENT__SENTRY_DSN` | `https://...@sentry.io/...` | Sentry endpoint (client) | client error handler |

### Optional (with Defaults)

| Variable | Default | Purpose |
|----------|---------|---------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | OpenTelemetry collector endpoint |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | OTEL trace protocol |
| `OTEL_SERVICE_NAME` | `phalanxduel-server` | Service name in traces |
| `OTEL_SERVICE_VERSION` | `unknown` | App version in traces |

### Health Check Variables

Health checks are hardcoded in `Dockerfile`:
- **Liveness probe**: `GET /health` (is process alive?)
- **Readiness probe**: `GET /ready` (is app ready to handle traffic?)
- See `server/src/routes/health.ts` for implementation

## Passing Secrets in Different Environments

### 1. Development (Local)

Create `.env.local` in the repository root (excluded from Git):

```bash
# .env.local (never commit)
DATABASE_URL="postgresql://localhost/phalanxduel-dev"
SENTRY_DSN="https://dev@sentry.io/dev-project"
VITE_SENTRY__CLIENT__SENTRY_DSN="https://dev@sentry.io/dev-project"
```

Run locally:
```bash
pnpm dev
# App reads from .env.local
```

### 2. Docker Compose (Local/Staging)

Pass via `.env.compose`:

```bash
# .env.compose
DATABASE_URL=postgresql://user:pass@postgres:5432/phalanxduel
SENTRY_DSN=https://...@sentry.io/...
VITE_SENTRY__CLIENT__SENTRY_DSN=https://...@sentry.io/...
```

Run:
```bash
docker compose up \
  --build \
  --secret SENTRY_AUTH_TOKEN="$(cat ~/.sentry_token)"
```

### 3. GitHub Actions (CI/CD)

**Secrets stored in**: GitHub → Settings → Secrets and variables → Actions

Store:
- `SENTRY_AUTH_TOKEN` (for build)
- `SENTRY_DSN` (for release info)
- `DATABASE_URL` (for tests)

Use in workflow:
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
    steps:
      - uses: docker/build-push-action@v5
        with:
          secrets: |
            SENTRY_AUTH_TOKEN=${{ secrets.SENTRY_AUTH_TOKEN }}
```

### 4. Fly.io Production

**Secrets stored in**: Fly.io dashboard or `flyctl`:

Set secrets:
```bash
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set SENTRY_DSN="https://...@sentry.io/..."
fly secrets set SENTRY_AUTH_TOKEN="..."
```

View secrets:
```bash
fly secrets list
```

In `fly.toml`, reference them as env vars:
```toml
[env]
  DATABASE_URL = "${DATABASE_URL}"  # Fly.io interpolates from secrets
  SENTRY_DSN = "${SENTRY_DSN}"
  VITE_SENTRY__CLIENT__SENTRY_DSN = "${SENTRY_DSN}"
```

Then deploy:
```bash
fly deploy
```

Fly.io passes secrets to the container as environment variables at runtime (not build-time).

## Security Checklist

- ✅ **No secrets in image layers**: Verified with `docker history phalanxduel:latest`
- ✅ **Build secrets mounted read-only**: Uses `--mount=type=secret` in Dockerfile
- ✅ **.env files excluded from Docker build context**: Defined in `.dockerignore`
- ✅ **Secrets never logged**: App code avoids printing secrets to stdout/stderr
- ✅ **Secrets rotatable**: Each platform supports secret rotation without rebuild

## Audit

Run this to verify no secrets in a built image:

```bash
docker build -t phalanxduel:check .
docker history phalanxduel:check | grep -i 'token\|password\|secret\|key' || echo "✓ Clean"
```

Or inspect layer contents:
```bash
docker image inspect phalanxduel:check --format='{{json .}}' | grep -i 'sentry\|token' || echo "✓ No leaks"
```

## References

- [Dockerfile secret best practices](https://docs.docker.com/build/building/secrets/)
- [Sentry auth tokens](https://docs.sentry.io/api/auth/)
- [Fly.io secrets](https://fly.io/docs/reference/secrets/)
- [GitHub Actions secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
