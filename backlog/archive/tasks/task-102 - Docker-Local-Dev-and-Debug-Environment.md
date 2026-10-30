---
id: TASK-102
title: Docker Local Dev and Debug Environment
status: Done
assignee: []
created_date: '2026-03-21'
updated_date: '2026-03-22 15:17'
labels: []
milestone: v0.5.0 - Stability & Playability
dependencies:
  - TASK-100
priority: high
ordinal: 99000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a Docker-based local development environment that mirrors the Fly.io
deployment topology. Developers should be able to run the full game stack locally
via Docker, run the test suite inside the container, and debug issues in an
environment that matches staging/production.

The image should support three profiles:
- **debug/dev**: Source maps, verbose logging, hot reload if feasible, debug
  ports exposed.
- **staging**: Matches the Fly.io staging image — optimized build, Sentry
  enabled, production-like config.
- **production**: The image that gets promoted from staging. No debug tooling,
  minimal attack surface.

The debug/dev image is what runs locally. The staging image is what gets deployed
to Fly.io staging. Promotion to production is a tag/config change, not a rebuild.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `docker compose --profile dev up --build` starts the full game stack
      locally (game server, admin console, Postgres, Grafana LGTM observability).
- [x] #2 `docker compose --profile dev run --rm -e DATABASE_URL= app-dev pnpm -r test`
      runs the full test suite inside the container and exits with correct status code.
- [x] #3 Debug profile: source maps present, `LOG_LEVEL=debug`, Node.js
      inspector port (9229) exposed.
- [x] #4 Staging profile: optimized build, Sentry DSN configured, matches
      `fly.toml` process configuration.
- [x] #5 Production profile: no dev dependencies, non-root user, health check
      endpoint responds.
- [x] #6 Environment variables documented in `.env.example` for each profile.
- [x] #7 `docker compose` config works on both Apple Silicon and x86
      (base images are multi-arch: `node:24-alpine`, `postgres:17-alpine`,
      `grafana/otel-lgtm`, `otel/opentelemetry-collector-contrib`).
<!-- AC:END -->

## Verification

```bash
# Build and start the full dev stack
pnpm docker:up
# Expected: all 4 containers healthy (phalanx-app, phalanx-admin, phalanx-postgres, phalanx-otel-lgtm)

# Verify all services are running
docker compose --profile dev ps
# Expected: 4 services, all "Up" or "healthy"

# Verify endpoints respond
curl -s http://127.0.0.1:3001/health   # Game server → {"status":"ok",...}
curl -s http://127.0.0.1:3002/         # Admin console → HTML
curl -s http://127.0.0.1:3000/         # Grafana UI → HTML

# Run tests inside the container
pnpm docker:test
# Expected: all tests pass, exit code 0

# Verify debug inspector port
curl -s http://127.0.0.1:9229/json/version
# Expected: JSON with Node.js debugger info

# Tear down
pnpm docker:down
# Expected: all containers stopped, volumes removed
```
