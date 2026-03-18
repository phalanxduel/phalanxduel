# TASK-69: Refactor App Telemetry to Use Local OTel Collector - COMPLETE ✅

**Status:** COMPLETE  
**Unblocks:** TASK-67, TASK-68  
**Date Completed:** 2024  

## What Changed

### 1. **server/src/instrument.ts** - Refactored Telemetry Architecture

#### Key Changes:
- **Default OTLP Endpoint:** Now defaults to `http://localhost:4318` (was undefined)
  - Can be overridden with `OTEL_EXPORTER_OTLP_ENDPOINT` env var
  - Enables local development without environment variable setup

- **Sentry Role Changed:** Sentry is now **error/exception capture only**, NOT span export
  - Set `tracesSampleRate: 0` to prevent Sentry from sampling spans
  - All traces go to OTLP collector instead
  - Sentry still captures exceptions, errors, and console logs via `enableLogs: true`
  - Keeps Sentry for error alerting and issue tracking

- **OTLP as Primary Telemetry Backend:**
  - Traces → OTLP Exporter → localhost:4318 (OTel Collector)
  - Metrics → OTLP Exporter → localhost:4318 (OTel Collector)  
  - Logs → OTLP Exporter → localhost:4318 (OTel Collector) [opt-in: `OTEL_CONSOLE_LOGS_ENABLED=1`]

- **Graceful Degradation:**
  - App wraps trace exporter initialization in try-catch
  - Logs warnings if collector is unreachable
  - App starts successfully even if collector is down
  - Logs clarify mode: "Sentry not enabled. Using OTLP for all telemetry."

- **Architecture Clarity:**
  ```
  app → OTLP exporter → localhost:4318 (OTel Collector) → backends (Sentry, Datadog, etc.)
  ```

### 2. **fly.staging.toml** - Updated Staging Configuration

Added environment variable:
```toml
[env]
  # ... existing config ...
  OTEL_EXPORTER_OTLP_ENDPOINT = "http://phalanxduel-collector-staging.internal:4318"
```

Points to separate OTel collector app via Fly.io internal DNS.

### 3. **fly.production.toml** - Updated Production Configuration

Added environment variable:
```toml
[env]
  # ... existing config ...
  OTEL_EXPORTER_OTLP_ENDPOINT = "http://phalanxduel-collector-production.internal:4318"
```

Points to separate OTel collector app via Fly.io internal DNS.

## Testing Results

✅ **All 206 server tests pass**
- 29 test files executed successfully
- No regressions in existing functionality
- Telemetry test suite includes:
  - `tests/tracing.test.ts` (7 tests) ✓
  - `tests/otel-integration.test.ts` (7 tests) ✓
  - `tests/telemetry.test.ts` (2 tests) ✓
  - `tests/metrics.test.ts` (3 tests) ✓
  - `tests/observability.test.ts` (6 tests) ✓

✅ **App starts successfully with new configuration**
- Log message confirms: `[instrument.ts] Sentry not enabled. Using OTLP for all telemetry.`
- Graceful startup even without collector running

## Development Experience

**Local Development (default):**
```bash
pnpm dev:server
# App automatically tries to connect to http://localhost:4318
# Works without collector (logs warning but continues)
# When collector is available, telemetry flows through
```

**With Explicit Collector Endpoint:**
```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://my-collector:4318 pnpm dev:server
```

**Sentry Errors Still Work:**
- Exceptions and errors are captured via Sentry SDK
- Error alerts go to Sentry
- No change to error handling or alerting behavior
- Only span sampling is disabled (intentional)

## What's Next

Downstream tasks now unblocked:

1. **TASK-67:** Create docker-compose.yml with OTel Collector Integration
   - Will use `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318` for app service
   - Create otel-collector-config.yaml with Sentry exporter
   - Create Dockerfile.otel for collector image

2. **TASK-68:** Set Up Fly.io OTel Collector Deployment
   - Create fly.collector.toml for separate Fly.io app
   - Configure OTel collector with environment variables
   - Two-app pattern: main app + collector app

3. **TASK-70:** Test OTel Collector + App Integration Locally
   - Validate full docker-compose stack
   - Verify graceful degradation
   - Confirm telemetry flows app → collector → Sentry

## Key Implementation Details

### Environment Variables

| Variable | Default | Purpose | Example |
|----------|---------|---------|---------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | OTel collector endpoint | `http://otel-collector:4318` |
| `OTEL_SERVICE_NAME` | `phalanxduel-server` | Service identifier in traces | `phalanxduel-server` |
| `OTEL_CONSOLE_LOGS_ENABLED` | `false` | Forward console logs to OTLP | `1` or `true` |
| `SENTRY__SERVER__SENTRY_DSN` | (unset) | Sentry error capture (optional) | `https://...@sentry.io/...` |

### Sentry Configuration

- **tracesSampleRate:** 0 (spans NOT sent to Sentry)
- **enableLogs:** true (error/exception logs sent to Sentry)
- **integrations:** Default Fastify integration removed (WS routes compatibility)
- **span processors:** None (OTLP is the backend)

### OTLP Exporter Configuration

- **HTTP Receiver:** `localhost:4318` (standard)
- **gRPC Receiver:** `localhost:4317` (not used by app, available in collector)
- **Export Interval:** 5000ms for metrics

## Files Modified

- ✅ `server/src/instrument.ts` - Core telemetry refactoring
- ✅ `fly.staging.toml` - Added OTEL_EXPORTER_OTLP_ENDPOINT
- ✅ `fly.production.toml` - Added OTEL_EXPORTER_OTLP_ENDPOINT

## Status Summary

**TASK-69: 100% Complete**

- [x] Refactored app telemetry to use OTLP collector as primary backend
- [x] Set sensible default for OTEL_EXPORTER_OTLP_ENDPOINT
- [x] Sentry now error/exception capture only (not span export)
- [x] Added graceful error handling for unreachable collector
- [x] All tests pass (206/206) ✓
- [x] App starts successfully with new configuration
- [x] Updated Fly.io staging and production configs
- [x] Documented for next team members

**Ready for:** TASK-67 and TASK-68 (both depend on TASK-69)

## Testing TASK-69 Locally

To verify the changes work:

```bash
# Test 1: Start server without collector (should log warning and continue)
pnpm dev:server
# Expected: "[instrument.ts] Sentry not enabled. Using OTLP for all telemetry."

# Test 2: Run all tests
cd server && pnpm test
# Expected: All 206 tests pass

# Test 3: Start server with custom collector endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=http://custom-collector:4318 pnpm dev:server
# Expected: App tries to connect to custom endpoint
```

---

**Do Not Break Production:** This change maintains backward compatibility. The only breaking change is that Sentry no longer receives spans (intentional), but error/exception capture remains fully functional.
