# Deployment Guide

## Architecture

In production, the Fastify server serves both the WebSocket game API and the
client static files (from `client/dist/`). A single container handles
everything — no separate web server or CDN required.

```
Browser  ──HTTP──▶  Fastify ──▶ client/dist/ (static)
         ──WS────▶  Fastify ──▶ MatchManager (game logic)
```

## Local Docker

Build and run:

```bash
docker build -t phalanx .
docker run -p 3001:3001 phalanx
```

Or use Docker Compose:

```bash
docker compose up --build
```

Open http://localhost:3001 to play.

## Fly.io

### First-time setup

```bash
fly auth login
fly apps create phalanx
fly deploy
```

### Subsequent deploys

```bash
fly deploy
```

The app is configured in `fly.toml`:

- Region: `ord` (Chicago) — change `primary_region` as needed
- Auto-stop/start machines to save cost when idle
- Health check on `GET /health`
- HTTPS enforced automatically

### Custom domain

```bash
fly certs add yourdomain.com
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP/WS listen port |
| `HOST` | `0.0.0.0` | Bind address |
| `NODE_ENV` | — | Set to `production` in Docker/Fly |
| `PHALANX_ADMIN_USER` | `phalanx` | Username for admin endpoint Basic Auth |
| `PHALANX_ADMIN_PASSWORD` | `phalanx` | Password for admin endpoint Basic Auth |

## Security

### Admin Endpoints

`GET /matches/:matchId/replay` is protected with HTTP Basic Auth. Set
`PHALANX_ADMIN_USER` and `PHALANX_ADMIN_PASSWORD` to non-default values in
production. On Fly.io, use secrets:

```bash
fly secrets set \
  PHALANX_ADMIN_USER=your-admin-user \
  PHALANX_ADMIN_PASSWORD=your-strong-password \
  --app phalanx-game
```

Credentials are compared with `timingSafeEqual` to prevent timing attacks.

## Health Check

```bash
curl http://localhost:3001/health
# {"status":"ok","timestamp":"...","version":"0.2.0"}
```

## OpenAPI Documentation

Swagger UI is available at `/docs` in all environments.

## Release & Versioning Protocol

Phalanx Duel follows a strict versioning protocol to ensure observability and point-in-time recovery. **Every deployment must have a unique semantic version and a corresponding Git tag.**

### 1. Bump Version
The version must be incremented in two places:
- **`shared/src/schema.ts`**: Update the `SCHEMA_VERSION` constant. This synchronizes the Sentry release names and the lobby UI.
- **`package.json`**: Update the root and workspace version numbers.

```bash
# Example: updating to 0.2.1
pnpm -r exec npm version 0.2.1
# and manually update SCHEMA_VERSION in shared/src/schema.ts
```

### 2. Git Tagging
Once the code is committed, create an annotated tag:

```bash
git tag -a v0.2.1 -m "Release v0.2.1"
git push origin main --tags
```

### 3. Verification
After deployment, verify that the version is correctly displayed in:
1. The **Lobby UI** (under the title).
2. The **`/health` endpoint** output.
3. The **Sentry Releases** dashboard.

## Observability (optional)

For OpenTelemetry tracing and metrics, run the collector stack alongside:

```bash
pnpm otel:up   # starts Jaeger + Prometheus + Grafana + OTel collector
```

Set `OTEL_EXPORTER_OTLP_ENDPOINT` on the server container to point to the
collector. See `docs/OBSERVABILITY.md` for details.

### Grafana Cloud OTLP on Fly

Set OTLP values as Fly secrets (not in git, not in `fly.toml`):

```bash
fly secrets set \
  OTEL_SERVICE_NAME=phalanx-game \
  OTEL_RESOURCE_ATTRIBUTES="service.namespace=phalanx-game-ns,deployment.environment=production" \
  OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf \
  OTEL_EXPORTER_OTLP_ENDPOINT="https://otlp-gateway-prod-us-east-2.grafana.net/otlp" \
  OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic <your-grafana-basic-auth>" \
  --app phalanx-game
```

Notes:
- Keep your token/header material in Fly secrets only.
- Do not commit `.env.local` or token-bearing values.
