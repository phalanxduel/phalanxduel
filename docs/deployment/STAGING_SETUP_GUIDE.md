# Fly.io Staging Setup - Setup & Deploy Instructions

## Current Status

✅ **Fly.io app created**: `phalanxduel-staging` (pending)  
✅ **fly.staging.toml configured**: Hardened with graceful shutdown, health checks, rolling updates  
✅ **Setup script created**: `scripts/setup-staging.sh` (provides guided walkthrough)

## Remaining Steps (Manual - You Need to Do These)

### Step 1: Create/Configure Neon Staging Database

**Option A: Create a new Neon branch** (Recommended)
```bash
# Go to: https://console.neon.tech
# 1. Select your main project
# 2. Branches → Create branch
# 3. Name: "staging"
# 4. Copy the "Pooled connection" string
# Example: postgresql://user:password@c.neon.tech/phalanxduel?sslmode=require
```

**Option B: Use existing Neon database**
```bash
# If you already have a staging database, just get the connection string
# Go to: https://console.neon.tech → Connection strings → Pooled
```

### Step 2: Set Fly.io Secrets

Once you have the DATABASE_URL and Sentry credentials:

```bash
# Set DATABASE_URL (required)
fly secrets set --app phalanxduel-staging \
  DATABASE_URL="postgresql://user:password@c.neon.tech/phalanxduel?sslmode=require"

# Set Sentry DSN (optional but recommended)
fly secrets set --app phalanxduel-staging \
  SENTRY_DSN="https://key@sentry.io/project-id"

# Set client Sentry DSN (usually same as above)
fly secrets set --app phalanxduel-staging \
  VITE_SENTRY__CLIENT__SENTRY_DSN="https://key@sentry.io/project-id"

# Set Sentry auth token (for sourcemap uploads)
fly secrets set --app phalanxduel-staging \
  SENTRY_AUTH_TOKEN="sntrys_eyJ..."

# Verify all secrets are set
fly secrets list --app phalanxduel-staging
```

### Step 3: Deploy to Staging

**Option A: Let Fly.io build** (simpler)
```bash
# Copy staging config to main fly.toml location
cp fly.staging.toml fly.toml

# Deploy (Fly.io will build Docker image)
fly deploy --app phalanxduel-staging
```

**Option B: Build locally & push** (faster for repeated deploys)
```bash
# Build Docker image
docker build -t phalanxduel:staging .

# Tag for Fly.io registry
docker tag phalanxduel:staging registry.fly.io/phalanxduel-staging:staging

# Push to registry
docker push registry.fly.io/phalanxduel-staging:staging

# Deploy from pushed image
fly deploy --app phalanxduel-staging \
  --image registry.fly.io/phalanxduel-staging:staging
```

### Step 4: Verify Deployment

```bash
# Check status (should show green/healthy)
fly status --app phalanxduel-staging

# View logs
fly logs --app phalanxduel-staging

# Test health endpoints
curl https://phalanxduel-staging.fly.dev/health
curl https://phalanxduel-staging.fly.dev/ready

# Expected responses:
# /health → {"status":"ok","timestamp":"...","uptime_seconds":...}
# /ready → {"ready":true,"timestamp":"..."}
```

### Step 5: Test Core Functionality

Once deployed:

1. **Open app**: https://phalanxduel-staging.fly.dev
2. **Create a match**: Verify game startup
3. **Play a turn**: Ensure game logic works
4. **Check logs**: `fly logs --app phalanxduel-staging` (no errors)
5. **Monitor Sentry** (if configured): Verify no errors reported

---

## Files Modified/Created for Staging

| File | Purpose |
|------|---------|
| `fly.staging.toml` | Hardened staging config (health checks, graceful shutdown, rolling updates) |
| `scripts/setup-staging.sh` | Interactive setup guide |
| `docs/deployment/FLYIO_PRODUCTION_GUIDE.md` | Detailed deployment docs (also applies to staging) |

---

## Configuration Highlights (fly.staging.toml)

✅ **Graceful shutdown**: 35s timeout + SIGTERM  
✅ **Health checks**: `/health` (liveness) + `/ready` (readiness)  
✅ **Rolling updates**: Zero-downtime deployments  
✅ **Min machines**: 1 (prevents cold starts)  
✅ **Release migrations**: Runs before new version starts  
✅ **Auto-heal**: Restarts unhealthy machines  

---

## Typical Deployment Time

| Stage | Duration |
|-------|----------|
| Docker build | 3-5 min |
| Image push | 1-2 min |
| Release migrations | 1-3 min (first deploy) |
| Machine restart | 30-60 sec |
| Health check | 30-45 sec |
| **Total** | **5-10 min** |

---

## Post-Deployment Checklist

- [ ] `fly status` shows healthy
- [ ] `/health` returns 200 with "status":"ok"
- [ ] `/ready` returns 200 with "ready":true
- [ ] No ERROR logs: `fly logs | grep ERROR`
- [ ] Database migrations completed
- [ ] Can create & play a match
- [ ] Sentry receiving events (if configured)

---

## Rollback (if needed)

```bash
# View deployment history
fly releases --app phalanxduel-staging

# Rollback to previous version
fly releases rollback --app phalanxduel-staging
```

---

## Next: Link Staging to GitHub Auto-Deploy

After staging is working, you can set up auto-deployment on push:

```bash
# 1. Connect GitHub repo to Fly.io
fly auth login
fly info --app phalanxduel-staging

# 2. Add GitHub deploy token
# Settings → Build & Deploy → Deploy Tokens

# 3. Create GitHub Actions workflow (optional)
# Already have: .github/workflows/fly-deploy.yml
```

---

## Support Links

- **Fly.io Dashboard**: https://fly.io/apps/phalanxduel-staging
- **Fly.io Docs**: https://fly.io/docs/
- **Logs**: `fly logs --app phalanxduel-staging`
- **Metrics**: https://fly.io/apps/phalanxduel-staging/monitoring

---

## What's Next After Staging is Live?

1. **Load test** (TASK-62): Run K6 load tests against staging
2. **Verify in staging**: 24h of stability testing
3. **Production deployment** (TASK-66 Phase 2): Apply same setup to production

---

**Reference**: See `docs/deployment/FLYIO_PRODUCTION_GUIDE.md` for full setup details.
