---
id: TASK-69
title: "Refactor App Telemetry to Use Local OTel Collector"
status: To Do
priority: CRITICAL
assignee: null
parent: TASK-50
labels:
  - observability
  - otel
  - architecture
dependencies: []
blocks:
  - TASK-67
  - TASK-68
created: "2026-03-18"
updated: "2026-03-18"
---

# TASK-69: Refactor App Telemetry to Use Local OTel Collector

## Description

Decouple application telemetry from direct Sentry integration. App will send traces/metrics/logs to a local OpenTelemetry collector on localhost:4318 (HTTP) or localhost:4317 (gRPC). Collector handles all backend routing (Sentry, etc.).

This unblocks docker-compose integration (TASK-67) and Fly.io collector deployment (TASK-68).

## Acceptance Criteria

- [ ] App accepts `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable
- [ ] Default: `http://localhost:4318` if not set
- [ ] Remove direct Sentry SDK exporter from instrument.ts
- [ ] Use OTLPTraceExporter instead for OTEL traces
- [ ] App sends traces/metrics/logs to collector, not Sentry directly
- [ ] No hardcoded backend configuration in app code
- [ ] All tests pass with new telemetry setup
- [ ] App can start with/without collector running (graceful degradation)

## Implementation

### Changes to `server/src/instrument.ts`

1. Replace direct Sentry exporter with OTLP exporter
2. Keep Sentry SDK for error capturing (errors still go to Sentry)
3. Configure OTLP endpoint from environment variable
4. Add fallback/logging if collector unreachable

### Key Points

- App still captures errors/exceptions (Sentry SDK remains)
- App sends structured traces/metrics to collector on port 4318
- Collector decides where traces go (Sentry exporter in collector config)
- No changes needed to error handling code

## Testing

```bash
# Start app without collector
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 pnpm dev:server

# Should start successfully (graceful degradation)
# Should log warning if collector not reachable

# With collector running:
docker run -p 4318:4318 otel/otelcol-contrib:latest

# Should send traces to collector successfully
```

## Verification

- [ ] Local dev: `pnpm dev:server` starts without collector (with warning)
- [ ] Local dev: traces sent to collector if collector is running
- [ ] Docker: `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` works
- [ ] Tests: All tests pass with new setup
- [ ] No hardcoded Sentry endpoint in source code

## Risk Assessment

**Risk Level**: Low
- Only refactoring observability layer
- Error handling (Sentry SDK) remains unchanged
- App can start without collector (graceful degradation)

## Blocks

- TASK-67: Create docker-compose.yml (needs app to support localhost:4318)
- TASK-68: Set up Fly.io collector deployment (needs app refactored)

## Related Tasks

- TASK-67: Create docker-compose.yml with OTel collector
- TASK-68: Set up Fly.io collector deployment
- TASK-70: Test collector + app integration locally

---

**Effort Estimate**: 2 hours
**Priority**: CRITICAL (blocks Phase 2 collector integration)
**Complexity**: Medium (refactoring observability)
