---
id: TASK-67
title: Create docker-compose.yml with OTel Collector Integration
status: Done
assignee:
  - 'null'
created_date: ''
updated_date: '2026-03-18 22:01'
labels:
  - docker-compose
  - otel
  - local-development
dependencies:
  - TASK-69
priority: high
ordinal: 56000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-69
<!-- SECTION:DESCRIPTION:END -->

# TASK-67: Create docker-compose.yml with OTel Collector Integration

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 docker-compose.yml created with all services
- [ ] #2 App service runs on port 3001
- [ ] #3 PostgreSQL service runs with auto-init volume
- [ ] #4 OTel collector service runs on ports 4317 (gRPC), 4318 (HTTP)
- [ ] #5 otel-collector-config.yaml created with Sentry exporter
- [ ] #6 Dockerfile.otel created for collector image
- [ ] #7 App environment variable: OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
- [ ] #8 Services on same `phalanx` network
- [ ] #9 Health checks for all services
- [ ] #10 `docker compose up` brings up full stack successfully
- [ ] #11 Telemetry flows from app → collector → Sentry

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

- [ ] #12 `docker compose up` completes without errors
- [ ] #13 App accessible on http://localhost:3001
- [ ] #14 Collector accessible on http://localhost:4318
- [ ] #15 PostgreSQL accessible on localhost:5432
- [ ] #16 App can connect to PostgreSQL via docker-compose DNS
- [ ] #17 Telemetry traces visible in collector logs
- [ ] #18 Services communicate over phalanx network

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
<!-- AC:END -->
