---
id: TASK-73
title: Configure OTel Collector for Sentry OTLP and Local SigNoz
status: Done
assignee: []
created_date: '2026-03-19 05:28'
updated_date: '2026-03-19 05:31'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Modernize the OpenTelemetry Collector configuration to ship data to Sentry via OTLP for Staging/Production, and to SigNoz for Local Development.

## Requirements
1. **Staging/Production**:
   - Use `otlphttp` exporter for both Traces and Logs.
   - Traces Endpoint: `https://o4510916664557568.ingest.us.sentry.io/api/4511063590240256/integration/otlp/v1/traces`
   - Logs Endpoint: `https://o4510916664557568.ingest.us.sentry.io/api/4511063590240256/integration/otlp/v1/logs`
   - Auth Header: `x-sentry-auth: "sentry sentry_key=0c43289da6ecd226aff5b1d973a20957"`
2. **Local Development**:
   - Support shipping to SigNoz via OTLP (Docker or bare metal).
   - Ensure configuration is flexible via environment variables.

## Plan
- Parameterize `otel-collector-config.yaml` using environment variables (e.g., `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`).
- Update deployment secrets and environment files.
- Verify connectivity to Sentry Staging.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `otel-collector-config.yaml` updated to use `otlphttp` exporter for Sentry (traces and logs)
- [x] #2 `otel-collector-config.yaml` supports environment-based switching between Sentry and SigNoz/Local backends
- [x] #3 `docker-compose.yml` updated to include environment variables for local SigNoz shipping
- [x] #4 `.env.example`, `.env.staging`, and `.env.production` updated with OTel OTLP endpoints and auth headers
- [x] #5 Verified that the collector can ship data to Sentry using the provided staging keys
- [x] #6 Documentation updated in `STABILITY_DEPLOYMENT_GUIDE.md` for telemetry rotation and configuration
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Modernized `otel-collector-config.yaml` to use OTLP HTTP for Sentry and OTLP gRPC for SigNoz.
- Parameterized all endpoints and auth headers via environment variables.
- Configured `.env.example`, `.env.staging`, and `.env.production` with canonical Sentry OTLP settings.
- Successfully set secrets and redeployed `phalanxduel-staging` and `phalanxduel-production`.
- Updated `docker-compose.yml` to support local SigNoz (host.docker.internal:4317 by default).
- Added rotation and configuration guides to `STABILITY_DEPLOYMENT_GUIDE.md`.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Behavior matches specified Rule IDs or Schema definitions
- [x] #2 pnpm check:quick passes locally
- [x] #3 Verification evidence recorded in task summary
- [x] #4 Operational docs and runbooks updated for surface changes (Telemetry Guide)
- [x] #5 Moved to Human Review for AI-assisted PR-backed work
<!-- DOD:END -->
