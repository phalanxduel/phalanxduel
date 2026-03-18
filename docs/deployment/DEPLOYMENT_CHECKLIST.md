# Production Deployment Checklist

Complete checklist for safe, reliable production deployments of Phalanx Duel.

## Pre-Deployment (24 Hours Before)

### Code & Build Quality

- [ ] All tests passing: `pnpm test` (no failures)
- [ ] TypeScript clean: `pnpm typecheck` (no type errors)
- [ ] Linting passes: `pnpm lint` (no warnings/errors)
- [ ] Build succeeds: `pnpm build` (no build errors)
- [ ] Docker build succeeds: `docker build .` (clean build, <350MB)
- [ ] `docker history` confirms no secrets leaked: `docker history phalanxduel:latest | grep -i token`
- [ ] Dockerfile comments reviewed for accuracy
- [ ] .env files NOT committed to repo

### Security Audit

- [ ] SENTRY_AUTH_TOKEN configured in CI/CD (GitHub Actions secrets)
- [ ] DATABASE_URL only contains valid PostgreSQL connection string
- [ ] No hardcoded secrets in any commit: `git log --source --all -S "password\|token\|secret" | head -5`
- [ ] Dependenc security: `pnpm audit --prod` (no critical CVEs)
- [ ] Docker image scanned with Trivy: `trivy image phalanxduel:latest`
- [ ] SBOM generated and reviewed (if using BuildKit cache)

### Database & Schema

- [ ] Migrations written and tested locally
- [ ] Rollback migration prepared (just in case)
- [ ] Schema changes backward-compatible (no dropped columns without migration)
- [ ] Drizzle migrations dry-run successful: `node server/dist/db/migrate.js --dry`
- [ ] Database backups configured in Neon: Check dashboard for auto-backups
- [ ] Staging deployment already tested with same code: `fly deploy --app phalanxduel-staging`

### Infrastructure & Configuration

- [ ] Fly.io app exists and configured: `fly apps list`
- [ ] All required secrets set in Fly.io: `fly secrets list` (shows DATABASE_URL, SENTRY_DSN, etc.)
- [ ] fly.toml health check config matches Dockerfile: Check `/health` and `/ready` endpoints
- [ ] Release migrations configured: `release_command = "node server/dist/db/migrate.js"` in fly.toml
- [ ] Graceful shutdown configured: `kill_timeout = "35s"` and `kill_signal = "SIGTERM"`
- [ ] Min machines = 1 (prevents cold starts): `min_machines_running = 1` in fly.toml

### Monitoring & Alerting

- [ ] Sentry project created and linked: Verify in [Settings](https://sentry.io/settings/)
- [ ] Sentry alert rules configured (e.g., on any error)
- [ ] OpenTelemetry endpoint configured and reachable
- [ ] Logs pipeline working (Fly.io logs → Dashboard or external service)
- [ ] Error tracking dashboard accessible
- [ ] Team members have access to Sentry + Fly.io dashboard

### Communication

- [ ] Deployment window communicated to stakeholders
- [ ] On-call engineer identified for first 1 hour post-deploy
- [ ] Rollback procedure reviewed by team
- [ ] Known issues/limitations documented for support team

---

## Immediate Pre-Deployment (15 Minutes Before)

### Final Checks

- [ ] Latest code pulled: `git pull origin main` (no uncommitted changes)
- [ ] Release notes prepared (for changelog)
- [ ] Slack channel ready for deployment notifications
- [ ] Check Fly.io status page for any ongoing incidents: https://status.fly.io/
- [ ] Database backup manually triggered (if possible): `fly pg backup` or via Neon dashboard
- [ ] DNS/load balancers healthy (if using custom domains)

### Build & Image Verification

```bash
# Final build
docker build -t phalanxduel:prod-$(date +%s) .

# Final scan
trivy image phalanxduel:prod-$(date +%s)

# Tag for push
docker tag phalanxduel:prod-* registry.fly.io/phalanxduel-production:prod-$(date +%s)

# Push to registry
docker push registry.fly.io/phalanxduel-production:prod-$(date +%s)
```

### Deployment Go/No-Go

- [ ] Team ready for deployment
- [ ] All pre-deployment checks passed
- [ ] No critical issues in error tracking from last 24h
- [ ] Staging deployment running successfully for 2+ hours without errors
- [ ] Production has capacity (CPU/memory not maxed)

---

## Deployment Execution

### Option A: Local Build + Push

```bash
# 1. Build (this takes 3-5 min)
docker build -t phalanxduel:latest .

# 2. Tag for Fly.io registry
docker tag phalanxduel:latest registry.fly.io/phalanxduel-production:prod-$(date +%Y%m%d-%H%M%S)

# 3. Push to registry (1-2 min)
docker push registry.fly.io/phalanxduel-production:prod-$(date +%Y%m%d-%H%M%S)

# 4. Deploy from pushed image
fly deploy --app phalanxduel-production \
  --image registry.fly.io/phalanxduel-production:prod-$(date +%Y%m%d-%H%M%S)
```

### Option B: Fly.io Build

```bash
# Fly.io will build and deploy
fly deploy --app phalanxduel-production
```

**Watch deployment**:
```bash
fly logs --app phalanxduel-production
```

### During Deployment

- [ ] Monitor deployment logs: `fly logs` (watch for errors)
- [ ] Deployment status: `fly status` (should show "healthy")
- [ ] Machine restarts visible and orderly (rolling update)
- [ ] No spike in error rate (check Sentry dashboard)
- [ ] Database migrations completed successfully (check logs)

---

## Post-Deployment (Immediate)

### Health Checks

```bash
# 1. Liveness probe
curl -s https://phalanxduel-production.fly.dev/health | jq .

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2024-03-17T...",
#   "uptime_seconds": 30,
#   "version": "1.2.3",
#   ...
# }

# 2. Readiness probe
curl -s https://phalanxduel-production.fly.dev/ready | jq .

# Expected response:
# {
#   "ready": true,
#   "timestamp": "2024-03-17T..."
# }
```

Checklist:
- [ ] `/health` returns `"status": "ok"` within 5s
- [ ] `/ready` returns `"ready": true` within 5s
- [ ] No HTTP 5xx errors
- [ ] Response times <500ms

### Monitoring & Error Tracking

- [ ] Sentry: Zero new errors or acceptable error rate
- [ ] Logs contain no ERROR-level messages: `fly logs | grep ERROR` (none)
- [ ] CPU/memory usage reasonable (<60% typical)
- [ ] Response times stable (no spikes)
- [ ] Database connections healthy: Check logs for connection errors
- [ ] No rate limiting or 429 errors

### Traffic & Performance

```bash
# Check traffic load (if available from custom dashboards)
# Typical metrics:
# - Requests/sec: 5-50 (depending on load)
# - P95 latency: <200ms
# - Error rate: <0.1%
# - Active connections: <100
```

- [ ] Traffic routing correctly (requests hitting new version)
- [ ] No unusual latency spikes
- [ ] Database queries completing normally

### Rollback Decision

**If issues found, rollback immediately**:

```bash
# View releases
fly releases --app phalanxduel-production

# Rollback to previous version
fly releases rollback --app phalanxduel-production
```

**Automatic rollback triggers**:
- [ ] More than 5% error rate
- [ ] P99 latency >1000ms
- [ ] Database connection failures
- [ ] Critical business logic broken (e.g., can't start match)

---

## Post-Deployment (1 Hour)

### System Stability

- [ ] Still no new error spikes in Sentry
- [ ] Logs are clean (no warnings)
- [ ] All machines healthy: `fly status`
- [ ] Database still responding normally
- [ ] No unusual resource consumption

### Feature Verification

- [ ] Core functionality works: Can create match, play, finish match
- [ ] Authentication working
- [ ] Leaderboard updating
- [ ] Chat/communication functional (if applicable)
- [ ] No broken UI elements reported

### Communication

- [ ] Deployment success announced to team
- [ ] Status page updated (if public)
- [ ] Stakeholders notified
- [ ] Team acknowledged receipt

---

## Post-Deployment (24 Hours)

### Long-Running Stability

- [ ] 24h without critical errors
- [ ] No memory leaks (memory usage stable)
- [ ] No connection pool exhaustion
- [ ] Scheduled jobs running on time (if applicable)
- [ ] Database performance stable

### Analytics & Metrics

- [ ] Error rate stable and acceptable (<0.1%)
- [ ] User engagement metrics normal (if applicable)
- [ ] No unusual patterns in logs
- [ ] Crash reports (if any) investigated

### Documentation

- [ ] Deployment noted in changelog/release notes
- [ ] Any issues/workarounds documented
- [ ] Team retrospective scheduled (if issues found)

---

## Rollback Procedure

Use if something breaks during/after deployment.

### Immediate Rollback

```bash
# 1. Check current release
fly releases --app phalanxduel-production

# 2. Rollback to previous version
fly releases rollback --app phalanxduel-production

# 3. Verify rollback
fly logs --app phalanxduel-production

# 4. Confirm health
curl -s https://phalanxduel-production.fly.dev/health
```

### Timeline

- **0-5 min**: Detect issue
- **5-10 min**: Confirm rollback decision
- **10-15 min**: Execute rollback
- **15-30 min**: Verify system stable
- **30+ min**: Post-mortem + fix + re-deploy

### Post-Rollback

- [ ] System healthy
- [ ] Stakeholders notified
- [ ] Root cause documented
- [ ] Fix prepared for next attempt
- [ ] Tests added to prevent regression

---

## Common Issues & Solutions

### Issue: Health Check Failing

**Symptoms**: `/health` returns 500 or times out

**Causes**:
- App crashed during startup
- Database connection string wrong
- Migration failed

**Fix**:
```bash
fly logs | tail -50  # Check startup logs
fly secrets list     # Verify DATABASE_URL
fly rollback         # Rollback if recent change
```

### Issue: High Error Rate

**Symptoms**: Sentry reporting >1% errors

**Causes**:
- Code regression
- Database schema mismatch
- External API down

**Fix**:
```bash
fly logs | grep ERROR | tail -20  # Find error pattern
# Fix code or rollback
fly deploy  # Or rollback
```

### Issue: Cold Start After Deploy

**Symptoms**: First request slow (>5s)

**Causes**:
- Large bundle size
- Slow dependency loading

**Fix**: Already mitigated by `min_machines_running = 1`

### Issue: Database Migration Timeout

**Symptoms**: Deployment stalls on `release_command`

**Causes**:
- Long-running migration
- Database lock

**Fix**:
```bash
# SSH into app and check migration
fly ssh console --app phalanxduel-production
$ ps aux | grep migrate

# Kill if stuck and investigate locally
```

---

## Incident Response

If production incident detected:

### Level 1: Immediate (0-5 min)

- [ ] Declare incident in Slack
- [ ] Page on-call engineer
- [ ] Start incident log (time, symptoms, actions)
- [ ] Assess impact (users affected, data at risk?)

### Level 2: Investigation (5-30 min)

- [ ] Gather error traces from Sentry
- [ ] Check logs for patterns
- [ ] Verify database integrity
- [ ] Communicate status to users (if public outage)

### Level 3: Recovery (30-60 min)

- [ ] Execute rollback if needed
- [ ] Deploy hotfix if issue identified
- [ ] Verify system recovery
- [ ] Restore data backups if needed

### Level 4: Post-Incident (60+ min)

- [ ] Root cause analysis
- [ ] Preventive measures identified
- [ ] Tests added to prevent regression
- [ ] Retrospective scheduled

---

## Monitoring Dashboard

Key metrics to watch post-deployment:

| Metric | Target | Alert If |
|--------|--------|----------|
| Error Rate | <0.1% | >1% |
| P95 Latency | <200ms | >500ms |
| CPU Usage | <50% | >80% |
| Memory Usage | <60% | >80% |
| Database Connections | <50 | >100 |
| Health Check Success | 100% | <95% |

---

## References

- [Fly.io Deployments](https://fly.io/docs/getting-started/deploy/)
- [Graceful Shutdown](../../server/src/index.ts)
- [Health Endpoints](../../server/src/routes/health.ts)
- [Sentry Documentation](https://docs.sentry.io/)
- [Database Migrations](../../server/drizzle/)
- [FLYIO_PRODUCTION_GUIDE.md](./FLYIO_PRODUCTION_GUIDE.md)
- [SECRETS_AND_ENV.md](./SECRETS_AND_ENV.md)
