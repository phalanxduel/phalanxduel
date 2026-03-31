# Fly.io Deployment Preparation Checklist

**Status**: OTel sidecar deployment ready for Fly.io  
**Date**: 2026-03-18  
**Target Apps**: `phalanxduel-staging` and `phalanxduel-production`

---

## Overview

Your Fly.io configuration is already set up for the OTel sidecar pattern. You need to prepare the following before deploying:

---

## Pre-Deployment Checklist

### 1. Fly.io CLI Tools ✅ (Verify)

Ensure you have `flyctl` installed and authenticated:

```bash
# Check version
flyctl --version

# Verify authentication
flyctl auth whoami

# Expected output: your Fly.io username or email
```

**Status**: Required ✅

---

### 2. Staging App (`phalanxduel-staging`) - Create if missing ⚠️

**Check if app exists**:
```bash
flyctl apps list | grep phalanxduel-staging
```

**If NOT listed, create it**:
```bash
flyctl launch --name phalanxduel-staging \
  --region ord \
  --skip-db \
  --copy-config
```

Or from existing config:
```bash
flyctl apps create phalanxduel-staging --org <your-org>
```

**Configuration**: Use `fly.staging.toml`

**Status**: Required - create if missing ⚠️

---

### 3. Production App (`phalanxduel-production`) - Create if missing ⚠️

**Check if app exists**:
```bash
flyctl apps list | grep phalanxduel-production
```

**If NOT listed, create it**:
```bash
flyctl apps create phalanxduel-production --org <your-org>
```

**Configuration**: Use `fly.production.toml`

**Status**: Required - create if missing ⚠️

---

### 4. Secrets - Set for Both Apps 🔑

The app and collector need these secrets:

#### Required Secrets

**`SENTRY_DSN`** (Sentry integration)

For staging:
```bash
flyctl secrets set SENTRY_DSN="<your-sentry-dsn>" -a phalanxduel-staging
```

For production:
```bash
flyctl secrets set SENTRY_DSN="<your-sentry-dsn>" -a phalanxduel-production
```

**Where to get it**:
1. Go to Sentry project settings
2. Copy the DSN from "Client Keys (DSN)"
3. Format: `https://[KEY]@sentry.io/[PROJECT_ID]`

**What it does**:
- Collector config reads `${SENTRY_DSN}` (line 31 in `otel-collector-config.yaml`)
- Traces are forwarded to Sentry via collector
- Error capturing works when `SENTRY_DSN` is set

#### Optional Secrets

**`DATABASE_URL`** (if using external database, not Fly Postgres)

```bash
flyctl secrets set DATABASE_URL="postgresql://user:pass@host:5432/db" -a phalanxduel-staging
flyctl secrets set DATABASE_URL="postgresql://user:pass@host:5432/db" -a phalanxduel-production
```

**Status**: Verify/set 🔑

---

### 5. PostgreSQL Database ✅

**Check current database setup**:

```bash
# For staging
flyctl postgres list -a phalanxduel-staging

# For production
flyctl postgres list -a phalanxduel-production
```

**Options**:

### Option A: Use Fly Postgres (Recommended for simplicity)**
```bash
# Create Postgres app for staging
flyctl postgres create -n phalanxduel-staging-db --org <your-org>

# Attach to staging app
flyctl postgres attach phalanxduel-staging-db -a phalanxduel-staging
```

This automatically sets `DATABASE_URL` secret.

### Option B: External Database**
- Set `DATABASE_URL` secret manually (see section 4)
- Ensure network access from Fly.io to your database

**Status**: Required - set up or verify ✅

---

### 6. Verify Fly.io Configuration Files ✅

**Check configuration is in place**:

```bash
# Verify files exist
ls -la fly.staging.toml fly.production.toml Procfile

# Check Procfile has both processes
grep "^web:\|^otel:" Procfile

# Expected output:
# web: node server/dist/index.js
# otel: /app/otel-collector/otelcol-contrib --config=/app/otel-collector-config.yaml
```

**Status**: Already in place ✅

---

### 7. Verify OTel Collector Config ✅

**Check collector config**:

```bash
# File should exist
cat otel-collector-config.yaml | head -30

# Should contain:
# - receivers: otlp (ports 4318 HTTP, 4317 gRPC)
# - processors: batch
# - exporters: sentry (uses ${SENTRY_DSN})
# - extensions: health_check (port 13133)
```

**Status**: Already in place ✅

---

### 8. Verify Docker Image ✅

**Pre-build locally to catch errors early**:

```bash
# Build locally
docker build -t phalanxduel:test .

# Verify OTel binary included
docker run --rm phalanxduel:test ls /app/otel-collector/otelcol-contrib

# Verify collector config included
docker run --rm phalanxduel:test cat /app/otel-collector-config.yaml | head -10
```

**Status**: Can be skipped if confident ✅

---

### 9. DNS and Networking ✅

**What's already configured**:
- App and collector both run in same Fly.io VM
- Both use `127.0.0.1` for communication (no network latency)
- Health checks configured correctly

**Status**: Already correct ✅

---

### 10. Deployment Verification - Staging First ⚠️

**Deploy to staging first**:

```bash
# Using staging config
flyctl deploy -c fly.staging.toml

# Watch deployment
flyctl logs -a phalanxduel-staging --follow
```

**Expected logs**:
```bash
[instrument.ts] Sentry not enabled. Using OTLP for all telemetry.
2026-03-18T...Z info otlpreceiver@v0.100.0/otlp.go:152 Starting HTTP server {"endpoint": "0.0.0.0:4318"}
```

**Check processes running**:
```bash
flyctl status -a phalanxduel-staging
```

**Expected output**:
- `web` process running (handles HTTP traffic)
- `otel` process running (collector sidecar)

**Test app endpoint**:
```bash
# Get staging domain
flyctl apps info phalanxduel-staging | grep Hostname

# Test health endpoint
curl https://<staging-domain>/health

# Expected response:
# {"status":"ok","timestamp":"...","version":"..."}
```

**Status**: Critical verification step ⚠️

---

### 11. Staging Validation Checklist ✅

Before moving to production, verify in staging:

- [ ] App health endpoint responds (`/health`)
- [ ] App readiness endpoint responds (`/ready`)
- [ ] Collector health endpoint responds (internal, port 13133)
- [ ] Traces reach Sentry (check Sentry project dashboard)
- [ ] Database migrations run successfully
- [ ] App serves traffic correctly
- [ ] Collector doesn't crash on startup
- [ ] Rolling deployments work smoothly
- [ ] Machines auto-scale and auto-stop correctly

**Status**: Required before production ✅

---

### 12. Production Deployment 🚀

Only after staging validation passes:

```bash
# Deploy to production
flyctl deploy -c fly.production.toml

# Watch deployment
flyctl logs -a phalanxduel-production --follow

# Verify status
flyctl status -a phalanxduel-production
```

**Key differences from staging** (in `fly.production.toml`):
- `min_machines_running = 1` (always at least 1 machine)
- `auto_stop_machines = false` (no auto-stop in production)
- Higher concurrency limits (200 soft, 250 hard)

**Status**: After staging validation 🚀

---

## Environment Variables Summary

### Automatically Set (in fly.toml)

```toml
APP_ENV = "staging" or "production"
NODE_ENV = "production"
PHALANX_SERVER_PORT = "3001"
OTEL_EXPORTER_OTLP_ENDPOINT = "http://127.0.0.1:4318"
```

### Set via Secrets

```bash
SENTRY_DSN = "https://[KEY]@sentry.io/[PROJECT_ID]"
DATABASE_URL = "postgresql://..." (if external DB)
```

### Collector Config References

```yaml
# In otel-collector-config.yaml
dsn: ${SENTRY_DSN}           # Uses SENTRY_DSN secret
environment: ${APP_ENV}      # Uses APP_ENV from fly.toml
```

---

## Troubleshooting

### Issue: Collector process crashes on startup

**Check logs**:
```bash
flyctl logs -a phalanxduel-staging | grep otel
```

**Common causes**:
- Missing `otel-collector-config.yaml` in image (run `docker build` locally to verify)
- Port 4318 already in use (shouldn't happen on Fly, check configuration)
- Invalid collector config YAML syntax (validate locally first)

**Fix**: Re-check Dockerfile and config, rebuild locally, redeploy.

---

### Issue: App can't connect to collector

**Check logs**:
```bash
flyctl logs -a phalanxduel-staging | grep "OTLP\|4318"
```

**Expected**:
```bash
[instrument.ts] Sentry not enabled. Using OTLP for all telemetry.
```

**If missing**:
- Collector may not be running (check `flyctl status`)
- Endpoint wrong (should be `http://127.0.0.1:4318`)
- Verify `OTEL_EXPORTER_OTLP_ENDPOINT` in fly.toml

---

### Issue: Traces not reaching Sentry

**Check**:
1. Is `SENTRY_DSN` secret set?
   ```bash
   flyctl secrets list -a phalanxduel-staging
   ```

2. Is collector config reading it?
   ```bash
   flyctl logs -a phalanxduel-staging | grep -i "sentry\|export"
   ```

3. Is app sending telemetry?
   ```bash
   # App should log this on startup:
   # [instrument.ts] Sentry not enabled. Using OTLP for all telemetry.
   ```

**Fix**: Verify `SENTRY_DSN` secret is set and valid in Sentry project.

---

### Issue: Database migrations pending

**Check logs**:
```bash
flyctl logs -a phalanxduel-staging | grep -i "migration"
```

**If app crashes on startup due to migrations**:
```bash
# Connect to app
flyctl ssh console -a phalanxduel-staging

# Run migrations manually
pnpm --filter @phalanxduel/server db:migrate

# Exit and restart app
exit
flyctl scale count 1 -a phalanxduel-staging  # Restart
```

---

## Summary: What to Do

| # | Item | Status | Action |
|---|------|--------|--------|
| 1 | Install `flyctl` | ✅ | Verify installed |
| 2 | Create `phalanxduel-staging` app | ⚠️ | Create if missing |
| 3 | Create `phalanxduel-production` app | ⚠️ | Create if missing |
| 4 | Set `SENTRY_DSN` secret (staging) | 🔑 | Set immediately |
| 5 | Set `SENTRY_DSN` secret (production) | 🔑 | Set immediately |
| 6 | Set up PostgreSQL | ✅ | Create or attach |
| 7 | Verify `fly.staging.toml` | ✅ | Already in place |
| 8 | Verify `fly.production.toml` | ✅ | Already in place |
| 9 | Verify `Procfile` | ✅ | Already in place |
| 10 | Deploy to staging | ⚠️ | Test first |
| 11 | Validate in staging | ⚠️ | 9-point checklist |
| 12 | Deploy to production | 🚀 | After staging OK |

---

## Minimum Required Steps (Quick Start)

If you want to deploy immediately:

```bash
# 1. Create apps (if not already created)
flyctl apps create phalanxduel-staging --org <your-org>
flyctl apps create phalanxduel-production --org <your-org>

# 2. Set Sentry secrets
flyctl secrets set SENTRY_DSN="<your-sentry-dsn>" -a phalanxduel-staging
flyctl secrets set SENTRY_DSN="<your-sentry-dsn>" -a phalanxduel-production

# 3. Set up database (Fly Postgres recommended)
flyctl postgres create -n phalanxduel-staging-db --org <your-org>
flyctl postgres attach phalanxduel-staging-db -a phalanxduel-staging

# 4. Deploy to staging
flyctl deploy -c fly.staging.toml

# 5. Verify
flyctl status -a phalanxduel-staging
flyctl logs -a phalanxduel-staging --follow

# 6. Deploy to production (only after staging works)
flyctl deploy -c fly.production.toml
```

---

**Verified by**: Gordon (Docker Infrastructure Expert)  
**Date**: 2026-03-18  
**Configuration Status**: Ready for deployment  
**Next Step**: Prepare Fly.io secrets and deploy to staging
