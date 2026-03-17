---
id: TASK-61
title: "Update Fly.io Configuration for Hardening"
status: To Do
priority: CRITICAL
assignee: null
parent: TASK-50
labels:
  - configuration
  - flyio
  - production
created: "2025-03-17"
updated: "2025-03-17"
---

# TASK-61: Update Fly.io Configuration for Hardening

## Description

Update fly.toml with security hardening, zero-downtime deployment strategy, and graceful shutdown configuration.

## Acceptance Criteria

- [ ] kill_timeout = "30s" for graceful shutdown
- [ ] strategy = "rolling" for zero-downtime
- [ ] min_machines_running = 1 (prevent cold starts)
- [ ] Health check synchronized with Dockerfile
- [ ] Release migrations: release_command still works
- [ ] Environment variables properly set
- [ ] Secrets documented for `fly secrets set`

## Implementation

See DOCKER_INFRASTRUCTURE_EXECUTION_PLAN.md for updated fly.toml.

## Verification

```bash
fly config
# Verify settings applied
fly secrets list
# Verify all required secrets present
```

## Risk Assessment

**Risk Level**: Low if tested on stage first

## Related Tasks

- TASK-51: Dockerfile security
- TASK-57: Health check config
- TASK-53: Graceful shutdown

---

**Effort Estimate**: 1.5 hours  
**Priority**: CRITICAL (Production readiness)  
**Complexity**: Low (configuration)

