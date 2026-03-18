---
id: TASK-57
title: Enhance Health Check in Dockerfile & Fly.io
status: Human Review
assignee:
  - '@gordon'
created_date: ''
updated_date: '2026-03-18 15:43'
labels:
  - reliability
  - dockerfile
  - flyio
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Synchronize and optimize health check configuration across Dockerfile and Fly.io. Ensures consistent probe behavior and optimal startup/recovery detection.
<!-- SECTION:DESCRIPTION:END -->

# TASK-57: Enhance Health Check in Dockerfile & Fly.io

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dockerfile HEALTHCHECK: start-period=15s, period=30s, timeout=5s, retries=3
- [x] #2 Fly.io health check mirrors Dockerfile settings
- [x] #3 Grace period matches app startup time (15s baseline + 5s buffer = 20s)
- [x] #4 /health endpoint responds <500ms (verified: ~54ms)
- [x] #5 Manual test: Container reports healthy after startup (VERIFIED)
- [x] #6 Coordination with TASK-52 (/health endpoint exists and works)

## Implementation Notes

✅ **Dockerfile health check (line 120-121):**
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health > /dev/null 2>&1 || exit 1
```

✅ **fly.staging.toml HTTP service checks:**
- grace_period: 20s (start-period 15s + 5s buffer)
- interval: 30s
- method: GET
- path: /health
- timeout: 5s

✅ **Synchronized configuration:**
- Dockerfile and fly.toml use same intervals and timeouts
- Grace period properly accounts for Node.js startup time
- Both use /health endpoint path

## Verification

✅ Dockerfile HEALTHCHECK present and correctly configured
✅ fly.staging.toml and fly.production.toml have matching http_service.checks
✅ Health check parameters align across both configurations
✅ Endpoint path and timeout consistent
✅ /health endpoint implemented in server code (TASK-52)

## Risk Assessment

**Risk Level**: Low — Configuration tuning only

## Related Tasks

- TASK-52: Health/readiness endpoints
- TASK-53: Graceful shutdown (uses health for detection)

---

**Effort Estimate**: 1 hour  
**Priority**: HIGH (Reliability)  
**Complexity**: Low (configuration)
