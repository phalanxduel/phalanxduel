# Staging Deployment Guide

## Overview

Staging environment (`phalanxduel-staging`) mirrors production but runs on cheaper Fly.io infrastructure for testing before production deployment.

- **App**: phalanxduel-staging (Fly.io)
- **URL**: https://phalanxduel-staging.fly.dev
- **Database**: Neon staging branch (separate schema/data from production)
- **Auto-deploy**: On every `main` branch push
- **Configuration**: `fly.staging.toml` (scaled-down from production)

## Current Status

✅ Staging app deployed and running
✅ Health checks passing
✅ Database configured (Neon branch)
✅ Auto-deploy workflow enabled
✅ Secrets configured

## Manual Deploy to Staging

```bash
flyctl deploy --app phalanxduel-staging --config fly.staging.toml
```

Monitor deployment:

```bash
flyctl logs --app phalanxduel-staging
```

## Verify Staging Deployment

After deployment, verify health:

```bash
# Liveness check
curl https://phalanxduel-staging.fly.dev/health

# Readiness check
curl https://phalanxduel-staging.fly.dev/ready

# Expected: HTTP 200 with JSON response
```

## Pre-Production Testing Workflow

1. **Local Testing** (required before commit):
   ```bash
   pnpm test
   pnpm typecheck
   pnpm lint
   pnpm build
   ```

2. **Commit to main**:
   ```bash
   git commit -m "feature: your change"
   git push origin main
   ```

3. **GitHub Actions Deploy** (automatic):
   - Workflow: `.github/workflows/deploy-staging.yml`
   - Status: https://github.com/yourusername/phalanxduel/actions
   - Watch deployment logs in GitHub

4. **Verify Staging**:
   ```bash
   curl https://phalanxduel-staging.fly.dev/health
   # or open in browser: https://phalanxduel-staging.fly.dev
   ```

5. **Manual Testing** (recommended):
   - Create a test match
   - Play a few turns
   - Verify game state persistence
   - Check Sentry for errors

6. **Production Deploy** (manual):
   ```bash
   flyctl deploy --app phalanxduel-production --config fly.toml
   ```

## Staging Database

Staging uses a separate Neon branch to isolate data from production:

- **Data isolation**: ✅ Complete (separate branch)
- **Schema**: ✅ Same as production (migrations auto-run)
- **Resets**: Delete branch and recreate in Neon console (5-10 min)

## Staging Configuration

See `fly.staging.toml` for:
- **Resources**: 1x shared-cpu, 512MB RAM (vs production: larger)
- **Auto-scaling**: min=0, max=1 (costs ~$0/month when stopped)
- **Health checks**: Same as production
- **Release command**: DB migrations auto-run

## Staging Secrets

Staging has separate secrets from production:

```bash
# List staging secrets
flyctl secrets list --app phalanxduel-staging

# Update a staging secret
flyctl secrets set --app phalanxduel-staging VAR_NAME="value"
```

Staging secrets (current):
- `DATABASE_URL` - Neon staging branch
- `SENTRY_DSN` - Sentry staging project
- `VITE_SENTRY_DSN` - Client-side Sentry

## Troubleshooting

### Deploy Fails

Check logs:
```bash
flyctl logs --app phalanxduel-staging --since 5m
```

Common causes:
- Build failure: Check `pnpm build` locally first
- Database connection: Verify DATABASE_URL is correct
- Secret missing: Check `flyctl secrets list --app phalanxduel-staging`

### Health Check Failing

```bash
# Test health endpoint
curl -v https://phalanxduel-staging.fly.dev/health

# Check logs for startup errors
flyctl logs --app phalanxduel-staging | grep -i error

# Check app status
flyctl status --app phalanxduel-staging
```

### DNS Not Working

If staging URL doesn't resolve:

```bash
# Check DNS
nslookup phalanxduel-staging.fly.dev

# Manual DNS update (if needed)
# Contact your DNS provider to point play-staging.phalanxduel.com
# to phalanxduel-staging.fly.dev
```

## Cost Optimization

Staging is configured to minimize costs:

- **Shared CPU**: Much cheaper than production
- **Auto-scale to 0**: Machine stops when idle, starts on demand (~5s)
- **Small RAM**: 512MB sufficient for testing
- **Single machine**: No redundancy needed for staging

**Estimated cost**: $0-5/month (depending on usage)

## Monitoring Staging

### Health & Status

```bash
# App status
flyctl status --app phalanxduel-staging

# Real-time logs
flyctl logs --app phalanxduel-staging

# Health check
curl https://phalanxduel-staging.fly.dev/health
```

### Error Tracking

- **Sentry**: https://sentry.io (staging project)
- **GitHub Actions**: https://github.com/yourusername/phalanxduel/actions

## Best Practices

1. **Always deploy to staging first** - No direct production deploys
2. **Test staging thoroughly** - At least 30 min of manual testing
3. **Use staging for QA** - Team should test before production approval
4. **Keep staging data clean** - Reset staging DB weekly if needed
5. **Monitor staging health** - Check logs after each deploy

## Deployment Checklist (Before Production)

- [ ] All tests pass locally: `pnpm check:ci`
- [ ] Code committed and pushed to `main`
- [ ] GitHub Actions deploy completes (check Actions tab)
- [ ] Staging health check passes: `curl https://phalanxduel-staging.fly.dev/health`
- [ ] Manual testing completed (at least 30 min)
- [ ] No new errors in Sentry
- [ ] Team approval obtained
- [ ] Production deployment executed: `flyctl deploy --app phalanxduel-production`

## Related Documentation

- [Stability Deployment Guide](./STABILITY_DEPLOYMENT_GUIDE.md) - Deployment procedures
- [Fly.io Production Guide](./FLYIO_PRODUCTION_GUIDE.md) - Production setup
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Full pre-deployment checklist
- [Environment Variables](./ENVIRONMENT_VARIABLES.md) - Required env vars
