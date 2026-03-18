---
id: TASK-66
title: "Set Up Fly.io Staging Environment with Auto-Deploy"
status: In Progress
priority: CRITICAL
assignee: null
parent: TASK-50
labels:
  - infrastructure
  - flyio
  - staging
  - ci-cd
created: "2025-03-17"
updated: "2025-03-17"
---

# TASK-66: Set Up Fly.io Staging Environment with Auto-Deploy

## Description

Create a complete Fly.io staging environment that mirrors production configuration. Set up auto-deployment on every `main` branch push via GitHub Actions, enabling Phase 1 hardened images to be tested in production-like conditions before promoting to production.

This is a prerequisite for Phase 1 verification: all hardened Docker images will be tested on staging before production deployment.

## Acceptance Criteria

- [ ] Fly.io staging app created: `phalanxduel-staging`
- [ ] DNS configured: `play-staging.phalanxduel.com` → staging app
- [ ] TLS/HTTPS working on staging domain
- [ ] `fly.toml` staging variant created with scaled-down resources
- [ ] PostgreSQL staging database configured (recommend: Neon branch)
- [ ] Fly.io secrets set for staging (separate from production)
- [ ] GitHub Actions workflow auto-deploys on `main` push
- [ ] Manual deploy via `fly deploy --app phalanxduel-staging` works
- [ ] Staging app health checks passing
- [ ] Database migrations auto-run on staging deploys
- [ ] Production secrets/data completely isolated from staging

## Implementation Plan

### Step 1: Create Fly.io Staging App

```bash
# Login to Fly.io (if not already)
flyctl auth login

# Create staging app
flyctl apps create phalanxduel-staging

# Verify creation
flyctl apps list
# Should show both "phalanxduel" (prod) and "phalanxduel-staging" (staging)
```

### Step 2: Create Staging fly.toml

Create `fly.staging.toml` with scaled-down configuration:

```toml
app = "phalanxduel-staging"
primary_region = "ord"

[deploy]
  release_command = "node server/dist/db/migrate.js"
  strategy = "rolling"

[processes]
  web = "node server/dist/index.js"

[http_service]
  processes = ["web"]
  internal_port = 3001
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  
  # Staging: lower concurrency limits than production
  [http_service.concurrency]
    type = "requests"
    hard_limit = 10
    soft_limit = 8

[[http_service.checks]]
  grace_period = "30s"
  interval = "15s"
  method = "GET"
  path = "/health"
  timeout = "10s"

[env]
  NODE_ENV = "production"
  PORT = "3001"
  HOST = "0.0.0.0"

# Staging: Smaller/cheaper machine
[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"

# Optional: Scale to 0 when not in use (save cost)
[autoscaling]
  min_machines = 0
  max_machines = 1
```

### Step 3: Configure PostgreSQL for Staging

**Option A: Neon Branch (Recommended)**

Create a separate branch in your existing Neon project:

```bash
# In Neon console: https://console.neon.tech/app/projects
# 1. Go to your existing phalanxduel project
# 2. Branches → Create Branch
# 3. Name: "staging" or "staging-main"
# 4. Copy connection string
# 5. Set Fly.io secret (see Step 4)
```

**Option B: Separate Neon Project**

Create entirely separate Neon project:

```bash
# In Neon console:
# 1. Create new project: "phalanxduel-staging"
# 2. Create database: "phalanxduel"
# 3. Copy connection string
# 4. Set Fly.io secret (see Step 4)
```

**Recommendation**: Use Option A (branch) to share schema but isolate data.

### Step 4: Set Fly.io Staging Secrets

Set all required secrets for staging app (separate from production):

```bash
# Set database URL (from Neon branch/project above)
flyctl secrets set \
  --app phalanxduel-staging \
  DATABASE_URL="postgresql://user:password@host/dbname"

# Set Sentry DSNs (can use same project, tag as "staging" environment)
flyctl secrets set \
  --app phalanxduel-staging \
  SENTRY__SERVER__SENTRY_DSN="https://key@sentry.io/project-staging"

flyctl secrets set \
  --app phalanxduel-staging \
  VITE_SENTRY__CLIENT__SENTRY_DSN="https://key@sentry.io/project-staging"

# Verify secrets are set
flyctl secrets list --app phalanxduel-staging
```

### Step 5: Configure DNS

Point staging domain to Fly.io app:

```bash
# Get Fly.io staging app hostname
flyctl info --app phalanxduel-staging

# In your DNS provider (where play.phalanxduel.com is managed):
# Create CNAME record:
# Name: play-staging
# Target: phalanxduel-staging.fly.dev
```

**Verify DNS**:
```bash
nslookup play-staging.phalanxduel.com
# Should resolve to Fly.io IP

curl https://play-staging.phalanxduel.com/health
# Should return { status: "ok", timestamp: "..." }
```

### Step 6: Create GitHub Actions Auto-Deploy Workflow

Create `.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy to Staging

on:
  push:
    branches: [main]
  workflow_dispatch:  # Allow manual trigger

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    
    permissions:
      contents: read
      packages: write
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v6
      
      - name: Set up Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 24
      
      - name: Enable Corepack
        run: corepack enable
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build
        run: pnpm build
      
      - name: Run tests (optional; add if desired)
        run: pnpm test
      
      - name: Deploy to Fly.io staging
        uses: superfly/flyctl-actions@master
        with:
          args: "deploy --app phalanxduel-staging --config fly.staging.toml"
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN_STAGING }}
```

**Add Fly.io Token to GitHub**:

```bash
# Get your Fly.io API token
flyctl auth token

# In GitHub repo settings:
# Settings → Secrets and variables → Actions
# Create new secret: FLY_API_TOKEN_STAGING
# Paste your Fly.io API token
```

### Step 7: Test Auto-Deploy

```bash
# Make a small commit to main
echo "# Staging deployment test" >> README.md
git add README.md
git commit -m "test: trigger staging auto-deploy"
git push origin main

# Watch GitHub Actions:
# https://github.com/your-org/phalanxduel/actions

# Once deploy completes, verify:
curl https://play-staging.phalanxduel.com/health
```

### Step 8: Create Deployment Documentation

Create `docs/system/STAGING_DEPLOYMENT.md`:

```markdown
# Staging Environment

## Overview

Staging environment mirrors production but runs on cheaper Fly.io machine. Used for testing before production deployment.

- **App**: phalanxduel-staging (Fly.io)
- **URL**: https://play-staging.phalanxduel.com
- **Database**: Neon staging branch (shared schema, isolated data)
- **Auto-deploy**: On every `main` branch push
- **Manual deploy**: `flyctl deploy --app phalanxduel-staging --config fly.staging.toml`

## Pre-Deployment Testing

1. Run full test suite locally: `pnpm check:ci`
2. Build Docker image: `docker build -t phalanxduel:test .`
3. Run security scans: `docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image phalanxduel:test`
4. Push to main (or create PR)
5. Watch GitHub Actions deploy to staging
6. Verify staging health: `curl https://play-staging.phalanxduel.com/health`
7. Test critical flows manually or via automated smoke tests
8. When ready: Deploy same image to production

## Manual Staging Deploy

```bash
flyctl deploy --app phalanxduel-staging --config fly.staging.toml
```

## Staging Secrets

Staging uses separate secrets from production. Set via:

```bash
flyctl secrets set --app phalanxduel-staging KEY=value
```

Current staging secrets:
- DATABASE_URL (Neon staging branch)
- SENTRY__SERVER__SENTRY_DSN
- VITE_SENTRY__CLIENT__SENTRY_DSN

## Database Resets

To reset staging database to clean state:

```bash
# Delete Neon staging branch and recreate
# Or truncate tables via Neon console
```

## Monitoring Staging

- **Health**: https://play-staging.phalanxduel.com/health
- **Swagger UI**: https://play-staging.phalanxduel.com/docs
- **Logs**: `flyctl logs --app phalanxduel-staging`
- **Metrics**: SigNoz (if configured for staging)

## Cost

Staging uses `shared-cpu-1x` with `auto_stop_machines = "stop"` to minimize cost. Machine stops when no requests; starts on demand.
```

## Implementation Notes

- **Order**: Complete Steps 1-5 manually first (DNS takes time to propagate)
- **Timing**: Can do Step 6-8 while DNS propagates
- **Testing**: After Step 7, staging should auto-deploy on every main push
- **DNS Timing**: DNS changes can take 5-60 minutes to propagate; don't panic if health check fails immediately
- **Database Branching**: Neon branches are instant; no migration needed

## Verification Steps

### Local Verification

```bash
# 1. Verify fly.staging.toml is valid
flyctl config validate --config fly.staging.toml

# 2. Test deployment locally (dry-run)
flyctl deploy --app phalanxduel-staging --config fly.staging.toml --dry-run

# 3. Check secrets
flyctl secrets list --app phalanxduel-staging
```

### After Deployment

```bash
# 1. Check app status
flyctl status --app phalanxduel-staging

# 2. View logs
flyctl logs --app phalanxduel-staging

# 3. Test health endpoint
curl https://play-staging.phalanxduel.com/health

# 4. Test readiness endpoint
curl https://play-staging.phalanxduel.com/ready

# 5. Check DNS resolution
nslookup play-staging.phalanxduel.com

# 6. Verify TLS cert
openssl s_client -connect play-staging.phalanxduel.com:443 -servername play-staging.phalanxduel.com
```

### GitHub Actions Verification

```bash
# 1. Go to: https://github.com/your-org/phalanxduel/actions

# 2. Find "Deploy to Staging" workflow

# 3. Watch logs as it builds + deploys

# 4. Once complete, refresh staging health endpoint:
#    curl https://play-staging.phalanxduel.com/health
```

## Risk Assessment

**Risk Level**: Low

- **Isolation**: Staging app is separate; can't affect production
- **Cost**: Minimal (shared CPU, auto-scales to 0)
- **Rollback**: Simple (revert commit, redeploy, or use `fly rollback`)
- **Data**: Staging has separate DB (Neon branch or separate project)

## Dependencies

- Fly.io account (existing)
- GitHub account (existing)
- Neon PostgreSQL project (existing)
- DNS management access (existing)

## Related Tasks

- TASK-51: Dockerfile security (image tested on staging)
- All Phase 1 tasks: Staging used for verification before production

---

**Effort Estimate**: 1.5–2 hours (one-time setup; mostly manual configuration)  
**Priority**: CRITICAL (Prerequisite for Phase 1 verification)  
**Complexity**: Medium (Fly.io + DNS + GitHub Actions coordination)

