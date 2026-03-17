---
id: TASK-57
title: "Enhance Health Check in Dockerfile & Fly.io"
status: To Do
priority: HIGH
assignee: null
parent: TASK-50
labels:
  - reliability
  - dockerfile
  - flyio
created: "2025-03-17"
updated: "2025-03-17"
---

# TASK-57: Enhance Health Check in Dockerfile & Fly.io

## Description

Synchronize and optimize health check configuration across Dockerfile and Fly.io. Ensures consistent probe behavior and optimal startup/recovery detection.

## Acceptance Criteria

- [ ] Dockerfile HEALTHCHECK: start-period=15s, period=30s, timeout=5s, retries=3
- [ ] Fly.io health check mirrors Dockerfile settings
- [ ] Grace period matches app startup time (15s)
- [ ] /health endpoint responds <500ms
- [ ] Manual test: Container reports healthy after startup
- [ ] Coordination with TASK-52 (/health endpoint exists)

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

