# ✅ FINAL PLAN READY — PHASE 1 EXECUTION READY TO BEGIN

**Status**: All decisions confirmed, staging setup task created, ready for implementation  
**Date**: March 17, 2025  
**Owner**: Gordon (Docker Infrastructure Expert)

---

## 🎯 Your Decisions Confirmed

### 1. **Graceful Shutdown** ✅
- APPROVED: Add SIGTERM handler to `server/src/index.ts`
- Implementation: TASK-53 (Week 1)
- Impact: 30s grace period for clean connection closure

### 2. **Load Testing** ✅
- APPROVED: Include in CI with configurable flag
- Implementation: TASK-62 (Weeks 2-3)
- CI Pattern: `SKIP_LOAD_TEST=1 pnpm check:ci` to disable
- Execution: ~3 hours to create K6 baseline + CI integration

### 3. **Docker Hardened Images (DHI)** ✅
- DECISION: Moved to Phase 2
- Rationale: Phase 1 focuses on critical security; DHI is optimization
- Implementation: TASK-65 → Phase 2
- Phase 1 Impact: Reduces 28h → 26.5h (still 4 weeks easily)

### 4. **Staging Environment** ✅
- NEW TASK CREATED: TASK-66 (Fly.io Staging Setup)
- Strategy: Auto-deploy on main push + manual fallback
- Database: Recommend Neon branch (isolated data, shared schema)
- Setup: ~1.5 hours manual + ongoing auto-deploy
- Timeline: Complete Week 1, ready for Phase 1 verification

---

## 📦 Phase 1: Final Scope (16 Tasks, 26.5 Hours)

### Week 1: Foundation + Staging (9 hours)
1. **TASK-66**: Set Up Fly.io Staging (1.5h) — CRITICAL
   - Create `phalanxduel-staging` Fly.io app
   - Configure play-staging.phalanxduel.com DNS
   - Set up auto-deploy on main push
   - Create fly.staging.toml with scaled-down resources

2. **TASK-51**: Dockerfile Security Hardening (3h)
   - Non-root user (nodejs:1001)
   - BuildKit cache mounts
   - Strict peer dependency checking
   - Multi-architecture support

3. **TASK-52**: Health/Readiness Endpoints (2h)
   - `/health` → liveness probe
   - `/ready` → readiness probe (includes DB check)
   - Swagger/OpenAPI documentation

4. **TASK-53**: Graceful Shutdown Handler (2h)
   - SIGTERM signal handler
   - 30s grace period for existing connections
   - Process exit handling

5. **TASK-55**: Docker Security Scanning in CI (2.5h)
   - Trivy integration
   - CVE fail-on-threshold
   - SBOM generation

### Week 2: Configuration (4 hours)
6. **TASK-57**: Health Check Configuration (1h)
   - Dockerfile HEALTHCHECK sync
   - fly.toml health check alignment
   - Proper intervals + timeouts

7. **TASK-58**: Secret Management & Validation (1.5h)
   - SENTRY_AUTH_TOKEN validation
   - .env* exclusion from build context
   - Document required secrets

8. **TASK-61**: Fly.io Production Hardening (1.5h)
   - Update fly.toml with security settings
   - Zero-downtime strategy
   - Graceful shutdown timeout (30s)
   - Min 1 machine (no cold starts)

### Weeks 2-3: Parallelizable (13.5 hours)
9. **TASK-54**: BuildKit Cache Mounts (1.5h)
10. **TASK-56**: Image Size Monitoring Gates (1h)
11. **TASK-59**: .dockerignore Optimization (1h)
12. **TASK-60**: Production Deployment Checklist (2h)
13. **TASK-62**: Load Testing Baseline (3h)
14. **TASK-63**: Dependency Security Validation (2h)
15. **TASK-64**: Environment Variables Documentation (1.5h)

---

## 🚀 Your Staging Setup (TASK-66 Detailed Steps)

### Manual Setup (You'll Do This First — ~45 min)

```bash
# Step 1: Create Fly.io app
flyctl apps create phalanxduel-staging

# Step 2: Create PostgreSQL branch in Neon (recommended)
# In Neon console: Create branch "staging" from main
# Copy connection string

# Step 3: Set Fly.io secrets
flyctl secrets set --app phalanxduel-staging \
  DATABASE_URL="postgresql://user:password@host/db"

flyctl secrets set --app phalanxduel-staging \
  SENTRY__SERVER__SENTRY_DSN="https://key@sentry.io/project"

# Step 4: Configure DNS
# In your DNS provider: Add CNAME
# Name: play-staging
# Target: phalanxduel-staging.fly.dev

# Step 5: Verify
curl https://play-staging.phalanxduel.com/health
```

### GitHub Actions Auto-Deploy (I'll Create This — ~45 min)

```yaml
# .github/workflows/deploy-staging.yml
# Automatically deploys to staging on every main push
# Uses FLY_API_TOKEN_STAGING secret (set by you)
```

### Result

- ✅ Staging app running at play-staging.phalanxduel.com
- ✅ Auto-deploys on every main push
- ✅ Can also manually deploy: `flyctl deploy --app phalanxduel-staging`
- ✅ Complete data isolation from production
- ✅ All Phase 1 hardening changes tested here first

---

## 📋 Phase 1 Execution Sequence

### Before Week 1 Begins

**You Must Do**:
1. Set up Fly.io staging app (TASK-66 manual steps above)
2. Add `FLY_API_TOKEN_STAGING` secret to GitHub
3. Configure Neon staging branch OR separate staging DB

**I Will Do**:
1. Move TASK-51 to `In Progress`
2. Create GitHub Actions auto-deploy workflow (part of TASK-66)
3. Begin Dockerfile security hardening

### Week 1: Foundation (Mon-Fri)

**Mon-Tue**: 
- TASK-51 (Dockerfile security) → Human Review
- TASK-66 (Staging setup) → Human Review

**Wed-Thu**:
- TASK-52 (Health endpoints) → Human Review
- TASK-53 (Graceful shutdown) → Human Review
- TASK-55 (Security scanning) → Human Review

**Fri**: 
- **Phase 1 Foundation Checkpoint**: All 5 tasks reviewed + approved
- First hardened image deployed to staging
- Verify: health checks green, graceful shutdown working, scanning passes

### Weeks 2-3: Configuration + Parallelizable

**Mon-Tue (Week 2)**:
- TASK-57, TASK-58, TASK-61 (Config tasks) → Parallel
- TASK-54, TASK-56, TASK-59 (Parallel tasks) → Parallel

**Wed-Thu (Week 2)**:
- TASK-60, TASK-62, TASK-63 → Parallel

**Fri (Week 2)**:
- TASK-64 (Last task) → Human Review

**Week 3**:
- **Phase 1 Final Checkpoint**: All 16 tasks reviewed + approved
- Staging fully tested with all hardening changes
- Ready for production promotion

---

## ✅ What Gets Done in Phase 1

### By End of Week 1

✅ Fly.io staging environment live  
✅ Non-root user running in production image  
✅ Graceful SIGTERM shutdown implemented  
✅ Health checks working (liveness + readiness)  
✅ Security scanning integrated in CI  
✅ First hardened image deployed to staging  

### By End of Week 3

✅ BuildKit cache optimization active  
✅ Image size gates enforced (<350MB)  
✅ .dockerignore cleaned up  
✅ Secret validation prevents leakage  
✅ Load test baseline established  
✅ Dependency security audit running  
✅ Production Fly.io config hardened  
✅ All documentation complete  
✅ Bare-metal workflow unaffected  

### Production Deployment Ready

✅ All hardened changes tested on staging first  
✅ Zero-downtime rolling update strategy configured  
✅ Health checks synchronized  
✅ Graceful shutdown tested  
✅ Security scanning passes (0 CRITICAL/HIGH CVEs)  
✅ Load test baseline established  
✅ Ready for immediate production deployment  

---

## 🎓 Key Implementation Details

### TASK-66: Staging Setup

**You provide**:
- Fly.io API token (for staging secrets)
- Neon branch choice (staging branch vs. separate DB)
- Confirmation that GitHub can auto-deploy to staging

**I provide**:
- Complete setup documentation
- fly.staging.toml template
- GitHub Actions workflow
- Verification scripts

**Timeline**: Complete by end of Week 1, ready for Phase 1 verification

### TASK-51: Dockerfile Hardening

**Changes**:
- Add non-root user (nodejs:1001)
- Add `--chown=nodejs:nodejs` to all COPY commands
- Add `--strict-peer-dependencies` to pnpm install
- Add BuildKit cache mounts
- Update .dockerignore with comprehensive exclusions

**Verification**:
```bash
docker build -t phalanxduel:secure .
docker run phalanxduel:secure id  # uid=1001
docker history phalanxduel:secure | grep -i secret  # No matches
```

### TASK-62: Load Testing (Configurable)

**Configuration**:
```bash
# Run in CI by default
pnpm check:ci

# Skip load testing if needed
SKIP_LOAD_TEST=1 pnpm check:ci

# Run locally
k6 run tests/load/phalanxduel-load.js
```

**Captures**:
- HTTP throughput
- Latency (p50, p95, p99)
- WebSocket connection success rate
- Error rate baseline

---

## ⏳ Ready to Execute

### Immediate Actions (You)

- [ ] Review TASK-66 setup steps (above)
- [ ] Confirm Neon branch vs. separate DB choice
- [ ] Confirm ready for me to begin TASK-51
- [ ] Provide Fly.io account confirmation

### Immediate Actions (Me)

- [ ] Create TASK-66 staging auto-deploy workflow
- [ ] Move TASK-51 to `In Progress`
- [ ] Begin Dockerfile security hardening
- [ ] Push first commit with non-root user + BuildKit cache
- [ ] Move TASK-51 to `Human Review` when ready

### Ongoing Communication

- Daily standup: What got done, what's next, any blockers
- Weekly checkpoint: All tasks reviewed, approve next batch
- Phase gate: All Phase 1 tasks must pass before Phase 2 begins

---

## 📊 Updated Phase 1 Summary

| Task | Hours | Week | Status | Priority |
|------|-------|------|--------|----------|
| TASK-66: Staging Setup | 1.5h | 1 | To Do | CRITICAL |
| TASK-51: Dockerfile Security | 3h | 1 | To Do | CRITICAL |
| TASK-52: Health Endpoints | 2h | 1 | To Do | CRITICAL |
| TASK-53: Graceful Shutdown | 2h | 1 | CRITICAL | HIGH |
| TASK-55: Security Scanning | 2.5h | 1 | To Do | CRITICAL |
| TASK-57: Health Check Config | 1h | 2 | To Do | HIGH |
| TASK-58: Secret Validation | 1.5h | 2 | To Do | CRITICAL |
| TASK-61: Fly.toml Hardening | 1.5h | 2 | To Do | CRITICAL |
| TASK-54: BuildKit Cache | 1.5h | 2-3 | To Do | MEDIUM |
| TASK-56: Image Size Gates | 1h | 2-3 | To Do | MEDIUM |
| TASK-59: .dockerignore | 1h | 2-3 | To Do | MEDIUM |
| TASK-60: Deploy Checklist | 2h | 2-3 | To Do | MEDIUM |
| TASK-62: Load Testing | 3h | 2-3 | To Do | MEDIUM |
| TASK-63: Dependency Security | 2h | 2-3 | To Do | HIGH |
| TASK-64: Env Vars Doc | 1.5h | 2-3 | To Do | MEDIUM |
| **Phase 1 Total** | **26.5h** | **3 weeks** | Ready | — |

---

## 🚀 Go/No-Go Checklist

- [x] Comprehensive plan created
- [x] 16 backlog tasks defined
- [x] Staging setup task created (TASK-66)
- [x] All risks mitigated
- [x] All decisions confirmed
- [x] No blockers remaining
- ⏳ **Awaiting your final confirmation to proceed with TASK-51**

---

## 📞 Final Questions for You

1. **Neon Database**: Should staging use a Neon branch OR separate Neon project?
   - **Branch** (recommended): Shared schema, isolated data, easier management
   - **Separate**: Completely isolated, can test schema changes

2. **Load Testing CI Default**: Should `SKIP_LOAD_TEST=1` be the default in CI, or always run?
   - **Always run** (recommended): Catch performance regressions early
   - **Skip by default**: Faster CI, run manually when needed

3. **Ready to Begin**: Can I move TASK-51 to `In Progress` and start Dockerfile security hardening immediately?

---

## ✨ Summary

Everything is planned, documented, and ready to execute. 

**Phase 1 will deliver**:
- Production-hardened Docker image
- Fly.io staging environment ready for testing
- Comprehensive security + reliability improvements
- Load test baseline established
- Zero bare-metal regressions

**Timeline**: 3 focused weeks to complete all 16 Phase 1 tasks.

**Next step**: Your confirmation on Neon strategy + green light to begin TASK-51.

I'm ready to deliver production-grade Docker infrastructure hardening. Let's begin! 🚀

