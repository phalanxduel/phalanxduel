---
id: TASK-70
title: "Test OTel Collector + App Integration Locally"
status: To Do
priority: HIGH
assignee: null
parent: TASK-50
labels:
  - testing
  - otel
  - docker-compose
  - integration-test
dependencies:
  - TASK-67
  - TASK-69
blocks:
  - TASK-71
created: "2026-03-18"
updated: "2026-03-18"
---

# TASK-70: Test OTel Collector + App Integration Locally

## Description

Verify that docker-compose environment works end-to-end. App sends telemetry to collector, collector forwards to Sentry. Tests both happy path and graceful degradation.

## Acceptance Criteria

- [ ] `docker compose up` brings up all services (app, postgres, collector)
- [ ] App accessible on http://localhost:3001
- [ ] App health check passes: `curl http://localhost:3001/health` → 200
- [ ] Collector health check passes: `curl http://localhost:13133/healthz` → 200
- [ ] PostgreSQL accessible via `localhost:5432`
- [ ] App can query PostgreSQL through docker-compose
- [ ] App sends traces to collector on port 4318
- [ ] Collector receives and processes traces (check logs)
- [ ] App works with collector running
- [ ] App gracefully handles collector down (starts with warning, continues)
- [ ] `docker compose down` cleanly stops all services
- [ ] No orphaned containers after compose down

## Test Plan

### Test 1: Full Stack Integration

```bash
# Start full stack
docker compose up --build

# Verify all services healthy
curl -s http://localhost:3001/health | jq .status
curl -s http://localhost:13133/healthz

# Check postgres connectivity
docker compose exec app node -e "
  require('pg').connect('postgresql://postgres:postgres@postgres:5432/phalanxduel', 
    (err, client) => console.log(err ? 'FAIL' : 'OK'))
"

# Generate some traffic (triggers telemetry)
for i in {1..10}; do
  curl -s http://localhost:3001/api/defaults
done

# Check collector logs for received spans
docker compose logs otel-collector | grep -i "accepted\|span\|trace"

# Verify traces in logs show up
docker compose logs app | grep "trace\|telemetry"

# Cleanup
docker compose down
```

### Test 2: Graceful Degradation (Collector Down)

```bash
# Start app and postgres only (no collector)
docker compose up --build app postgres

# App should still start with warning
docker compose logs app | grep -i "collector\|unreachable\|warning"

# App should still work (no traces, but functional)
curl -s http://localhost:3001/health | jq .status

# Cleanup
docker compose down
```

### Test 3: Hot Reload

```bash
# Start with compose
docker compose up

# Edit app code (e.g., add a console.log)
echo 'console.log("test")' >> server/src/index.ts

# Verify app reloads automatically
docker compose logs app | grep -i "reload\|restart\|watching"

# Cleanup
git checkout server/src/index.ts
docker compose down
```

### Test 4: Volume Mounts Verification

```bash
# Verify source volumes are mounted
docker compose exec app ls -la /app/server/src/

# Verify data persists
docker compose exec postgres psql -U postgres -c "CREATE TABLE test (id INT)"
docker compose restart postgres
docker compose exec postgres psql -U postgres -c "SELECT * FROM test"

# Cleanup
docker compose down -v  # Remove volumes
```

## Verification

- [ ] All services start without errors
- [ ] Health checks pass for all services
- [ ] App-to-collector communication works
- [ ] App-to-postgres communication works
- [ ] Traces visible in collector logs
- [ ] Graceful degradation when collector is down
- [ ] Hot reload works (file changes trigger reload)
- [ ] Volume mounts work (can edit files, see changes)
- [ ] Cleanup leaves no orphaned containers or volumes

## Integration Test Coverage

| Component | Test | Expected Result |
|-----------|------|-----------------|
| App startup | health check | 200 OK |
| Collector startup | health check on :13133 | 200 OK |
| PostgreSQL | connection test | Connected |
| App→Collector | trace flow | Spans logged |
| Collector→Sentry | export (if SENTRY_DSN set) | Traces forwarded |
| Graceful degradation | app without collector | Starts with warning |
| Hot reload | code change detection | Auto-rebuild |

## Depends On

- TASK-67: docker-compose.yml created
- TASK-69: App refactored for local collector

## Blocks

- TASK-71: Deploy to staging (manual execution of TASK-68 config)

## Related Tasks

- TASK-67: Create docker-compose.yml
- TASK-68: Fly.io collector config
- TASK-71: Deploy to staging
- TASK-72: Verify in production

---

**Effort Estimate**: 1.5 hours
**Priority**: HIGH (validates TASK-67/69 before production)
**Complexity**: Low (local testing)
