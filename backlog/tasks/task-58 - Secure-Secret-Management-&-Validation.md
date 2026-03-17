---
id: TASK-58
title: "Secure Secret Management & Validation"
status: To Do
priority: CRITICAL
assignee: null
parent: TASK-50
labels:
  - security
  - dockerfile
created: "2025-03-17"
updated: "2025-03-17"
---

# TASK-58: Secure Secret Management & Validation

## Description

Validate all build-time secrets before use; ensure no secrets leak into image layers. Document required secrets for self-hosting.

## Acceptance Criteria

- [ ] SENTRY_AUTH_TOKEN validated before use in build
- [ ] Clear error message if secret missing
- [ ] .env* excluded from Docker build context
- [ ] docker history shows no secrets in any layer
- [ ] Document: All required secrets for production
- [ ] Document: How to pass secrets in CI/CD
- [ ] Document: Fly.io secret manager usage
- [ ] No hardcoded secrets anywhere

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

```
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

