---
id: TASK-68
title: "Set Up Fly.io OTel Collector Deployment (Staging & Production)"
status: To Do
priority: CRITICAL
assignee: null
parent: TASK-50
labels:
  - flyio
  - otel
  - deployment
  - observability
dependencies:
  - TASK-69
blocks:
  - TASK-71
created: "2026-03-18"
updated: "2026-03-18"
---

# TASK-68: Set Up Fly.io OTel Collector Deployment (Staging & Production)

## Description

Configure Fly.io to run OTel collector as a sidecar in the same machine as the app (two processes via process groups). Single Docker image contains both the Node.js app and the OTel collector binary.

This task prepares the Fly.io configuration. TASK-71 executes the actual deployment.

## Acceptance Criteria

- [ ] Procfile defined with `web` (app) and `otel` (collector) processes
- [ ] fly.staging.toml configured with `[processes]` section
- [ ] fly.production.toml configured with `[processes]` section
- [ ] fly.toml `[env]` includes OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
- [ ] Dockerfile contains OTel collector binary (from otel/otelcol-contrib)
- [ ] otel-collector-config.yaml ready (Sentry exporter configured)
- [ ] Collector health check configured (port 13133)
- [ ] OTel receiver ports configured (4317 gRPC, 4318 HTTP)
- [ ] Both processes scale together (single machine instance)
- [ ] Sentry DSN passed via Fly.io secrets to collector
- [ ] Documentation: How to deploy and verify both processes

## Implementation

### Files to Create/Modify

1. **Procfile** (New)
   ```procfile
   web: node --require ./dist/server/src/instrument.js ./dist/server/src/index.js
   otel: /app/otel-collector/otelcol-contrib --config=/app/otel-collector-config.yaml
   ```

2. **fly.staging.toml** (Update)
   - Add `[processes]` section mapping `web` and `otel` processes
   - Set `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` in `[env]`
   - Both processes scale together (single machine instance)

3. **fly.production.toml** (Update)
   - Same as staging but with production environment name
   - Set `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` in `[env]`

4. **Dockerfile** (Update)
   - Add stage to download OTel collector binary (otel/otelcol-contrib)
   - Copy `otel-collector-config.yaml` to runtime image
   - Copy OTel collector binary to `/app/otel-collector/otelcol-contrib`
   - Keep existing Node.js build and runtime stages

5. **otel-collector-config.yaml** (Already created in TASK-67)
   - Verify Sentry exporter uses `${SENTRY_DSN}` environment variable
   - Set APP_ENV from environment variables
   - Pipelines: traces → Sentry, metrics/logs → logging exporter

### Deployment Architecture (Sidecar Pattern)

```text
Fly.io Machine (Staging):
├─ Process: web (Node.js app, port 3001)
│  └─ Sends telemetry to http://localhost:4318
├─ Process: otel (OTel Collector, port 4318)
│  ├─ Receives: :4317 (gRPC), :4318 (HTTP)
│  ├─ Exports: Sentry (via SENTRY_DSN secret)
│  └─ Health: :13133
└─ Shared: Same machine, processes restart together

Fly.io Machine (Production):
├─ Process: web (Node.js app, port 3001)
│  └─ Sends telemetry to http://localhost:4318
├─ Process: otel (OTel Collector, port 4318)
│  ├─ Receives: :4317 (gRPC), :4318 (HTTP)
│  ├─ Exports: Sentry (via SENTRY_DSN secret)
│  └─ Health: :13133
└─ Shared: Same machine, processes restart together
```

**Benefits of sidecar pattern:**
- Simple single-machine deployment (no separate app orchestration)
- Shared resources (app and collector on same machine)
- Both processes restart together (failure isolation)
- Collector is lightweight (232MB) and fast to start

### Fly.toml Process Groups Configuration

```toml
# fly.staging.toml
[processes]
web = "node --require ./dist/server/src/instrument.js ./dist/server/src/index.js"
otel = "/app/otel-collector/otelcol-contrib --config=/app/otel-collector-config.yaml"

[[services]]
  processes = ["web"]  # Only web process serves HTTP
  internal_port = 3001
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = "80"

  [[services.ports]]
    handlers = ["tls", "http"]
    port = "443"

[env]
OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4318"
OTEL_SERVICE_NAME = "phalanxduel-server"
APP_ENV = "staging"
```

## Testing (Will be done in TASK-71/72)

```bash
# Set Sentry DSN secret (first time only)
fly secrets set SENTRY_DSN=https://...@sentry.io/... -a phalanxduel-staging

# Deploy image with both processes
fly deploy -a phalanxduel-staging

# Verify both processes are running
fly status -a phalanxduel-staging

# Check that app and collector are healthy
fly logs -a phalanxduel-staging | grep -E "web|otel"

# Verify collector is receiving telemetry
fly logs -a phalanxduel-staging | grep "Accepted"

# Verify traces in Sentry
# Check Sentry project dashboard for incoming traces
```

## Verification

- [ ] Procfile is syntactically valid
- [ ] fly.staging.toml and fly.production.toml have `[processes]` sections
- [ ] OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 in fly.toml `[env]`
- [ ] Dockerfile builds successfully with OTel binary included
- [ ] OTel collector binary path `/app/otel-collector/otelcol-contrib` is correct
- [ ] otel-collector-config.yaml ready and uses environment variables
- [ ] Health check configuration on port 13133 is present
- [ ] `fly config` validates both staging and production fly.toml files
- [ ] Documentation explains sidecar pattern and how to verify

## Depends On

- TASK-67: docker-compose.yml and otel-collector-config.yaml created
- TASK-69: App refactored to use OTEL_EXPORTER_OTLP_ENDPOINT

## Blocks

- TASK-71: Deploy collector to staging (executes this config)

## Related Tasks

- TASK-67: Create docker-compose.yml with OTel collector
- TASK-69: Refactor app telemetry to use OTLP
- TASK-70: Test locally with docker-compose
- TASK-71: Deploy to staging with sidecar
- TASK-72: Verify telemetry in Sentry

---

**Effort Estimate**: 1.5 hours
**Priority**: CRITICAL (Fly.io sidecar pattern setup)
**Complexity**: Medium (Fly.io process groups, Dockerfile multi-stage)
