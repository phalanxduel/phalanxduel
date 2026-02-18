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

## Health Check

```bash
curl http://localhost:3001/health
# {"status":"ok","timestamp":"...","version":"0.2.0"}
```

## OpenAPI Documentation

Swagger UI is available at `/docs` in all environments.

## Observability (optional)

For OpenTelemetry tracing and metrics, run the collector stack alongside:

```bash
pnpm otel:up   # starts Jaeger + Prometheus + Grafana + OTel collector
```

Set `OTEL_EXPORTER_OTLP_ENDPOINT` on the server container to point to the
collector. See `docs/OBSERVABILITY.md` for details.
