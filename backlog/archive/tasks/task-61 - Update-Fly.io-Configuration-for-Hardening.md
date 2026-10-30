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