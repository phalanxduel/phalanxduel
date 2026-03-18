---
id: TASK-61
title: Update Fly.io Configuration for Hardening
status: Done
assignee:
  - 'null'
created_date: ''
updated_date: '2026-03-18 02:47'
labels:
  - configuration
  - flyio
  - production
dependencies: []
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update fly.toml with security hardening, zero-downtime deployment strategy, and graceful shutdown configuration.
<!-- SECTION:DESCRIPTION:END -->

# TASK-61: Update Fly.io Configuration for Hardening

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 kill_timeout = "30s" for graceful shutdown
- [x] #2 strategy = "rolling" for zero-downtime
- [x] #3 min_machines_running = 1 (prevent cold starts)
- [x] #4 Health check synchronized with Dockerfile
- [x] #5 Release migrations: release_command still works
- [x] #6 Environment variables properly set
- [x] #7 Secrets documented for `fly secrets set`

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
<!-- AC:END -->
