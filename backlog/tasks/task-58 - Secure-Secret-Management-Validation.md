---
id: TASK-58
title: Secure Secret Management & Validation
status: Done
assignee:
  - 'null'
created_date: ''
updated_date: '2026-03-20 13:40'
labels:
  - security
dependencies: []
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Validate all build-time secrets before use; ensure no secrets leak into image layers. Document required secrets for self-hosting.
<!-- SECTION:DESCRIPTION:END -->

# TASK-58: Secure Secret Management & Validation

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 SENTRY_AUTH_TOKEN validated before use in build
- [x] #2 Clear error message if secret missing
- [x] #3 .env* excluded from Docker build context
- [x] #4 docker history shows no secrets in any layer
- [x] #5 Document: All required secrets for production
- [x] #6 Document: How to pass secrets in CI/CD
- [x] #7 Document: Fly.io secret manager usage
- [x] #8 No hardcoded secrets anywhere

## Implementation

### Dockerfile Validation

```dockerfile
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN 2>/dev/null || true) && \
    if [ -z "$SENTRY_AUTH_TOKEN" ]; then \
      echo "⚠️  SENTRY_AUTH_TOKEN not provided, skipping sourcemap upload"; \
    else \
      # Use token...
    fi
```

### .dockerignore

```text
.env
.env.*
!.env.example
```

### Create docs/system/SECRETS_AND_ENV.md

Document all secrets + env vars with purpose.

## Verification

```bash
docker build -t phalanxduel:secrets .
docker history phalanxduel:secrets | grep -i 'sentry\|token\|password\|secret'
# Should return nothing
```

## Risk Assessment

**Risk Level**: Low — Validation only

## Related Tasks

- TASK-51: Dockerfile security
- TASK-64: Environment variables documentation

---

**Effort Estimate**: 1.5 hours  
**Priority**: CRITICAL (Security compliance)  
**Complexity**: Low (validation + documentation)
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