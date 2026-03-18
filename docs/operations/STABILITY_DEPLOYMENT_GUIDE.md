# Stability Deployment & Monitoring Guide

Golden Mantra: **Do Not Break Production (or Staging)**

This guide defines safe deployment and monitoring procedures. Read this before every deployment.

## Golden Rules

1. **Staging First Always**: Every change goes to staging first. No exceptions.
2. **Never Deploy Uncertain**: If unsure, don't deploy. Ask first.
3. **Build Safety First**: Never bypass CI checks.
4. **Verify After Deploy**: Run health checks immediately after every deployment.
5. **Have Rollback Plan**: Before deploying, know how to undo it.

## Pre-Deployment Checklist

Before every deployment, verify:

- Tests passing: `pnpm test && pnpm typecheck && pnpm lint && pnpm build`
- No secrets in code: `git log --source --all -S "password\|token\|secret"`
- Dependencies clean: `pnpm audit --prod`
- Docker builds: `docker build -t phalanxduel:test .`
- Configuration valid: `python3 -c "import tomllib; tomllib.loads(open('fly.toml').read())"`
- Team notified via Slack
- On-call engineer ready
- Rollback plan documented

## Deployment Process

### Stage 1: Deploy to Staging

1. Verify all checks pass locally
2. Announce in Slack: "Deploying to staging in 5 minutes"
3. Run: `fly deploy --app phalanxduel-staging`
4. Watch logs: `fly logs --app phalanxduel-staging | tail -20`
5. Verify health:
   - `curl https://phalanxduel-staging.fly.dev/health`
   - `curl https://phalanxduel-staging.fly.dev/ready`
6. Check Sentry dashboard for errors

### Stage 2: Monitor Staging (24 Hours Minimum)

Do not proceed to production until staging has been stable for 24 hours.

Check at 1h, 6h, 12h, and 24h post-deploy:

- App is running: `fly status --app phalanxduel-staging`
- Health checks passing: `/health` returns 200 OK
- No error spikes in Sentry
- No memory leaks: `fly logs --app phalanxduel-staging | grep memory`
- Database healthy
- Run load test if critical changes

### Stage 3: Deploy to Production

Only after 24+ hours of staging stability:

1. Final local check: `pnpm test && pnpm build`
2. Announce: "Production deployment starting in 10 minutes"
3. Deploy: `fly deploy --app phalanxduel-production`
4. Watch logs (first 10 minutes): `fly logs --app phalanxduel-production | tail -50`
5. Verify health endpoints respond
6. Monitor dashboard for errors

### Stage 4: Monitor Production (24+ Hours)

Run health checks hourly for first 6 hours, then every 4 hours for 18 hours:

- Status: `fly status --app phalanxduel-production`
- Health: `curl https://phalanxduel.fly.dev/health`
- Errors: `fly logs --app phalanxduel-production | grep ERROR | tail -5`
- Sentry dashboard check

## Health Check Endpoints

### GET /health (Liveness Probe)

URL: `https://phalanxduel-staging.fly.dev/health` or `https://phalanxduel.fly.dev/health`

Expected 200 response:

```bash
{
  "status": "ok",
  "timestamp": "2026-03-18T12:34:56.789Z",
  "uptime_seconds": 3600,
  "memory_heap_used_mb": 45
}
```

Check for:

- `status` is "ok"
- Response time < 100ms
- Memory < 300MB (if higher, memory leak suspected)

### GET /ready (Readiness Probe)

URL: `https://phalanxduel-staging.fly.dev/ready` or `https://phalanxduel.fly.dev/ready`

Expected 200 response:

```bash
{
  "ready": true,
  "timestamp": "2026-03-18T12:34:56.789Z"
}
```

Check for: `ready` is `true`

## Incident Response

### Level 1: Minor Issue (< 1% error rate)

Response time: 15 minutes

1. Acknowledge in Slack
2. Check logs for pattern
3. Deploy fix to staging, verify, then production
4. Document what happened

### Level 2: Major Issue (1-5% error rate)

Response time: 5 minutes

1. Alert team immediately
2. Assess impact (staging vs production)
3. Consider rollback if production
4. Schedule post-mortem

### Level 3: Critical Issue (> 5% error rate or app down)

Response time: Immediate

1. Page all team members
2. Rollback immediately: `fly releases rollback --app phalanxduel-production`
3. Verify health restored
4. Notify users
5. Investigate root cause
6. Mandatory post-mortem within 24h

## Rollback (Emergency Procedure)

To immediately rollback to previous version:

```bash
# View releases
fly releases --app phalanxduel-production

# Rollback to previous
fly releases rollback --app phalanxduel-production

# Verify health
curl https://phalanxduel.fly.dev/health

# Notify team
# Slack: "Rolled back to [version]. Investigating."
```

Verification after rollback:

- `fly status` shows "started"
- Health check responds with 200 OK
- Readiness check responds with 200 OK
- No ERROR logs in past 5 minutes
- Sentry error rate dropping
- Users confirm functionality working

## Deployment Runbooks

### Deploy Code Change

1. Code ready locally (tests passing)
2. Push to git (triggers CI)
3. Deploy to staging: `fly deploy --app phalanxduel-staging`
4. Monitor staging 24 hours
5. Deploy to production: `fly deploy --app phalanxduel-production`
6. Monitor production 24 hours

### Update Environment Variable

1. Update staging: `fly secrets set --app phalanxduel-staging VAR="value"`
2. Wait 5 minutes for restart
3. Verify health checks pass
4. Update production: `fly secrets set --app phalanxduel-production VAR="value"`
5. Verify with: `fly secrets list --app phalanxduel-production`
6. Monitor health checks (15 min)

### Database Migration

1. Create migration: `pnpm drizzle-kit generate`
2. Deploy to staging: `fly deploy --app phalanxduel-staging`
3. Migration auto-runs via `release_command`
4. Verify migration: `fly logs --app phalanxduel-staging | grep -i migrate`
5. Check data integrity
6. Wait 24 hours for stability
7. Deploy to production: `fly deploy --app phalanxduel-production`
8. Monitor logs: `fly logs --app phalanxduel-production | grep -i migrate`

### Emergency Hotfix

1. Identify issue in production
2. Create fix locally
3. Test: `pnpm test && pnpm build && docker build -t phalanxduel:hotfix .`
4. Deploy to staging first (even in emergency)
5. Quick smoke test (5 min max)
6. Deploy to production
7. Verify health

## Daily Health Check (5 Minutes)

Run every morning:

```bash
echo "=== STAGING ==="
fly status --app phalanxduel-staging | grep STATE
curl -s https://phalanxduel-staging.fly.dev/health | jq .status
fly logs --app phalanxduel-staging --since 5m | grep ERROR | wc -l

echo ""
echo "=== PRODUCTION ==="
fly status --app phalanxduel-production | grep STATE
curl -s https://phalanxduel.fly.dev/health | jq .status
fly logs --app phalanxduel-production --since 5m | grep ERROR | wc -l
```

## Key Metrics to Monitor

| Metric | Staging Target | Production Target |
|--------|---|---|
| Uptime | 99%+ | 99.9%+ |
| Error rate | < 1% | < 0.1% |
| P95 latency | < 500ms | < 300ms |
| Memory | < 80% | < 70% |
| CPU | < 60% | < 50% |
| Health checks | 100% | 100% |

## Critical Error Patterns

Search logs for these immediately if found:

- ERROR or CRITICAL
- "panic" or "unhandled"
- "connection refused" or "timeout"
- "out of memory" or "OOM"
- "migration failed"

## Quick Commands Reference

```bash
# Deploy
fly deploy --app phalanxduel-staging
fly deploy --app phalanxduel-production

# Status
fly status --app phalanxduel-staging
fly status --app phalanxduel-production

# Logs
fly logs --app phalanxduel-staging
fly logs --app phalanxduel-production

# Health
curl https://phalanxduel-staging.fly.dev/health
curl https://phalanxduel.fly.dev/health

# Rollback
fly releases --app phalanxduel-production
fly releases rollback --app phalanxduel-production
```

## Remember

Do Not Break Production (or Staging)

- Always deploy staging first
- Wait 24 hours before production
- Verify health after every deploy
- Rollback first, investigate second
- Communicate with your team
