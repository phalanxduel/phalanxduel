---
id: TASK-102
title: Docker Local Dev and Debug Environment
status: To Do
assignee: []
created_date: '2026-03-21'
labels: []
milestone: v0.5.0 - Stability & Playability
dependencies:
  - TASK-100
priority: high
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
- [ ] #1 `docker compose up` starts the full game stack locally (server, client,
      Postgres).
- [ ] #2 `docker compose run --rm app pnpm -r test` runs the full test suite
      inside the container and exits with correct status code.
- [ ] #3 Debug profile: source maps present, `LOG_LEVEL=debug`, Node.js
      inspector port (9229) exposed.
- [ ] #4 Staging profile: optimized build, Sentry DSN configured, matches
      `fly.toml` process configuration.
- [ ] #5 Production profile: no dev dependencies, non-root user, health check
      endpoint responds.
- [ ] #6 Environment variables documented in `.env.example` for each profile.
- [ ] #7 `docker compose` config works on both Apple Silicon and x86.
<!-- AC:END -->

## Verification

```bash
# Build and start
docker compose --profile dev up --build -d

# Run tests inside container
docker compose run --rm app pnpm -r test

# Health check
curl http://localhost:3001/health

# Debug port accessible
curl http://localhost:9229/json/list

# Teardown
docker compose down -v
```
