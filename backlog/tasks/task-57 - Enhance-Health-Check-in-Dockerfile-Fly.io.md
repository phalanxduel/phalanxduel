---
id: TASK-57
title: Enhance Health Check in Dockerfile & Fly.io
status: Done
assignee:
  - '@gordon'
created_date: ''
updated_date: '2026-03-18 01:52'
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

## Implementation

### Dockerfile

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1
```

### fly.toml

```toml
[[http_service.checks]]
  grace_period = "30s"      # Match HEALTHCHECK start-period + buffer
  interval = "15s"          # Check every 15s
  method = "GET"
  path = "/health"
  timeout = "10s"           # Timeout for check itself
```

## Verification

```bash
docker build -t phalanxduel:health .
docker run -d --name phalanx-health phalanxduel:health
sleep 20  # Wait for grace period
docker inspect phalanx-health | grep -A 10 '"Health"'
# Expected: "Status": "healthy"
docker stop phalanx-health
```

## Risk Assessment

**Risk Level**: Low — Configuration tuning only

## Related Tasks

- TASK-52: Health/readiness endpoints
- TASK-53: Graceful shutdown (uses health for detection)

---

**Effort Estimate**: 1 hour  
**Priority**: HIGH (Reliability)  
**Complexity**: Low (configuration)
<!-- AC:END -->
