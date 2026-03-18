# Fly.io Production Deployment Guide

This guide covers production deployment setup and secret management for Phalanx Duel on Fly.io.

## Prerequisites

- Fly.io account with CLI installed: `curl -L https://fly.io/install.sh | sh`
- Neon PostgreSQL database (staging or production branch)
- Sentry project created and auth token available
- Docker Hub account (for pulling images if needed)

## Initial App Setup

### 1. Create Fly.io App (First Time Only)

```bash
fly apps create phalanxduel-staging --org your-org
# or
fly apps create phalanxduel-production --org your-org
```

This generates a basic `fly.toml` (which you can replace with the hardened version).

### 2. Copy Hardened Configuration

Replace the generated `fly.toml` with the production-hardened version from this repo:

```bash
cp fly.production.toml fly.toml
# or use explicitly:
fly deploy --config fly.production.toml
```

Key configurations:
- **Graceful shutdown**: `kill_timeout = "35s"`, `kill_signal = "SIGTERM"`
- **Zero-downtime deploys**: `strategy = "rolling"`
- **Cold start prevention**: `min_machines_running = 1`
- **Health checks**: `/health` (liveness) + `/ready` (readiness)
- **Release migrations**: Runs before new version starts

### 3. Set Required Secrets

All build and runtime secrets:

```bash
# 1. Database (required for app startup)
fly secrets set DATABASE_URL="postgresql://user:password@c.neon.tech/phalanxduel"

# 2. Sentry error tracking (optional but recommended)
fly secrets set SENTRY_DSN="https://key@sentry.io/project"
fly secrets set VITE_SENTRY__CLIENT__SENTRY_DSN="https://key@sentry.io/project"

# 3. Sentry auth token (only needed if building on Fly.io)
fly secrets set SENTRY_AUTH_TOKEN="sntrys_eyJ..."
```

Verify secrets are set:

```bash
fly secrets list
```

**Note**: Secrets don't show values for security; they're only visible to the app at runtime.

## Deployment

### Option A: Build and Deploy Locally

Build locally, push to Fly.io registry, then deploy:

```bash
# 1. Build Docker image
docker build -t phalanxduel:latest .

# 2. Tag for Fly.io registry
docker tag phalanxduel:latest registry.fly.io/phalanxduel-staging:latest

# 3. Push to Fly.io registry
docker push registry.fly.io/phalanxduel-staging:latest

# 4. Deploy from pushed image
fly deploy --image registry.fly.io/phalanxduel-staging:latest
```

### Option B: Build on Fly.io

Let Fly.io build the image:

```bash
fly deploy
```

This:
1. Clones the repo
2. Runs `docker build` (with secrets from `fly secrets`)
3. Pushes to Fly.io registry
4. Runs `release_command` (database migrations)
5. Deploys to machines

**Advantages**: Consistent builds, no local setup needed  
**Disadvantages**: Slower (5-10 min), requires all secrets in Fly.io

## Monitoring & Troubleshooting

### View Logs

```bash
fly logs
# or specific machine
fly logs --instance <machine-id>
```

### Check App Status

```bash
fly status
# Shows machines, IP addresses, restart counts
```

### Health Checks

```bash
fly logs | grep -i "health\|ready"
# or manually check
curl https://phalanxduel-staging.fly.dev/health
curl https://phalanxduel-staging.fly.dev/ready
```

### SSH into Machine

```bash
fly ssh console -s
# Inside container
node --version
ps aux | grep server
```

### Restart Machines

Rolling restart (zero-downtime):

```bash
fly machines restart --signal SIGTERM
# Waits for graceful shutdown (35s max)
```

Immediate restart (causes brief downtime):

```bash
fly machines restart
```

## Scaling & Configuration

### Scale Machines

```bash
# Scale up to 2 machines
fly scale count 2

# Change machine resources
fly scale memory 2048  # 2GB RAM
fly scale vm shared-cpu  # Shared CPU instead of dedicated
```

### Update fly.toml and Deploy

Edit `fly.toml` locally, then:

```bash
fly deploy
# Fly.io reads fly.toml and applies changes
```

### View Current Configuration

```bash
fly config
# Pretty-prints current fly.toml
```

## Secrets Management

### Update a Secret

```bash
fly secrets set SENTRY_DSN="new-value"
# App doesn't restart; reads on next request
```

### Remove a Secret

```bash
fly secrets unset SENTRY_DSN
# App continues running; missing env var will cause errors
```

### Add a New Secret (e.g., for Feature Flags)

```bash
fly secrets set FEATURE_FLAG_X="true"
# Immediately available in app
```

## Graceful Shutdown

When Fly.io stops a machine:

1. Sends `SIGTERM` to container (configured in `fly.toml`)
2. App's signal handler (`server/src/index.ts`) closes connections
3. Waits up to 30s for existing requests to finish
4. After 30s or when complete, process exits gracefully
5. Load balancer removes machine from rotation automatically

**This ensures**:
- No dropped connections
- Database transactions complete cleanly
- Active games finish properly

## Database Migrations

Migrations run automatically via `release_command`:

```toml
[deploy]
  release_command = "node server/dist/db/migrate.js"
```

Before deploying new code:
1. New image builds
2. `release_command` runs migrations
3. Only then does load balancer route traffic to new version
4. Old machines stop gracefully

To run migrations manually:

```bash
fly ssh console
$ node server/dist/db/migrate.js
```

## Production Readiness Checklist

- [ ] Database URL set and working
- [ ] Sentry project created with auth token
- [ ] Health checks passing: `curl https://app.fly.dev/health`
- [ ] Logs contain no errors: `fly logs | grep ERROR`
- [ ] Graceful shutdown tested: Deploy and watch for clean restart
- [ ] Load testing completed (see TASK-62)
- [ ] Secrets rotation procedure documented
- [ ] Monitoring/alerting configured (Sentry, custom dashboards)

## Emergency Procedures

### Rollback to Previous Version

```bash
fly releases
# Shows all deployments
fly releases rollback
# or specific version
fly releases rollback <VERSION>
```

### Force Kill Stuck Machine

```bash
fly machines restart <ID> --force
# Immediate kill (data loss risk)
```

### Emergency Scale Down

```bash
fly scale count 1
# Reduces to 1 machine
```

## Cost Optimization

Fly.io free tier includes:
- 3 shared-cpu machines (750 hrs/month each)
- 160GB bandwidth
- 3GB persistent storage

For Phalanx Duel staging:
- 1 shared-cpu machine = ~$5-10/month
- Production (2 machines) = ~$20-30/month

Reduce costs:
```bash
fly scale count 0  # Pause app (saves ~95%)
fly scale memory 512  # Reduce RAM (saves ~30%)
fly scale vm shared-cpu  # Use shared CPU (already set)
```

## References

- [Fly.io Documentation](https://fly.io/docs/)
- [fly.toml Reference](https://fly.io/docs/reference/configuration/)
- [Health Checks](https://fly.io/docs/reference/health-checks/)
- [Secrets & Environment](https://fly.io/docs/reference/secrets/)
- [Scaling](https://fly.io/docs/reference/machines/)
