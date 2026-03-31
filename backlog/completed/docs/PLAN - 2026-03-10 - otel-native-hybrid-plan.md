# 2026-03-10 OTel Native + Sentry Hybrid Plan

## Objective

Migrate observability to OpenTelemetry-native instrumentation while retaining Sentry for:

- error capture and triage
- release/environment correlation
- source map/release workflows

Use this plan as the canonical restart context for observability work.

This is a fix-forward migration with minimal runtime disruption.

## Scope

In scope:

- traces, metrics, and logs emitted in OTel-native shape
- local/dev collector-first pipeline to SigNoz
- preserving Sentry crash/error and release capabilities

Out of scope for this phase:

- removing Sentry entirely
- broad infrastructure redesign outside observability

## Current Baseline (already implemented)

Codebase status as of this plan:

1. `ae364218` - OTLP-only mode works when Sentry DSN is unset.
2. `53d2a3f9` - opt-in `console.*` forwarding to OTLP logs.
3. `be678d26` - fixed dual-export trace hookup with Sentry via `openTelemetrySpanProcessors`, normalized OTLP endpoint handling, and env precedence fixes.
4. `dd0c2010` - added collector-first local SigNoz forwarder:
   - `pnpm otel:signoz`
   - collector config tails `logs/server.log` + forwards OTLP to SigNoz.

## Design Direction

### Target split of responsibilities

OpenTelemetry:

- canonical instrumentation for traces/metrics/logs
- vendor-neutral signal model
- routing via OTel Collector

Sentry:

- error capture (`captureException`, Fastify error handler)
- release/environment/tagging workflow
- source map upload and release tracking

### Principle

Do not couple core signal generation to Sentry-specific tracing/metrics APIs.
Treat Sentry as an error/release backend, not as the primary telemetry model.

## Migration Phases

## Phase 1: Stabilize Collector-First Local Flow

Status: complete for initial local path.

Actions:

1. Keep `pnpm otel:signoz` as the default local workflow.
2. Keep app OTLP endpoint pointed at collector intake (default `http://127.0.0.1:4320`).
3. Keep `OTEL_CONSOLE_LOGS_ENABLED` off by default to avoid log duplication when Pino file logs are already ingested.

Acceptance:

- traces visible in SigNoz after `POST /matches`
- Pino/Fastify logs visible in SigNoz from `logs/server.log`
- no app-side crashes when SigNoz/collector is unavailable

## Phase 2: Replace Sentry-Centric Span/Metrics Wrappers in Server

Status: complete on 2026-03-10.

This phase replaced the remaining Sentry-centric wrappers that were in:

- `server/src/metrics.ts` (`Sentry.metrics.*`, `Sentry.startSpan`)
- `server/src/telemetry.ts` (`Sentry.startSpan`)

Completed:

- introduced `server/src/observability.ts` for OTel-native span and metric helpers
- ported `server/src/metrics.ts`, `server/src/telemetry.ts`, and `server/src/tracing.ts`
  to `tracer.startActiveSpan` / OTel meter instruments
- removed remaining direct `Sentry.metrics.*` call sites in `server/src/match.ts` and
  `server/src/app.ts`
- added unit coverage for the new observability seam and game telemetry wrapper behavior

Actions:

1. Introduce OTel-native wrapper utilities for:
   - span lifecycle (`tracer.startActiveSpan`)
   - counters/histograms via OTel meter
2. Port call sites from `Sentry.startSpan`/`Sentry.metrics.*` to OTel wrappers.
3. Keep Sentry error reporting calls where they add value (`captureException`, error handler).

Acceptance:

- no behavioral regressions in game flow
- spans/metrics still present in SigNoz
- Sentry still receives exceptions and attaches release/env context

## Phase 3: Tighten Sentry to Error/Release Only

Status: planned.

Actions:

1. Audit `Sentry.init` options in `server/src/instrument.ts`.
2. Keep only required Sentry integrations for error and release workflows.
3. Remove accidental dependence on Sentry APIs for non-error telemetry.

Acceptance:

- Sentry issues remain high-quality for crashes/errors
- release/sourcemap workflows remain intact
- core telemetry remains functional when Sentry DSN is absent

## Phase 4: CI/Verification Guardrails

Status: partially in place.

Actions:

1. Add smoke checks for:
   - OTLP-only mode
   - Sentry+OTLP hybrid mode
   - collector-forwarded local mode
2. Keep Node compatibility matrix checks (Node 24 and 25) to surface migration risk early.

Acceptance:

- hybrid regressions are caught before merge
- local dev flow remains reproducible

## Risks and Mitigations

Risk: duplicate logs (console OTLP + filelog ingestion).
Mitigation: keep `OTEL_CONSOLE_LOGS_ENABLED` disabled in collector-first mode unless explicitly needed.

Risk: endpoint/path misconfiguration (`/v1/*` duplication).
Mitigation: endpoint normalization already implemented in instrumentation.

Risk: shell env overrides ignored by `.env.local`.
Mitigation: external env precedence already implemented in `server/src/loadEnv.ts`.

Risk: lock-in to Sentry SDK semantics.
Mitigation: move span/metric generation to OTel wrappers first.

## Restart Checklist

When resuming work, do this first:

1. Confirm branch is `main` and clean.
2. Start collector forwarding to SigNoz:
   - `pnpm otel:signoz`
3. Start server with collector intake endpoint:
   - `OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4320 OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf pnpm dev:server`
4. Validate with:
   - `curl -i -X POST http://127.0.0.1:3001/matches`
5. Continue with Phase 3 cleanup in `server/src/instrument.ts`.

## Files to Touch Next (Phase 3)

- `server/src/instrument.ts`
- `server/src/sentry-smoke-test.ts`
- tests or smoke checks for hybrid and collector-first startup paths
