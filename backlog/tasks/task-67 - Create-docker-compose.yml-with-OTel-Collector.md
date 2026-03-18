---
id: TASK-67
title: "Create docker-compose.yml with OTel Collector Integration"
status: To Do
priority: HIGH
assignee: null
parent: TASK-50
labels:
  - docker-compose
  - otel
  - local-development
dependencies:
  - TASK-69
blocks:
  - TASK-70
created: "2026-03-18"
updated: "2026-03-18"
---

# TASK-67: Create docker-compose.yml with OTel Collector Integration

## Description

Create production-feature-parity docker-compose environment with:
- Application container (phalanxduel)
- PostgreSQL database
- OpenTelemetry collector (with Sentry exporter)
- Network allowing app → collector communication on localhost

Developers run `docker compose up` and get full local stack with hot-reload.

## Acceptance Criteria

- [ ] docker-compose.yml created with all services
- [ ] App service runs on port 3001
- [ ] PostgreSQL service runs with auto-init volume
- [ ] OTel collector service runs on ports 4317 (gRPC), 4318 (HTTP)
- [ ] otel-collector-config.yaml created with Sentry exporter
- [ ] Dockerfile.otel created for collector image
- [ ] App environment variable: OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
- [ ] Services on same `phalanx` network
- [ ] Health checks for all services
- [ ] `docker compose up` brings up full stack successfully
- [ ] Telemetry flows from app → collector → Sentry

## Implementation

### Files to Create

1. **docker-compose.yml**
   - app service (hot-reload with volumes)
   - postgres service (with init scripts)
   - otel-collector service
   - phalanx network
   - postgres_data volume

2. **otel-collector-config.yaml**
   - receivers: OTLP (gRPC 4317, HTTP 4318)
   - processors: batch
   - exporters: Sentry (configured from env vars)
   - service pipelines: traces, metrics, logs

3. **Dockerfile.otel**
   - Base: otel/otelcol-contrib:latest
   - Copy config
   - Health check on port 13133
   - ENTRYPOINT to start collector

### Environment Variables

```yaml
app:
  environment:
    OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4318
    SENTRY_DSN: ${SENTRY_DSN}
    DATABASE_URL: postgresql://user:password@postgres:5432/phalanxduel

otel-collector:
  environment:
    SENTRY_DSN: ${SENTRY_DSN}
    APP_ENV: development
```

## Testing

```bash
# Start full stack
docker compose up --build

# Verify app is running
curl http://localhost:3001/health

# Verify collector is running
curl http://localhost:13133/healthz

# Verify postgres is running
docker compose exec postgres psql -U postgres -c "SELECT 1"

# Check telemetry flowing
docker compose logs otel-collector | grep "Accepted"

# Stop stack
docker compose down
```

## Verification

- [ ] `docker compose up` completes without errors
- [ ] App accessible on http://localhost:3001
- [ ] Collector accessible on http://localhost:4318
- [ ] PostgreSQL accessible on localhost:5432
- [ ] App can connect to PostgreSQL via docker-compose DNS
- [ ] Telemetry traces visible in collector logs
- [ ] Services communicate over phalanx network

## Depends On

- TASK-69: App refactored to accept OTEL_EXPORTER_OTLP_ENDPOINT

## Blocks

- TASK-70: Test collector + app integration locally

## Related Tasks

- TASK-68: Set up Fly.io collector deployment
- TASK-70: Test collector + app integration

---

**Effort Estimate**: 2.5 hours
**Priority**: HIGH (enables local docker-compose development)
**Complexity**: Medium (multi-service orchestration)
