---
id: TASK-69
title: Refactor App Telemetry to Use Local OTel Collector
status: Done
assignee:
  - 'null'
created_date: ''
updated_date: '2026-03-18 21:54'
labels:
  - observability
  - otel
  - architecture
dependencies: []
ordinal: 48000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decouple application telemetry from direct Sentry integration. App will send traces/metrics/logs to a local OpenTelemetry collector on localhost:4318 (HTTP) or localhost:4317 (gRPC). Collector handles all backend routing (Sentry, etc.).

This unblocks docker-compose integration (TASK-67) and Fly.io collector deployment (TASK-68).
<!-- SECTION:DESCRIPTION:END -->

# TASK-69: Refactor App Telemetry to Use Local OTel Collector

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 App accepts `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable
- [ ] #2 Default: `http://localhost:4318` if not set
- [ ] #3 Remove direct Sentry SDK exporter from instrument.ts
- [ ] #4 Use OTLPTraceExporter instead for OTEL traces
- [ ] #5 App sends traces/metrics/logs to collector, not Sentry directly
- [ ] #6 No hardcoded backend configuration in app code
- [ ] #7 All tests pass with new telemetry setup
- [ ] #8 App can start with/without collector running (graceful degradation)

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

- [ ] #9 Local dev: `pnpm dev:server` starts without collector (with warning)
- [ ] #10 Local dev: traces sent to collector if collector is running
- [ ] #11 Docker: `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` works
- [ ] #12 Tests: All tests pass with new setup
- [ ] #13 No hardcoded Sentry endpoint in source code

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
<!-- AC:END -->
