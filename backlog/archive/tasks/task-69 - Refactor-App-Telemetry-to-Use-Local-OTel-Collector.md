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
Decouple application telemetry from direct Sentry integration. App will send traces/metrics/logs to a local OpenTelemetry collector on 127.0.0.1:4318 (HTTP) or 127.0.0.1:4317 (gRPC). Collector handles all backend routing (Sentry, etc.).

This unblocks docker-compose integration (TASK-67) and Fly.io collector deployment (TASK-68).
<!-- SECTION:DESCRIPTION:END -->

# TASK-69: Refactor App Telemetry to Use Local OTel Collector

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 App accepts `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable
- [x] #2 Default: `http://127.0.0.1:4318` if not set
- [x] #3 Remove direct Sentry SDK exporter from instrument.ts
- [x] #4 Use OTLPTraceExporter instead for OTEL traces
- [x] #5 App sends traces/metrics/logs to collector, not Sentry directly
- [x] #6 No hardcoded backend configuration in app code
- [x] #7 All tests pass with new telemetry setup
- [x] #8 App can start with/without collector running (graceful degradation)

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
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318 pnpm dev:server

# Should start successfully (graceful degradation)
# Should log warning if collector not reachable

# With collector running:
docker run -p 4318:4318 otel/otelcol-contrib:latest

# Should send traces to collector successfully
```

## Verification

- [x] #9 Local dev: `pnpm dev:server` starts without collector (with warning)
- [x] #10 Local dev: traces sent to collector if collector is running
- [x] #11 Docker: `OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318` works
- [x] #12 Tests: All tests pass with new setup
- [x] #13 No hardcoded Sentry endpoint in source code

## Risk Assessment

**Risk Level**: Low
- Only refactoring observability layer
- Error handling (Sentry SDK) remains unchanged
- App can start without collector (graceful degradation)

## Blocks

- TASK-67: Create docker-compose.yml (needs app to support 127.0.0.1:4318)
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

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [x] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [x] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [x] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [x] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [x] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [x] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->