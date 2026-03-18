---
id: TASK-71
title: Deploy OTel Collector to Staging & Production (Fly.io)
status: Done
assignee:
  - 'null'
created_date: ''
updated_date: '2026-03-18 22:01'
labels:
  - flyio
  - otel
  - deployment
  - production
dependencies:
  - TASK-68
  - TASK-70
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-68,TASK-70
<!-- SECTION:DESCRIPTION:END -->

# TASK-71: Deploy OTel Collector to Staging & Production (Fly.io)

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Collector app deployed to staging: phalanxduel-collector-staging
- [ ] #2 Collector app deployed to production: phalanxduel-collector-production
- [ ] #3 Both collector apps show as "deployed" in `fly apps list`
- [ ] #4 Staging collector health check passing (HTTP 200 on :13133)
- [ ] #5 Production collector health check passing
- [ ] #6 Main app (staging) configured to point to collector: OTEL_EXPORTER_OTLP_ENDPOINT=http://phalanxduel-collector-staging.internal:4318
- [ ] #7 Main app (production) configured to point to collector: OTEL_EXPORTER_OTLP_ENDPOINT=http://phalanxduel-collector-production.internal:4318
- [ ] #8 Both main apps re-deployed with env var changes
- [ ] #9 Collector receiving requests from app (check logs)
- [ ] #10 No errors in app or collector logs

## Deployment Steps

### Step 1: Prepare Fly.io

```bash
# Verify CLI is authenticated
fly auth whoami

# Verify existing apps
fly apps list
# Should show: phalanxduel-staging, phalanxduel-production, (no collectors yet)
```

### Step 2: Create Collector Apps

```bash
# Create staging collector app
fly apps create phalanxduel-collector-staging

# Create production collector app
fly apps create phalanxduel-collector-production

# Verify creation
fly apps list
```

### Step 3: Set Secrets for Collectors

```bash
# Staging collector secrets
fly secrets set --app phalanxduel-collector-staging \
  SENTRY_DSN="${SENTRY_DSN}" \
  APP_ENV="staging"

# Production collector secrets
fly secrets set --app phalanxduel-collector-production \
  SENTRY_DSN="${SENTRY_DSN}" \
  APP_ENV="production"

# Verify
fly secrets list --app phalanxduel-collector-staging
fly secrets list --app phalanxduel-collector-production
```

### Step 4: Deploy Collectors

```bash
# Deploy staging collector
fly deploy --config fly.collector.toml --app phalanxduel-collector-staging

# Monitor logs during deploy
fly logs --app phalanxduel-collector-staging

# Deploy production collector
fly deploy --config fly.collector.toml --app phalanxduel-collector-production

# Monitor logs
fly logs --app phalanxduel-collector-production
```

### Step 5: Update Main App Environment Variables

```bash
# Staging: Set collector endpoint
fly secrets set --app phalanxduel-staging \
  OTEL_EXPORTER_OTLP_ENDPOINT="http://phalanxduel-collector-staging.internal:4318"

# Production: Set collector endpoint
fly secrets set --app phalanxduel-production \
  OTEL_EXPORTER_OTLP_ENDPOINT="http://phalanxduel-collector-production.internal:4318"
```

### Step 6: Re-deploy Main Apps

```bash
# Staging app with new env var
fly deploy --app phalanxduel-staging

# Monitor logs
fly logs --app phalanxduel-staging

# Production app with new env var
fly deploy --app phalanxduel-production

# Monitor logs
fly logs --app phalanxduel-production
```

### Step 7: Verify Health

```bash
# Collector health checks
fly ssh console --app phalanxduel-collector-staging
# curl http://localhost:13133/healthz

fly ssh console --app phalanxduel-collector-production
# curl http://localhost:13133/healthz

# App connectivity
curl -s https://phalanxduel-staging.fly.dev/health | jq .
curl -s https://phalanxduel-production.fly.dev/health | jq .
```

### Step 8: Monitor Telemetry Flow

```bash
# Check collector is receiving traces
fly logs --app phalanxduel-collector-staging | grep -i "accepted\|span\|metric"
fly logs --app phalanxduel-collector-production | grep -i "accepted\|span\|metric"

# Check app logs for any collector connection errors
fly logs --app phalanxduel-staging | grep -i "collector\|otel\|error"
fly logs --app phalanxduel-production | grep -i "collector\|otel\|error"
```

## Verification

- [ ] #11 Collector apps exist in Fly.io: `fly apps list | grep collector`
- [ ] #12 Collectors are "deployed" status: `fly status --app phalanxduel-collector-staging`
- [ ] #13 Health checks pass (HTTP 200 on port 13133)
- [ ] #14 Main apps have OTEL_EXPORTER_OTLP_ENDPOINT set
- [ ] #15 App health checks still passing
- [ ] #16 Collector logs show "Accepted" spans/metrics from app
- [ ] #17 No connection errors in app logs

## Rollback Plan

If deployment fails:

```bash
# Unset the environment variable on main app
fly secrets unset --app phalanxduel-staging OTEL_EXPORTER_OTLP_ENDPOINT

# Redeploy main app (goes back to direct Sentry)
fly deploy --app phalanxduel-staging

# If collector app is broken, destroy it
fly apps destroy phalanxduel-collector-staging

# Go back to TASK-68 to fix configuration
```

## Depends On

- TASK-68: Fly.io collector configuration prepared
- TASK-70: Local integration tests passing (validates approach works)

## Blocks

- TASK-72: Verify collector telemetry in production (final validation)

## Related Tasks

- TASK-68: Fly.io configuration
- TASK-69: App refactoring
- TASK-70: Local testing
- TASK-72: Production verification

---

**Effort Estimate**: 1.5 hours (manual deployment + monitoring)
**Priority**: CRITICAL (production deployment)
**Complexity**: Medium (Fly.io CLI and multi-app coordination)
<!-- AC:END -->
