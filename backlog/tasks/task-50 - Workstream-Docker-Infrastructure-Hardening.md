---
id: TASK-50
title: "Workstream: Docker Infrastructure Hardening"
status: Done
priority: HIGH
assignee: "@gordon"
labels:
  - infrastructure
  - security
  - docker
  - flyio
  - deployment
related:
  - task-51
  - task-52
  - task-53
  - task-54
  - task-55
  - task-56
  - task-57
  - task-58
  - task-59
  - task-60
  - task-61
  - task-62
  - task-63
  - task-64
  - task-65
  - task-66
created: "2025-03-17"
updated: "2025-03-17"
---

# Workstream: Docker Infrastructure Hardening

## Description

Comprehensive hardening of Docker infrastructure across three phases:

1. **Phase 1 (Weeks 1–4)**: Fly.io production hardening with security-first posture + staging environment
2. **Phase 2 (Weeks 5–7)**: Local docker-compose development environment with feature parity
3. **Phase 3 (Weeks 8–10)**: Self-hosting readiness and deployment automation

This workstream transforms the current Dockerfile into a production-grade, security-hardened container setup while maintaining bare-metal development workflow parity and preparing for future self-hosting.

### Core Principles

- **Security is blocking**: Every phase includes security validation (scanning, non-root, secret management)
- **No architecture changes**: Only Docker infrastructure; codebase functionality remains unchanged
- **Bare-metal parity**: Both development paths available (containerized optional)
- **Comprehensive CI/CD**: Security scanning, integration testing, load baselines
- **Self-hosting ready**: Prepare publishable, hardened images for self-hosting
- **Staging validation**: All changes tested on staging before production

## Acceptance Criteria

### Phase 1 (Fly.io Production Hardening + Staging)
- ✅ Fly.io staging environment created and auto-deploying
- ✅ Dockerfile implements security hardening (non-root user, graceful shutdown)
- ✅ Liveness (`/health`) and readiness (`/ready`) endpoints implemented
- ✅ Security scanning integrated in CI (Trivy CVE detection)
- ✅ Image size monitored with gates (<350MB)
- ✅ BuildKit cache mounts optimize build performance
- ✅ Secret validation prevents leakage
- ✅ Load test baseline established (K6, configurable)
- ✅ Dependency security audit configured
- ✅ Fly.io production configuration updated with hardening
- ✅ All changes tested on staging before production promotion
- ✅ All bare-metal workflows remain functional

### Phase 2 (Local Docker Compose Development + DHI Evaluation)
- ✅ `docker-compose.yml` provides full local stack (PostgreSQL, OTEL collector, app)
- ✅ Hot-reload working for rapid iteration
- ✅ Integration tests passing in compose environment
- ✅ Environment templates provided (no hardcoded secrets)
- ✅ README updated with clear setup instructions
- ✅ Both bare-metal and containerized paths fully supported
- ✅ Docker Hardened Images (DHI) evaluated and recommendation documented
- ✅ No secrets committed to repository

### Phase 3 (Self-Hosting Readiness)
- ✅ Self-hosted deployment guide complete and tested
- ✅ Backup/restore procedures automated and documented
- ✅ Incident response runbook covers common failure modes
- ✅ Monitoring setup guide provided
- ✅ Image publication strategy documented
- ✅ Operational checklists defined
- ✅ Future CI/CD image push skeleton prepared

## Implementation Plan

See `DOCKER_INFRASTRUCTURE_EXECUTION_PLAN.md` for comprehensive details:

- **Phase 1**: 16 tasks (26.5 hours)
- **Phase 2**: 11 tasks (16 hours)
- **Phase 3**: 9 tasks (17 hours)
- **Total**: 36 tasks (59.5 hours, 7–10 weeks)

## Phase 1 Child Tasks (16 tasks, 26.5 hours)

#### Week 1: Critical Foundation (Security + Staging)

- TASK-51: Enhance Dockerfile with Security Hardening (3h)
- TASK-52: Implement Liveness & Readiness Endpoints (2h)
- TASK-53: Add Graceful Shutdown Handler (2h)
- TASK-55: Implement Docker Security Scanning in CI (2.5h)
- TASK-66: Set Up Fly.io Staging Environment with Auto-Deploy (1.5h)

#### Week 2: Reliability & Configuration

- TASK-57: Enhance Health Check in Dockerfile & Fly.io (1h)
- TASK-58: Secure Secret Management & Validation (1.5h)
- TASK-61: Update Fly.io Configuration for Hardening (1.5h)

#### Weeks 2-3: Parallelizable (Performance, Operations, Testing)

- TASK-54: Configure Docker BuildKit Cache Mounts (1.5h)
- TASK-56: Implement Image Size Monitoring & Gates (1h)
- TASK-59: Optimize .dockerignore for Performance & Security (1h)
- TASK-60: Document Production Deployment Checklist (2h)
- TASK-62: Implement Load Testing Baseline (K6) - configurable (3h)
- TASK-63: Implement Dependency Security Validation (2h)
- TASK-64: Standardize Environment Variables Documentation (1.5h)

**Moved to Phase 2:**
- TASK-65: Prepare Docker Hardened Images (DHI) Evaluation (2.5h)

## Phase 2 Child Tasks (11 tasks, 16 hours)
- TASK-65: Prepare Docker Hardened Images (DHI) Evaluation (moved from Phase 1)
- TASK-67–TASK-76: docker-compose, local dev, integration tests (to be created)

## Phase 3 Child Tasks (9 tasks, 17 hours)
- TASK-77–TASK-85: Self-hosting, backup, monitoring, publication (to be created)

## Dependencies

- Existing Dockerfile (current baseline)
- GitHub Actions CI workflow
- Fly.io production deployment configuration
- Fly.io API token (for staging setup)
- Docker Desktop or Docker Engine with Buildx
- Trivy for security scanning (Docker-based)
- K6 for load testing
- Neon PostgreSQL (staging branch or separate project)

## Known Constraints

1. **No codebase architecture changes**: Only Dockerfile and configuration files updated
2. **Bare-metal workflow must remain functional**: All existing dev scripts still work
3. **Fly.io is production target** (for now): Long-term goal is self-hosting support
4. **PostgreSQL is neondb** in production; local compose gets containerized PostgreSQL
5. **SigNoz is already in use**: OTEL integration assumes existing setup
6. **No Redis**: Current build doesn't include Redis; not added
7. **Secrets via Fly.io**: Production uses `fly secrets set`; local/test uses `.env` files
8. **Staging environment new**: Completely fresh setup; no existing staging infrastructure

## Risk Assessment

### Security Risks (Mitigated)
- Non-root user implementation (tested locally before production)
- Graceful shutdown data integrity (connection draining tested)
- Secret leakage prevention (layer scanning + Trivy validation)
- Dependency CVEs (automated auditing)
- Staging isolation (separate app, secrets, database)

### Operational Risks (Mitigated)
- Bare-metal regression (tested after each phase)
- docker-compose production mismatch (parity checks built in)
- Database migration failures (dry run testing before deploy)
- Fly.io deployment issues (staging test before production)
- Staging auto-deploy failures (manual deploy fallback available)

### Implementation Risks (Mitigated)
- Scope creep (architecture decisions require human approval)
- Task dependency gaps (critical path pre-identified)
- Review bottlenecks (phase-level batching for human review)
- DNS propagation delays (documented in TASK-66; contingency plans)

## Verification Strategy

Each phase completes only after:

1. **Code verification**: Builds pass, no layer secrets, security scanning clean
2. **Integration testing**: docker-compose tests pass, load baseline established
3. **Staging testing**: Changes deployed to staging and validated
4. **Bare-metal parity**: Existing commands still work (pnpm dev:server, fly deploy)
5. **Documentation review**: Docs linked, examples tested, no broken references
6. **Human review**: All changes reviewed + signed off before next phase

## Implementation Timeline

```text
Week 1: Phase 1 Foundation (TASK-51–TASK-66) — Staging + Security
Week 2: Phase 1 Configuration (TASK-57–TASK-64) — Reliability + Parallelizable
Week 3: Phase 1 Verification (human review gate)
Week 4: Phase 2 Local Development (TASK-65–TASK-76)
Week 5: Phase 2 Verification (human review gate)
Week 6: Phase 3 Self-Hosting (TASK-77–TASK-85)
Week 7: Phase 3 Verification (human review gate)
```

## Success Metrics

### Phase 1 ✅
- Fly.io staging environment live and auto-deploying
- Production image is hardened (non-root, graceful shutdown, scanning clean)
- Fly.io production deployment succeeds with zero downtime
- All Phase 1 changes tested on staging before production
- Load test baseline <100ms p99 latency, <1% error rate
- Security scanning integrated and automated
- Zero bare-metal regressions

### Phase 2 ✅
- New developers: `docker compose up` + `pnpm dev:server` in <10 minutes
- Integration tests: 100% pass in compose environment
- Hot-reload: Edit file → Auto-rebuild → Live update (<2s)
- Bare-metal: `pnpm dev:server` still fully supported
- DHI evaluation documented with recommendation
- Documentation: Clear, complete, tested with real setup

### Phase 3 ✅
- Self-hosted deployment guide: Executable and fully documented
- Backup/restore: Tested and working end-to-end
- Incident response: All common scenarios covered
- Monitoring: Dashboards provide full visibility
- Image publishing: Strategy defined, ready for future execution

## Next Steps

1. ✅ Create comprehensive execution plan
2. ✅ Create Phase 1 backlog tasks (TASK-51–TASK-66)
3. ⏭️ Human approval for Phase 1 execution
4. ⏭️ Complete Fly.io staging setup (TASK-66)
5. ⏭️ Begin TASK-51 (Dockerfile security hardening)
6. ⏭️ Complete Phase 1 with human review gate
7. ⏭️ Create + execute Phase 2 tasks
8. ⏭️ Create + execute Phase 3 tasks

## Reference Documentation

- Comprehensive Plan: [DOCKER_INFRASTRUCTURE_EXECUTION_PLAN.md](../../DOCKER_INFRASTRUCTURE_EXECUTION_PLAN.md)
- Current Analysis: [DOCKER_ANALYSIS.md](../../DOCKER_ANALYSIS.md)
- Staging Setup: [TASK-66 - Set Up Fly.io Staging Environment](../../backlog/tasks/task-66%20-%20Set-Up-Fly.io-Staging-Environment-with-Auto-Deploy.md)
- Dockerfile: [Dockerfile](../../Dockerfile)
- Fly.io Config: [fly.toml](../../fly.toml)

---

## Implementation Notes

To be updated as tasks progress through phases.

### Phase 1 Progress

#### Week 1: Foundation

- [ ] TASK-66: Fly.io staging setup (1.5h) — Pending
- [ ] TASK-51: Dockerfile security (3h) — Pending
- [ ] TASK-52: Health/readiness endpoints (2h) — Pending
- [ ] TASK-53: Graceful shutdown (2h) — Pending
- [ ] TASK-55: Security scanning CI (2.5h) — Pending

#### Week 2: Configuration

- [ ] TASK-57: Health check config (1h) — Pending
- [ ] TASK-58: Secret validation (1.5h) — Pending
- [ ] TASK-61: Fly.toml hardening (1.5h) — Pending

#### Weeks 2-3: Parallelizable

- [ ] TASK-54: BuildKit cache (1.5h) — Pending
- [ ] TASK-56: Image size gates (1h) — Pending
- [ ] TASK-59: .dockerignore optimization (1h) — Pending
- [ ] TASK-60: Deploy checklist (2h) — Pending
- [ ] TASK-62: Load testing (3h) — Pending
- [ ] TASK-63: Dependency security (2h) — Pending
- [ ] TASK-64: Env vars documentation (1.5h) — Pending

**Phase 1 Total**: 26.5 hours (reduced from 28h; DHI moved to Phase 2)

---

**Status**: Ready for Phase 1 execution  
**Owner**: @gordon (Docker Infrastructure Expert)  
**Reviewer**: Human (awaiting approval)
