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

Configure Fly.io to run OTel collector alongside main app. Two deployment options:

**Option A (Simple)**: Multi-process in single fly.toml (collector + app as separate processes)
**Option B (Recommended)**: Separate Fly.io app for collector (independent scaling/updates)

This task prepares the configuration. TASK-71 executes the actual deployment.

## Acceptance Criteria

- [ ] fly.collector.toml created for collector app
- [ ] fly.toml updated with collector environment variables
- [ ] Dockerfile.otel builds successfully for Fly.io
- [ ] Collector health check configured (port 13133)
- [ ] OTel receiver ports configured (4317 gRPC, 4318 HTTP)
- [ ] otel-collector-config.yaml uses environment variables for backends
- [ ] App environment variable set: OTEL_EXPORTER_OTLP_ENDPOINT=http://phalanxduel-collector-staging.internal:4318
- [ ] Sentry DSN passed from Fly.io secrets to collector
- [ ] Scaling configuration defined (min/max machines)
- [ ] Documentation: How to deploy and verify

## Implementation

### Files to Create/Modify

1. **fly.collector.toml**
   - `app = "phalanxduel-collector-staging"` (or production)
   - `primary_region = "ord"`
   - `[build]` with Dockerfile.otel
   - `[env]` with SENTRY_DSN, APP_ENV
   - `[[services]]` on port 4318
   - Health check on port 13133
   - Scaling: min_machines=1, max_machines=2

2. **otel-collector-config.yaml** (Updated)
   - Use ${SENTRY_DSN} from environment
   - Use ${APP_ENV} for environment tag
   - Export traces to Sentry with environment context

3. **Dockerfile.otel** (if not already in TASK-67)
   - Base: otel/otelcol-contrib:latest
   - Copy otel-collector-config.yaml
   - Health check
   - Port 4318 exposed

4. **fly.toml** (Main App)
   - Add env var: OTEL_EXPORTER_OTLP_ENDPOINT
   - For staging: `http://phalanxduel-collector-staging.internal:4318`
   - For production: `http://phalanxduel-collector-production.internal:4318`

### Deployment Architecture

```text
Fly.io Staging:
├─ phalanxduel-staging (main app)
│  └─ OTEL_EXPORTER_OTLP_ENDPOINT=http://phalanxduel-collector-staging.internal:4318
│
└─ phalanxduel-collector-staging (OTel collector)
   ├─ Receives: :4317 (gRPC), :4318 (HTTP)
   ├─ Exports: Sentry (via SENTRY_DSN secret)
   └─ Internal DNS: phalanxduel-collector-staging.internal

Fly.io Production:
├─ phalanxduel-production (main app)
│  └─ OTEL_EXPORTER_OTLP_ENDPOINT=http://phalanxduel-collector-production.internal:4318
│
└─ phalanxduel-collector-production (OTel collector)
   ├─ Receives: :4317 (gRPC), :4318 (HTTP)
   ├─ Exports: Sentry (via SENTRY_DSN secret)
   └─ Internal DNS: phalanxduel-collector-production.internal
```

### Scaling Configuration

```toml
fly.collector.toml
[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512

# Scaling
[http_service]
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1
  max_machines_running = 2
```

## Testing (Will be done in TASK-71/72)

```bash
# Deploy collector app
fly deploy --config fly.collector.toml

# Deploy main app with env var pointing to collector
fly deploy --app phalanxduel-staging

# Verify collector is receiving telemetry
fly logs --app phalanxduel-collector-staging | grep "Accepted"

# Verify traces in Sentry
# Check Sentry project for incoming traces
```

## Verification

- [ ] fly.collector.toml is syntactically valid (use `fly config`)
- [ ] fly.toml app has OTEL_EXPORTER_OTLP_ENDPOINT set correctly
- [ ] otel-collector-config.yaml uses environment variables
- [ ] Dockerfile.otel builds locally without errors
- [ ] Health check configuration is correct
- [ ] Documentation explains how to verify telemetry flow

## Depends On

- TASK-69: App refactored to use OTEL_EXPORTER_OTLP_ENDPOINT

## Blocks

- TASK-71: Deploy collector to staging (executes this config)

## Related Tasks

- TASK-69: Refactor app telemetry
- TASK-67: Create docker-compose.yml
- TASK-71: Deploy to staging
- TASK-72: Verify telemetry flow

---

**Effort Estimate**: 2 hours
**Priority**: CRITICAL (Fly.io deployment architecture)
**Complexity**: Medium (Fly.io multi-app coordination)
