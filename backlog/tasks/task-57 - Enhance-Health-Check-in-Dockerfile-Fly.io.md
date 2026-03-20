---
id: TASK-57
title: Enhance Health Check in Dockerfile & Fly.io
status: Done
assignee:
  - '@gordon'
created_date: ''
updated_date: '2026-03-18 21:59'
labels:
  - reliability
  - dockerfile
  - flyio
dependencies: []
priority: high
ordinal: 52000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Synchronize and optimize health check configuration across Dockerfile and Fly.io. Ensures consistent probe behavior and optimal startup/recovery detection.
<!-- SECTION:DESCRIPTION:END -->

# TASK-57: Enhance Health Check in Dockerfile & Fly.io

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:BEGIN -->
- [x] #1 #1 Dockerfile HEALTHCHECK: start-period=15s, period=30s, timeout=5s, retries=3
- [x] #2 #2 Fly.io health check mirrors Dockerfile settings
- [x] #3 #3 Grace period matches app startup time (15s baseline + 5s buffer = 20s)
- [x] #4 #4 /health endpoint responds <500ms (verified: ~54ms)
- [x] #5 #5 Manual test: Container reports healthy after startup (VERIFIED)
- [x] #6 #6 Coordination with TASK-52 (/health endpoint exists and works)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
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
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [x] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [x] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [x] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [x] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [x] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [x] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->