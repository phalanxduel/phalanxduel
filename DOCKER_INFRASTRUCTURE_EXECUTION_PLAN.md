# Docker Infrastructure Hardening — Comprehensive Execution Plan

**Status**: Ready for Implementation  
**Version**: 1.0  
**Created**: 2025-03-17  
**Owner**: Gordon (Docker Infrastructure Expert)  
**Target Release**: 7–10 weeks  

---

## Executive Summary

This document defines the complete execution plan for Docker infrastructure hardening across three phases:

1. **Phase 1 (3–4 weeks)**: Fly.io production hardening with security-first posture
2. **Phase 2 (2–3 weeks)**: Local docker-compose development environment with feature parity
3. **Phase 3 (2–3 weeks)**: Self-hosting readiness and deployment automation

**Core Principles**:
- Security hardening is the blocking concern—every phase includes security validation
- Do not change codebase functionality; only Docker infrastructure
- Maintain bare-metal development workflow parity; both paths available
- Comprehensive CI/CD validation with security scanning and integration tests
- Prepare for future self-hosting via hardened, publishable images

---

## Phase 1: Fly.io Production Hardening (Weeks 1–4)

### Goals
1. Secure the production image and deployment pipeline
2. Implement security scanning and attestation in CI
3. Ensure reliability and graceful failure handling
4. Prepare observability foundation for SigNoz integration
5. Lock in non-breaking Dockerfile best practices

### Architecture Overview

```text
┌─────────────────────────────────────────────────────────┐
│                  CI/CD Pipeline (GitHub Actions)        │
├─────────────────────────────────────────────────────────┤
│  • Lint + Typecheck + Test (existing)                   │
│  • Docker build with BuildKit cache mounts              │
│  • Trivy security scan (CVE detection)                  │
│  • Image size verification                              │
│  • Health check validation                              │
│  • Load test baseline (K6)                              │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Docker Image Registry (future)             │
│  • Signed with cosign/Sigstore                          │
│  • SBOM (Software Bill of Materials)                    │
│  • Attestations from CI                                 │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│            Fly.io Production Deployment                 │
├─────────────────────────────────────────────────────────┤
│  • Non-root user execution (nodejs:1001)               │
│  • Graceful SIGTERM shutdown (30s timeout)              │
│  • Liveness probe: /health (HTTP 200)                   │
│  • Readiness probe: /ready (DB + deps check)            │
│  • Auto migration on release_command                    │
│  • SigNoz/OTLP telemetry export                         │
│  • Secrets via Fly.io secret manager                    │
│  • Min 1 machine (no cold starts in prod)               │
│  • Blue-green ready (via Fly.io strategy field)         │
└─────────────────────────────────────────────────────────┘
```

### Phase 1 Task Breakdown (15 tasks)

#### **TASK-5X.1: Enhance Dockerfile with Security Hardening**
- **Acceptance Criteria**:
  - Add non-root USER (nodejs:1001) to runtime stage
  - Add graceful SIGTERM handler in Node.js app
  - Verify `--chown=nodejs:nodejs` on all COPY commands
  - Add `--strict-peer-dependencies` flag to pnpm install
  - Add BuildKit cache mounts for pnpm store
  - Enhance Dockerfile comments for OTLP/environment variables
  - Image builds successfully with `docker buildx build --platform linux/amd64,linux/arm64`
  
- **Implementation Notes**:
  - Modify `Dockerfile` only; no changes to Node.js app logic
  - Graceful shutdown: Add to `server/src/index.ts` SIGTERM handler
  - Security: Enforce readOnlyRootFilesystem in K8s readiness (document, don't enforce yet)
  
- **Verification**:
  ```bash
  docker build -t phalanxduel:secure .
  docker run --rm phalanxduel:secure id  # Should show uid=1001
  docker inspect phalanxduel:secure | grep User
  # Verify no layer contains secrets (grep Dockerfile for ARG)
  ```

- **Risk**: None—purely additive, no functional changes
- **Effort**: 3 hours
- **Priority**: CRITICAL (Security blocking)

---

#### **TASK-5X.2: Implement Liveness & Readiness Endpoints**
- **Acceptance Criteria**:
  - `GET /health` → `{ status: "ok", timestamp: ISO8601 }` (basic liveness)
  - `GET /ready` → `{ ready: true, database: "ok" }` (readiness with dependency check)
  - Both endpoints return 503 Service Unavailable if deps unhealthy
  - Database connectivity test on /ready (SELECT 1 query)
  - Endpoints documented in Swagger/OpenAPI
  - Fly.io health check updated to use `/health` with proper intervals
  - `docker-compose` health checks use `/ready` for startup dependencies

- **Code Changes Required**:
  - `server/src/routes/health.ts` (new file or extend existing)
  - Update `server/src/app.ts` to register routes
  - No changes to gameplay/engine logic

- **Verification**:
  ```bash
  curl http://localhost:3001/health  # { status: "ok" }
  curl http://localhost:3001/ready   # { ready: true, database: "ok" }
  curl http://localhost:3001/ready?timeout=5000  # When DB offline: 503
  ```

- **Risk**: Low—new endpoints only, no breaking changes
- **Effort**: 2 hours
- **Priority**: HIGH (Reliability + Observability)

---

#### **TASK-5X.3: Add Graceful Shutdown Handler**
- **Acceptance Criteria**:
  - Server catches SIGTERM, initiates graceful close
  - Existing WebSocket connections have 30s grace period to complete
  - New requests rejected with 503 (shutting down) after SIGTERM received
  - Fastify app.close() waits for in-flight requests
  - Process exits with code 0 on successful shutdown, 1 on timeout
  - Dockerfile CMD handles signals properly (no PID 1 issues)

- **Code Changes Required**:
  - `server/src/index.ts`: Add signal handler
  - Test graceful shutdown: `docker run ... && sleep 5 && docker stop` (should not error)

- **Verification**:
  ```bash
  docker run -d --name phalanx-test phalanxduel:secure
  sleep 2
  docker stop --time 35 phalanx-test  # 30s grace + 5s margin
  docker logs phalanx-test | grep -i "shutting down"
  # Exit code should be 0 or 143 (SIGTERM)
  ```

- **Risk**: Low—defensive code, no breaking changes
- **Effort**: 2 hours
- **Priority**: HIGH (Reliability + Data integrity)

---

#### **TASK-5X.4: Configure Docker BuildKit Cache Mounts**
- **Acceptance Criteria**:
  - Dockerfile uses `--mount=type=cache,target=/root/.pnpm-store` in deps and build stages
  - pnpm cache persists across builds (40–60% faster rebuilds)
  - Works with `docker buildx build` (no impact on standard `docker build`)
  - CI pipeline uses BuildKit: `DOCKER_BUILDKIT=1 docker build` or buildx action
  - `.dockerignore` excludes unnecessary files (reducing cache invalidation)

- **Implementation Notes**:
  - Update `Dockerfile` stages 1 & 2 with cache mounts
  - Enhance `.dockerignore`: exclude `src/`, `scripts/`, `docs/`, `LICENSE*`, etc.
  - CI workflow: Add DOCKER_BUILDKIT=1 environment variable

- **Verification**:
  ```bash
  DOCKER_BUILDKIT=1 docker build -t phalanxduel:v1 .  # First: full build
  DOCKER_BUILDKIT=1 docker build -t phalanxduel:v2 .  # Second: should use cache
  # Compare build times: 60–120s vs. 30–60s expected
  ```

- **Risk**: None—BuildKit is backwards compatible
- **Effort**: 1.5 hours
- **Priority**: MEDIUM (Performance optimization)

---

#### **TASK-5X.5: Implement Docker Security Scanning in CI**
- **Acceptance Criteria**:
  - CI workflow builds image and runs Trivy security scan
  - Scan results published as GitHub Action artifact
  - CVEs categorized by severity (CRITICAL, HIGH, MEDIUM, LOW)
  - Build fails on CRITICAL or HIGH CVEs (configurable threshold)
  - Scan includes both image layers and runtime dependencies
  - SBOM (Software Bill of Materials) generated and stored
  - Cosign signature prepared (not yet published)

- **Implementation**:
  - Create `.github/workflows/docker-security.yml` workflow
  - Add Trivy step: `aquasec/trivy-action@master`
  - Add SBOM generation: `syft` action or Trivy native
  - Store artifacts in GitHub Actions

- **Verification**:
  ```bash
  # Locally test Trivy
  docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
    aquasec/trivy image phalanxduel:latest
  ```

- **Risk**: None—informational only; no blocking until we fix findings
- **Effort**: 2.5 hours (including learning Trivy/syft)
- **Priority**: CRITICAL (Security scanning required)

---

#### **TASK-5X.6: Implement Image Size Monitoring & Gates**
- **Acceptance Criteria**:
  - CI workflow records final image size after each build
  - Size gate: Fail if image > 350MB (configurable)
  - Size logged as artifact for trend analysis
  - Identify layers contributing most to size
  - Document layer-by-layer breakdown (for optimization decisions)

- **Implementation**:
  - Add CI step: `docker image inspect <image> --format='{{.Size}}'`
  - Calculate size in MB, compare to threshold
  - Generate size report in GitHub Actions summary

- **Verification**:
  ```bash
  docker build -t phalanxduel:size-test .
  SIZE_BYTES=$(docker image inspect phalanxduel:size-test --format='{{.Size}}')
  SIZE_MB=$((SIZE_BYTES / 1024 / 1024))
  echo "Image size: ${SIZE_MB}MB"
  [ $SIZE_MB -lt 350 ] || { echo "Image too large!"; exit 1; }
  ```

- **Risk**: None—monitoring only
- **Effort**: 1 hour
- **Priority**: MEDIUM (Performance tracking)

---

#### **TASK-5X.7: Enhance Health Check in Dockerfile & Fly.io**
- **Acceptance Criteria**:
  - Dockerfile HEALTHCHECK uses `/health` endpoint with proper timeouts
  - Intervals: start-period=15s, period=30s, timeout=5s, retries=3
  - Fly.io health check synchronized with Dockerfile
  - Grace period matches app startup time
  - Health check returns appropriate HTTP status codes
  - WebSocket health check documented (defer implementation to Phase 2)

- **Implementation**:
  - Update `Dockerfile` HEALTHCHECK command
  - Update `fly.toml` health check config to match
  - Ensure `/health` endpoint is fast (<1s)

- **Verification**:
  ```bash
  docker build -t phalanxduel:health .
  docker run -d --name phalanx-health phalanxduel:health
  sleep 20  # Wait for startup
  docker inspect phalanx-health | grep -A 10 '"Health"'
  # Should show: "Status": "healthy"
  docker stop phalanx-health
  ```

- **Risk**: None—tuning only
- **Effort**: 1 hour
- **Priority**: HIGH (Reliability)

---

#### **TASK-5X.8: Secure Secret Management & Validation**
- **Acceptance Criteria**:
  - Production: All secrets stored in Fly.io secret manager (no .env files)
  - Build-time secrets (e.g., SENTRY_AUTH_TOKEN) validated before use
  - Validation: Check that required secrets exist before build continues
  - Error message is clear if secret is missing
  - `.env*` files excluded from Docker build context (via .dockerignore)
  - Documentation: List all required secrets + env vars for self-hosting
  - No secrets in image layers (verify with `docker history`)

- **Implementation**:
  - Update `Dockerfile` build stage: Add validation for SENTRY_AUTH_TOKEN
  - Create `docs/system/SECRETS_AND_ENV.md`: Document all required secrets
  - Enhance `.dockerignore` to ensure `.env*` never included

- **Verification**:
  ```bash
  # Test 1: Missing secret should fail or skip gracefully
  docker build -t phalanxduel:test . --secret id=SENTRY_AUTH_TOKEN < /dev/null
  # Should either fail with clear error or echo "skipping"
  
  # Test 2: Check image has no .env file
  docker run --rm phalanxduel:test ls -la / | grep -i env
  # Should return nothing
  
  # Test 3: Check build args not in layers
  docker history phalanxduel:test | grep -i sentry
  # Should return nothing
  ```

- **Risk**: Low—purely validation, no functional change
- **Effort**: 1.5 hours
- **Priority**: CRITICAL (Security compliance)

---

#### **TASK-5X.9: Optimize .dockerignore for Performance & Security**
- **Acceptance Criteria**:
  - Exclude all dev/test files: `*.test.ts`, `*.spec.ts`, `coverage/`, `logs/`
  - Exclude source files: `*/src/`, `scripts/`, `bin/`, `docs/`, `backlog/`, `admin/src/`, `client/src/`
  - Exclude unnecessary build artifacts: `artifacts/`, `tmp/`, `.nyc_output/`
  - Exclude secrets/env: `.env*`, `.git*`, `.husky/`
  - Exclude large/unnecessary: `LICENSE*`, `CHANGELOG.md`, `.pnpm-store/`
  - Resulting COPY context size <50MB (measured)
  - No performance regression in build time

- **Implementation**:
  - Audit current `.dockerignore`
  - Add comprehensive exclusions
  - Measure build context size: `docker build --build-arg BUILDKIT_INLINE_CACHE=1 2>&1 | grep "context"`

- **Verification**:
  ```bash
  # Measure context size
  docker build --progress=plain . 2>&1 | grep -i "context"
  # Should see context <50MB
  ```

- **Risk**: None—only excludes files already outside runtime
- **Effort**: 1 hour
- **Priority**: MEDIUM (Performance)

---

#### **TASK-5X.10: Document Production Deployment Checklist**
- **Acceptance Criteria**:
  - Pre-deployment checklist: security checks, health endpoints, secrets configured
  - Post-deployment validation: health check green, SigNoz receiving traces, error rate <0.1%
  - Rollback procedure: How to revert to previous image on Fly.io
  - Incident response runbook: Common failure modes + recovery
  - Monitoring dashboard: Key metrics to watch (latency p99, error rate, memory)
  - Documentation in `docs/system/DEPLOYMENT_CHECKLIST.md`

- **Implementation**:
  - Create deployment checklist doc
  - Reference existing health check + SigNoz + Fly.io docs

- **Verification**:
  - Doc review by human; no code verification

- **Risk**: None—documentation only
- **Effort**: 2 hours
- **Priority**: MEDIUM (Operational readiness)

---

#### **TASK-5X.11: Update Fly.io Configuration for Hardening**
- **Acceptance Criteria**:
  - `fly.toml` updated: health check intervals, graceful shutdown timeout (kill_timeout=30s)
  - `min_machines_running = 1` in production (prevent cold starts)
  - `strategy = "rolling"` for zero-downtime deployments
  - Release command runs migrations before deploy: `node server/dist/db/migrate.js`
  - Environment variables properly set (NODE_ENV, PORT, HOST, LOG_LEVEL)
  - Secrets configured via `fly secrets set` (documentation updated)

- **Implementation**:
  - Merge hardening recommendations into `fly.toml`
  - Document required secrets

- **Verification**:
  - Manual: `fly config` shows updated settings
  - Manual deploy test (stage environment first)

- **Risk**: Low if tested on stage first
- **Effort**: 1.5 hours
- **Priority**: CRITICAL (Production readiness)

---

#### **TASK-5X.12: Implement Load Testing Baseline (K6)**
- **Acceptance Criteria**:
  - K6 load test script created: `tests/load/phalanxduel-load.js`
  - Tests cover:
    - HTTP health check (100 VUs, 60s duration)
    - Match creation (POST /matches, 50 VUs)
    - WebSocket connection (25 VUs maintaining connections)
    - Error rate tracking
  - Baseline metrics recorded: throughput, latency (p50, p95, p99), error rate
  - CI integration: Run after image build passes (optional, long-running)
  - Local execution: `k6 run tests/load/phalanxduel-load.js`

- **Implementation**:
  - Install K6 (or document as dev dependency)
  - Write load test script against running server
  - Document baseline results

- **Verification**:
  ```bash
  k6 run tests/load/phalanxduel-load.js
  # Should show: reqs/sec, avg latency, error rate <1%
  ```

- **Risk**: None—testing only, doesn't affect production unless CI integration fails
- **Effort**: 3 hours
- **Priority**: MEDIUM (Performance validation)

---

#### **TASK-5X.13: Implement Dependency Security Validation (npm audit alternative)**
- **Acceptance Criteria**:
  - Evaluate lightweight dependency security checker (Snyk CLI, npm audit, or pnpm audit)
  - Integrate into CI: Fail on CRITICAL/HIGH vulnerabilities
  - Document: Which tool chosen and why
  - Baseline audit results recorded (to understand current posture)
  - Recommend remediation for any findings
  - Plan for ongoing updates (dependency maintenance process)

- **Implementation**:
  - Run `pnpm audit` or equivalent on current lockfile
  - Compare options (Snyk, npm audit, Syft + Grype)
  - Recommend lightweight option (likely Snyk free tier or pnpm audit)
  - Add CI step

- **Verification**:
  ```bash
  pnpm audit
  # Or
  snyk test
  ```

- **Risk**: None—scanning only
- **Effort**: 2 hours
- **Priority**: HIGH (Dependency security)

---

#### **TASK-5X.14: Standardize Environment Variables Documentation**
- **Acceptance Criteria**:
  - Create `docs/system/ENVIRONMENT_VARIABLES.md` documenting all env vars
  - Each var includes: name, purpose, default, required/optional, examples
  - Separate sections: Development, Production (Fly.io), Self-hosted
  - Links to secret management docs
  - Accessible from README and main docs index
  - Updated in Dockerfile as comments

- **Implementation**:
  - Audit codebase for all env var usage (grep for `process.env`)
  - Document each in canonical reference

- **Verification**:
  - Manual: Doc review for completeness

- **Risk**: None—documentation only
- **Effort**: 1.5 hours
- **Priority**: MEDIUM (Operational clarity)

---

#### **TASK-5X.15: Prepare Docker Hardened Images (DHI) Evaluation**
- **Acceptance Criteria**:
  - Research Docker Hardened Images offering + licensing
  - Create test Dockerfile with DHI base: `FROM docker/base:latest` (example)
  - Build + scan for vulnerability reduction vs. Alpine
  - Compare image size, layer count, startup time
  - Document findings: cost/benefit, recommendation for adoption
  - If adopting: Update primary Dockerfile to use DHI base (backward compatible)

- **Implementation**:
  - Create `Dockerfile.dhi` test variant
  - Run through full build + security scan pipeline
  - Document results + recommendation

- **Verification**:
  ```bash
  docker build -f Dockerfile.dhi -t phalanxduel:dhi .
  # Compare with existing image:
  # - Size
  # - Trivy CVE count
  # - Startup time
  ```

- **Risk**: None—evaluation only, no production change yet
- **Effort**: 2.5 hours
- **Priority**: MEDIUM (Security hardening research)

---

### Phase 1 Summary

| Task | Effort | Priority | Risk | Status |
|------|--------|----------|------|--------|
| TASK-5X.1: Dockerfile Security | 3h | CRITICAL | None | To Do |
| TASK-5X.2: Health/Readiness | 2h | HIGH | Low | To Do |
| TASK-5X.3: Graceful Shutdown | 2h | HIGH | Low | To Do |
| TASK-5X.4: BuildKit Cache | 1.5h | MEDIUM | None | To Do |
| TASK-5X.5: Security Scanning | 2.5h | CRITICAL | None | To Do |
| TASK-5X.6: Image Size Gates | 1h | MEDIUM | None | To Do |
| TASK-5X.7: Health Check Config | 1h | HIGH | None | To Do |
| TASK-5X.8: Secret Validation | 1.5h | CRITICAL | Low | To Do |
| TASK-5X.9: .dockerignore | 1h | MEDIUM | None | To Do |
| TASK-5X.10: Deploy Checklist | 2h | MEDIUM | None | To Do |
| TASK-5X.11: Fly.toml Hardening | 1.5h | CRITICAL | Low | To Do |
| TASK-5X.12: Load Testing | 3h | MEDIUM | None | To Do |
| TASK-5X.13: Dependency Security | 2h | HIGH | None | To Do |
| TASK-5X.14: Env Vars Doc | 1.5h | MEDIUM | None | To Do |
| TASK-5X.15: DHI Evaluation | 2.5h | MEDIUM | None | To Do |

**Total Phase 1 Effort**: ~28 hours (4–5 weeks at 1 workday/week focus, or 1 week concentrated)

**Phase 1 Success Criteria**:
- ✅ Build succeeds with 0 warnings
- ✅ Trivy scan shows 0 CRITICAL/HIGH CVEs in runtime dependencies
- ✅ Non-root user enforced
- ✅ Health check validates within 15s of startup
- ✅ Graceful shutdown completes within 30s
- ✅ Image size <350MB
- ✅ All secrets validated before build
- ✅ K6 baseline established: throughput, latency, error rate
- ✅ Fly.io deployment succeeds with zero downtime
- ✅ Logs show OTEL traces in SigNoz
- ✅ No bare-metal functionality broken

---

## Phase 2: Local Docker Compose Development (Weeks 5–7)

### Goals
1. Enable fully containerized local development environment
2. Maintain bare-metal parity (both paths available)
3. Provide hot-reload for rapid iteration
4. Enable integration testing with full stack
5. Prepare for self-hosted deployments

### Phase 2 Task Breakdown (11 tasks)

#### **TASK-5X.16: Create docker-compose.yml for Development**
- **Acceptance Criteria**:
  - `docker-compose.yml` includes:
    - `app` service: Built from current Dockerfile (development target)
    - `postgres` service: postgres:17-alpine, persistent volume
    - `collector` service: OTEL collector with SigNoz backend (optional)
  - All services on shared `phalanx-net` overlay network
  - Health checks on each service
  - Port mappings: 3001 (server), 5173 (client, host-built), 5432 (postgres), 4318 (OTEL HTTP)
  - `docker compose up` starts all services with correct startup order
  - `docker compose down` cleans up without data loss (volumes persist)
  - Bind mounts for hot-reload: `server/dist`, `client/dist` (for built files)

- **Implementation Notes**:
  - Server and client run outside compose (bare-metal parity) but can bind-mount into compose
  - Postgres data persisted in named volume `postgres_data`
  - OTEL collector optional; can disable via env flag

- **Verification**:
  ```bash
  docker compose up -d
  sleep 5
  docker compose ps  # All services healthy
  curl http://localhost:3001/health  # { status: "ok" }
  psql postgres://phalanx:phalanx_dev@localhost:5432/phalanxduel -c "SELECT 1;"
  docker compose down -v
  ```

- **Risk**: None—new file, no impact on existing
- **Effort**: 2.5 hours
- **Priority**: HIGH (Local dev experience)

---

#### **TASK-5X.17: Create docker-compose.test.yml for Integration Tests**
- **Acceptance Criteria**:
  - `docker-compose.test.yml` includes:
    - `app` service: Built with test target (or use runtime)
    - `postgres` service: Fresh DB, migrations auto-run
    - `collector` service: Disabled (optional for test)
  - Auto-migration on startup: Runs `pnpm db:migrate` before tests
  - Isolated DB (separate from dev): `phalanxduel_test`
  - Services wait for health checks before exposing ports
  - `docker compose -f docker-compose.test.yml up` → migrations run → services ready for test
  - Tests can be run via: `docker compose -f docker-compose.test.yml exec app pnpm test:server`

- **Implementation**:
  - Override compose file approach: base + test-specific overrides
  - Or separate compose file with full test configuration
  - Ensure DB is fresh and migrations applied

- **Verification**:
  ```bash
  docker compose -f docker-compose.test.yml up -d
  sleep 10
  docker compose -f docker-compose.test.yml exec app pnpm test:server
  # Should pass
  docker compose -f docker-compose.test.yml down -v
  ```

- **Risk**: None—isolated from dev
- **Effort**: 2 hours
- **Priority**: HIGH (Testability)

---

#### **TASK-5X.18: Create Development Environment Templates (.env files)**
- **Acceptance Criteria**:
  - `.env.development.local.example`: Template for bare-metal dev
    - DATABASE_URL, OTEL_EXPORTER_OTLP_ENDPOINT, LOG_LEVEL, Sentry DSNs (optional)
  - `.env.compose.local.example`: Template for docker-compose
    - PostgreSQL credentials, OTEL config, optional Sentry tokens
  - `.env.test.local.example`: Template for integration tests
  - Each file includes detailed comments explaining each variable
  - Variables linked to `docs/system/ENVIRONMENT_VARIABLES.md`
  - Gitignored actual `.env.*.local` files (no secrets committed)
  - README updated with setup instructions for both paths

- **Implementation**:
  - Create three template files
  - Add comments + links to canonical docs
  - Update README with setup steps

- **Verification**:
  - Manual: Copy template, fill in, run `docker compose up` or `pnpm dev:server`

- **Risk**: None—templates only
- **Effort**: 1 hour
- **Priority**: HIGH (Developer UX)

---

#### **TASK-5X.19: Implement Hot-Reload for Development**
- **Acceptance Criteria**:
  - Bare-metal: `pnpm dev:server` watches `src/`, rebuilds on change (existing tsx watch)
  - Docker compose: Volume mount `/app/server/dist` → `./server/dist` (local host)
    - Server code changes trigger rebuild on host, compose sees updated dist/
  - Client: Similar bind-mount for `client/dist` (Vite dev server runs on host)
  - Admin: Bind-mount for `admin/dist` if needed
  - No need to rebuild image for code changes (only deps/Dockerfile changes)
  - Iteration cycle: Edit file → Save → Refresh browser (<2s)

- **Implementation**:
  - Update `docker-compose.yml`: Add volume mounts for dist directories
  - Document in README: How to run bare-metal dev + compose together
  - No code changes needed

- **Verification**:
  ```bash
  docker compose up -d app postgres
  pnpm dev:server  # In separate terminal
  # Edit server/src/index.ts
  # Should see rebuild + hot reload
  curl http://localhost:3001/health  # Updated code live
  ```

- **Risk**: None—purely additive
- **Effort**: 0.5 hours
- **Priority**: HIGH (Developer experience)

---

#### **TASK-5X.20: Update README with Docker Compose Setup**
- **Acceptance Criteria**:
  - New section: "Local Development with Docker Compose"
  - Step-by-step: Copy .env, docker compose up, run dev servers, verify health
  - Instructions for both bare-metal only + hybrid (compose + bare-metal dev servers)
  - Links to environment template docs
  - Troubleshooting: Common errors (port conflicts, migrations failed, SigNoz connection)
  - Video/screenshot optional for UX clarity
  - Clear note: "Bare-metal dev still supported; choose your path"

- **Implementation**:
  - Add README section

- **Verification**:
  - Manual: Follow README steps from scratch (clean environment simulation)

- **Risk**: None—documentation
- **Effort**: 1.5 hours
- **Priority**: HIGH (Onboarding)

---

#### **TASK-5X.21: Implement Local Database Reset & Cleanup Scripts**
- **Acceptance Criteria**:
  - Script: `scripts/dev/reset-db.sh` → Drops all data, reruns migrations
  - Script: `scripts/dev/clean-compose.sh` → `docker compose down -v`, removes volumes
  - Script: `scripts/dev/logs.sh` → Tails all compose service logs
  - Scripts are safe (prompt for confirmation on destructive ops)
  - Documented in README dev section

- **Implementation**:
  - Create 3 shell scripts in `scripts/dev/`
  - Add executable permissions

- **Verification**:
  ```bash
  bash scripts/dev/reset-db.sh  # Should prompt, then reset
  bash scripts/dev/clean-compose.sh  # Should prompt, then clean
  ```

- **Risk**: None—dev-only scripts
- **Effort**: 1 hour
- **Priority**: MEDIUM (Developer UX)

---

#### **TASK-5X.22: Create Integration Test Suite (docker-compose.test.yml)**
- **Acceptance Criteria**:
  - Test compose file includes app + postgres with auto-migrations
  - CI step: Run full integration test suite against containerized stack
  - Tests cover:
    - Database connectivity
    - HTTP endpoints (/health, /ready)
    - WebSocket connection (basic handshake, not full gameplay)
  - Pass/fail reported in CI logs
  - Existing unit tests (pnpm test) still work in compose

- **Implementation**:
  - Create `docker-compose.test.yml`
  - Add CI step: `docker compose -f docker-compose.test.yml up -d && docker compose exec app pnpm test:server`
  - Document expected pass rate (100% for green builds)

- **Verification**:
  ```bash
  docker compose -f docker-compose.test.yml up -d
  docker compose -f docker-compose.test.yml exec app pnpm test:server
  # All tests pass
  ```

- **Risk**: Low—isolated test environment
- **Effort**: 2 hours
- **Priority**: HIGH (Testability)

---

#### **TASK-5X.23: Document Port & Service Dependencies**
- **Acceptance Criteria**:
  - Create `docs/system/SERVICE_PORTS_AND_DEPENDENCIES.md`
  - Document all services: server, client, admin, postgres, redis (removed), collector, signoz (if included)
  - Each service lists:
    - Port(s) it exposes
    - Dependencies (which services must be ready first)
    - Health check endpoint (if applicable)
    - Startup time (typical)
  - Diagram showing service interactions (ASCII or Mermaid)
  - Table format for quick reference

- **Implementation**:
  - Create doc + diagram

- **Verification**:
  - Manual: Diagram matches docker-compose.yml

- **Risk**: None—documentation
- **Effort**: 1 hour
- **Priority**: MEDIUM (Operational clarity)

---

#### **TASK-5X.24: Implement OTEL Collector Configuration**
- **Acceptance Criteria**:
  - `scripts/otel/collector-config.yaml` updated with SigNoz endpoint
  - Collector receives traces/metrics/logs from app
  - Forwarding to SigNoz backend (your hosted instance)
  - Optional: Console output for debugging
  - docker-compose includes collector service with config volume mount
  - Documentation: How to set OTEL_EXPORTER_OTLP_ENDPOINT in .env

- **Implementation**:
  - Create `scripts/otel/collector-config.yaml` with SigNoz integration
  - Mount in docker-compose
  - Document in README

- **Verification**:
  ```bash
  docker compose up -d
  pnpm dev:server  # Should send traces to SigNoz
  # Check SigNoz UI for traces
  ```

- **Risk**: None—optional feature, doesn't block local dev
- **Effort**: 1.5 hours
- **Priority**: MEDIUM (Observability)

---

#### **TASK-5X.25: Add Docker Compose to CI Pipeline**
- **Acceptance Criteria**:
  - CI workflow (GitHub Actions) includes docker-compose test step
  - Step: `docker compose -f docker-compose.test.yml up -d`
  - Step: Wait for health checks (20s timeout)
  - Step: Run integration tests: `docker compose exec app pnpm test:server`
  - Results logged to Actions output
  - Compose services cleaned up after test (even on failure)

- **Implementation**:
  - Add CI step in `.github/workflows/ci.yml` or new `docker-compose-ci.yml`
  - Ensure Services section uses PostgreSQL (or start via compose)

- **Verification**:
  - CI run: Should show compose tests passing

- **Risk**: Low—isolated to CI, doesn't affect production
- **Effort**: 1 hour
- **Priority**: HIGH (Testability)

---

#### **TASK-5X.26: Document Known Issues & Troubleshooting**
- **Acceptance Criteria**:
  - Common issues documented:
    - Port 3001/5173 already in use → Kill process or change port
    - Database migration fails → Check DATABASE_URL, run `docker compose logs postgres`
    - OTEL traces not appearing → Check OTEL_EXPORTER_OTLP_ENDPOINT, collector health
    - Permission denied on docker.sock → Run with proper Docker permissions
  - Troubleshooting steps for each issue
  - Links to relevant docs (logs, env vars, health checks)

- **Implementation**:
  - Create `docs/system/LOCAL_DEV_TROUBLESHOOTING.md`

- **Verification**:
  - Manual: Review completeness

- **Risk**: None—documentation
- **Effort**: 1 hour
- **Priority**: MEDIUM (Support)

---

### Phase 2 Summary

| Task | Effort | Priority | Risk | Status |
|------|--------|----------|------|--------|
| TASK-5X.16: docker-compose.yml | 2.5h | HIGH | None | To Do |
| TASK-5X.17: docker-compose.test.yml | 2h | HIGH | Low | To Do |
| TASK-5X.18: Env Templates | 1h | HIGH | None | To Do |
| TASK-5X.19: Hot-Reload | 0.5h | HIGH | None | To Do |
| TASK-5X.20: README Update | 1.5h | HIGH | None | To Do |
| TASK-5X.21: Dev Scripts | 1h | MEDIUM | None | To Do |
| TASK-5X.22: Integration Tests | 2h | HIGH | Low | To Do |
| TASK-5X.23: Service Docs | 1h | MEDIUM | None | To Do |
| TASK-5X.24: OTEL Config | 1.5h | MEDIUM | None | To Do |
| TASK-5X.25: CI Integration | 1h | HIGH | Low | To Do |
| TASK-5X.26: Troubleshooting | 1h | MEDIUM | None | To Do |

**Total Phase 2 Effort**: ~16 hours (2–3 weeks)

**Phase 2 Success Criteria**:
- ✅ `docker compose up` starts all services successfully
- ✅ Bare-metal dev (`pnpm dev:server`, etc.) still works (no regression)
- ✅ Both paths available: Pure bare-metal OR compose + bare-metal dev servers
- ✅ Health checks green within 20s
- ✅ Integration tests pass in compose environment
- ✅ Hot-reload works: Edit code → Auto-rebuild → Live update
- ✅ README clear for new developers
- ✅ No secrets committed to repo
- ✅ Traces appear in SigNoz when enabled

---

## Phase 3: Self-Hosting Readiness & Deployment Automation (Weeks 8–10)

### Goals
1. Prepare image publication strategy (future)
2. Create self-hosted deployment guide
3. Build operational runbooks
4. Enable multi-host deployments (single-host for MVP, scale later)
5. Establish image versioning and artifact storage

### Phase 3 Task Breakdown (9 tasks)

#### **TASK-5X.27: Design Image Publication Strategy**
- **Acceptance Criteria**:
  - Document image naming convention: `phalanxduel:<semver>-<arch>` (e.g., `1.0.0-amd64`)
  - Multi-architecture support: Buildx manifest for amd64, arm64 (prepare for Apple Silicon, Raspberry Pi)
  - Registry options evaluated: Docker Hub free tier, GitHub Container Registry, private registries (Artifactory, Harbor)
  - Recommendation: Which registry to use + why
  - Image tagging strategy: `latest`, semantic version, git SHA
  - Signature strategy: cosign/Sigstore for image attestation (optional, document for future)
  - SBOM publishing: Include with releases
  - No images published yet; documentation only

- **Implementation**:
  - Create `docs/system/IMAGE_PUBLICATION_STRATEGY.md`
  - Document recommendations

- **Verification**:
  - Manual: Review completeness + feasibility

- **Risk**: None—planning only
- **Effort**: 2 hours
- **Priority**: MEDIUM (Future readiness)

---

#### **TASK-5X.28: Create Self-Hosted Deployment Guide**
- **Acceptance Criteria**:
  - Guide covers single-host Docker deployment (non-Kubernetes MVP)
  - Prerequisites: Docker, Docker Compose, git
  - Steps:
    1. Clone repo or pull image
    2. Copy `.env.self-hosted.example` → `.env`
    3. Run `docker compose -f docker-compose.prod.yml up -d`
    4. Verify services healthy
    5. Configure domain + TLS (Traefik or nginx-proxy optional)
  - Database setup: PostgreSQL in compose (or connect to external)
  - Backup/restore procedures documented
  - Scaling: How to add more instances (load balancing notes)
  - Security checklist: Firewall, secrets management, monitoring

- **Implementation**:
  - Create `docs/SELF_HOSTED_DEPLOYMENT.md`
  - Create `docker-compose.prod.yml` template
  - Create `.env.self-hosted.example`

- **Verification**:
  - Manual: Follow guide on fresh host (or simulate with Docker-in-Docker)

- **Risk**: Low—new docs + files, no impact on existing
- **Effort**: 3 hours
- **Priority**: HIGH (Self-hosting enablement)

---

#### **TASK-5X.29: Create Backup & Restore Runbook**
- **Acceptance Criteria**:
  - Procedure: Automated daily PostgreSQL dumps
  - Script: `scripts/backup/backup-db.sh` → Exports DB to timestamped file
  - Script: `scripts/backup/restore-db.sh` → Restores from backup file
  - S3/cloud storage integration (optional): Document how to push backups off-host
  - Retention policy: Keep 7 days of daily backups (or configurable)
  - Testing: Verify backup/restore cycle works (test restore to separate DB)
  - Documentation: How to use scripts, schedule with cron

- **Implementation**:
  - Create backup/restore scripts
  - Document in `docs/system/BACKUP_AND_RESTORE.md`
  - Add cron job example

- **Verification**:
  ```bash
  bash scripts/backup/backup-db.sh
  # Should create backup file
  bash scripts/backup/restore-db.sh <backup-file>
  # Should restore successfully
  ```

- **Risk**: Low—tested thoroughly before running in prod
- **Effort**: 2 hours
- **Priority**: HIGH (Operational continuity)

---

#### **TASK-5X.30: Build Scaling & Load Balancing Guide**
- **Acceptance Criteria**:
  - Document single-host limitations (CPU, memory, connections)
  - Multi-host strategy: Separate app instances behind load balancer (Traefik, nginx)
  - Example: 2–3 app instances + 1 postgres instance + 1 load balancer
  - Docker Compose Swarm initialization + service deployment
  - Or: Pure Docker Compose with network load balancing (simpler for 2–3 hosts)
  - Health check integration with load balancer
  - Session affinity notes (if WebSocket sticky sessions needed)
  - Testing: Simulate failover (stop 1 instance, verify traffic routes to others)

- **Implementation**:
  - Create `docs/SCALING_AND_LOAD_BALANCING.md`
  - Example compose file with replicas + load balancer

- **Verification**:
  - Manual: Test failover scenario in local compose

- **Risk**: None—documentation + examples
- **Effort**: 2 hours
- **Priority**: MEDIUM (Scale readiness)

---

#### **TASK-5X.31: Create Incident Response Runbook**
- **Acceptance Criteria**:
  - Common failure modes documented:
    - High error rate (>1%) → Check logs, Sentry, trace latency
    - Database unavailable → Verify connection, check logs, failover if configured
    - App won't start → Check migrations, env vars, secrets, health endpoints
    - Memory leak / OOM → Review logs, enable heap dump, check recent changes
    - WebSocket disconnections → Check network, load balancer settings, graceful shutdown
  - For each: Diagnosis steps, recovery procedures, escalation path
  - Monitoring dashboards: What to watch in SigNoz + OS metrics
  - Rollback procedure: How to revert to last known-good image
  - Communication: Who to notify, how to update status page

- **Implementation**:
  - Create `docs/system/INCIDENT_RESPONSE.md`
  - Link to SigNoz dashboards setup

- **Verification**:
  - Manual: Review completeness

- **Risk**: None—documentation
- **Effort**: 2 hours
- **Priority**: HIGH (Operational confidence)

---

#### **TASK-5X.32: Create Monitoring Dashboard Setup Guide**
- **Acceptance Criteria**:
  - Prometheus scrape config for containerized app metrics
  - Grafana dashboard JSON: Key metrics
    - Request rate, latency p50/p95/p99
    - Error rate by endpoint
    - Database connection pool
    - Container CPU/memory
  - SigNoz integration: Traces view + error tracking
  - Alerting rules: Critical thresholds (error rate >5%, latency p99 >5s, memory >80%)
  - Documentation: How to deploy Prometheus + Grafana (optional) or use cloud alternatives

- **Implementation**:
  - Create monitoring setup guide: `docs/system/MONITORING_SETUP.md`
  - Example Prometheus config
  - Grafana dashboard JSON template

- **Verification**:
  - Manual: Deploy locally, verify metrics appear

- **Risk**: None—optional monitoring setup
- **Effort**: 2.5 hours
- **Priority**: MEDIUM (Observability)

---

#### **TASK-5X.33: Create Migration & Versioning Strategy**
- **Acceptance Criteria**:
  - Document image versioning: Semantic versioning (1.0.0), git SHA, date-based
  - Migration strategy: How to upgrade running instances
    - Rolling update: Kill old → Start new (downtime ~30s)
    - Blue-green: Run both versions, switch traffic (zero downtime)
  - Database migration handling: Backward-compatible schema changes, rollback plan
  - Rollback procedure: How to revert to previous image if new version fails
  - Testing: Every new version tested in staging before production

- **Implementation**:
  - Create `docs/VERSION_AND_MIGRATION_STRATEGY.md`
  - Reference Fly.io deployment model (as example)

- **Verification**:
  - Manual: Review with human

- **Risk**: None—planning documentation
- **Effort**: 1.5 hours
- **Priority**: MEDIUM (Operational stability)

---

#### **TASK-5X.34: Document Production Infrastructure Checklist**
- **Acceptance Criteria**:
  - Pre-deployment checklist:
    - Image built, scanned (0 CRITICAL/HIGH CVEs)
    - Tests pass (unit + integration)
    - Security validation (secrets, env vars, permissions)
    - Health endpoints verified
    - Load test baseline passed
    - Monitoring/alerting configured
  - Post-deployment checklist:
    - Services healthy (all /health green)
    - No errors in logs (error rate <0.1%)
    - Traces flowing to SigNoz
    - Metrics visible in Prometheus/Grafana
    - Backups configured + tested
    - Team notified of deployment
  - Rollback checklist: Steps to revert if issues detected

- **Implementation**:
  - Create `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`

- **Verification**:
  - Manual: Review with human before first production deployment

- **Risk**: None—checklist documentation
- **Effort**: 1 hour
- **Priority**: HIGH (Production readiness)

---

#### **TASK-5X.35: Prepare for Future CI/CD Image Push**
- **Acceptance Criteria**:
  - CI workflow skeleton ready (not executing yet)
  - GitHub Actions secret placeholders: `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`, `REGISTRY_URL`
  - Build step: `docker buildx build --push` (with `--load` for local testing)
  - Documentation: How to set up CI/CD image push when ready
  - Multi-architecture build: amd64 + arm64 manifests prepared

- **Implementation**:
  - Create `.github/workflows/docker-push.yml` (commented/disabled for now)
  - Document setup in `docs/IMAGE_PUBLICATION_STRATEGY.md`

- **Verification**:
  - Manual: Workflow syntax validated (no execution)

- **Risk**: None—skeleton only, not executed
- **Effort**: 1 hour
- **Priority**: LOW (Future readiness)

---

### Phase 3 Summary

| Task | Effort | Priority | Risk | Status |
|------|--------|----------|------|--------|
| TASK-5X.27: Image Strategy | 2h | MEDIUM | None | To Do |
| TASK-5X.28: Self-Hosted Guide | 3h | HIGH | Low | To Do |
| TASK-5X.29: Backup/Restore | 2h | HIGH | Low | To Do |
| TASK-5X.30: Scaling Guide | 2h | MEDIUM | None | To Do |
| TASK-5X.31: Incident Response | 2h | HIGH | None | To Do |
| TASK-5X.32: Monitoring Setup | 2.5h | MEDIUM | None | To Do |
| TASK-5X.33: Versioning Strategy | 1.5h | MEDIUM | None | To Do |
| TASK-5X.34: Prod Checklist | 1h | HIGH | None | To Do |
| TASK-5X.35: CI/CD Image Push | 1h | LOW | None | To Do |

**Total Phase 3 Effort**: ~17 hours (2–3 weeks)

**Phase 3 Success Criteria**:
- ✅ Self-hosted deployment guide complete + tested (simulated)
- ✅ Backup/restore scripts working
- ✅ Incident response runbook covers common scenarios
- ✅ Monitoring dashboard ready
- ✅ Image versioning strategy documented
- ✅ Multi-host scaling guidance provided
- ✅ Production deployment checklist defined
- ✅ CI/CD skeleton ready for future image push
- ✅ All operational procedures documented
- ✅ Bare-metal workflow unaffected

---

## Cross-Phase Verification & Quality Gates

### Verification Strategy

Each task moves to `Human Review` only after:

1. **Code changes verified**:
   - Dockerfile builds: `docker build -t phalanxduel:verify .`
   - No layer contains secrets: `docker history phalanxduel:verify | grep -i 'secret\|env'` (returns none)
   - Non-root user enforced: `docker run phalanxduel:verify id` (uid=1001)
   - Health check works: `docker run --health-cmd "..." phalanxduel:verify` (reports healthy)

2. **Security scanning passed**:
   - Trivy scan: `docker run --rm aquasec/trivy image phalanxduel:verify` (0 CRITICAL/HIGH)
   - Dependency audit: `pnpm audit` (0 CRITICAL/HIGH)

3. **Integration testing passed**:
   - `pnpm test` (unit tests)
   - `docker compose -f docker-compose.test.yml up && docker compose exec app pnpm test:server` (integration)
   - Load test baseline: `k6 run tests/load/phalanxduel-load.js` (error rate <1%)

4. **Bare-metal parity verified**:
   - `pnpm dev:server` still works (no changes to app code)
   - Existing deployment scripts still work (Fly.io deploy succeeds)

5. **Documentation reviewed**:
   - New docs linked from appropriate locations
   - Examples tested (README setup steps, deployment guide)
   - No broken links or outdated references

### Phase-Level Verification

**After Phase 1 Complete**:
- Push to Fly.io staging (if available) or use Fly.io preview
- Verify: Health checks green, SigNoz traces flowing, no errors
- Bare-metal scripts still work
- Image scans clean

**After Phase 2 Complete**:
- `docker compose up` from clean state
- Run full integration test suite
- Verify hot-reload works
- New developers follow README setup (pair with human tester)

**After Phase 3 Complete**:
- Self-hosted guide executed on fresh host (simulated or actual)
- Backup/restore tested
- Monitoring dashboards display real metrics
- Incident response runbook tested against failure scenarios (chaos engineering optional)

---

## Implementation Sequencing & Dependencies

### Critical Path (Blocking Tasks)

1. **Phase 1.1**: TASK-5X.1 (Dockerfile security) → TASK-5X.5 (security scanning)
   - Other Phase 1 tasks can parallelize after this

2. **Phase 1.2**: TASK-5X.2 (health/readiness) + TASK-5X.3 (graceful shutdown)
   - Enables all subsequent reliability tasks

3. **Phase 2.1**: TASK-5X.16 (docker-compose.yml)
   - Blocks all other Phase 2 tasks

4. **Phase 3.1**: TASK-5X.28 (self-hosted guide)
   - Depends on all Phase 1 + Phase 2 tasks being complete

### Suggested Execution Order

```text
Week 1:
  Mon–Tue: TASK-5X.1 (Dockerfile), TASK-5X.5 (security scanning)
  Wed:     TASK-5X.2 (health/readiness), TASK-5X.3 (graceful shutdown)
  Thu:     TASK-5X.8 (secret validation), TASK-5X.9 (.dockerignore)
  Fri:     TASK-5X.7 (health check config), TASK-5X.11 (fly.toml)
  Parallel: TASK-5X.4 (BuildKit), TASK-5X.6 (image size gates)

Week 2:
  Mon–Tue: TASK-5X.10 (deploy checklist), TASK-5X.14 (env vars doc)
  Wed:     TASK-5X.12 (load testing), TASK-5X.13 (dependency security)
  Thu:     TASK-5X.15 (DHI evaluation)
  Fri:     Phase 1 verification + human review
  Parallel: TASK-5X.14 (env docs), TASK-5X.10 (checklist)

Week 3:
  Mon–Tue: TASK-5X.16 (docker-compose.yml), TASK-5X.17 (compose.test.yml)
  Wed:     TASK-5X.18 (env templates), TASK-5X.20 (README update)
  Thu:     TASK-5X.22 (integration tests), TASK-5X.25 (CI integration)
  Fri:     TASK-5X.19 (hot-reload), TASK-5X.21 (dev scripts)
  Parallel: TASK-5X.23 (service docs), TASK-5X.24 (OTEL config)

Week 4:
  Mon–Tue: TASK-5X.26 (troubleshooting doc)
  Wed:     Phase 2 verification + human review
  Thu–Fri: Phase 2 fixes (if needed)

Week 5:
  Mon–Tue: TASK-5X.28 (self-hosted guide), TASK-5X.29 (backup/restore)
  Wed:     TASK-5X.31 (incident response), TASK-5X.34 (prod checklist)
  Thu:     TASK-5X.30 (scaling guide), TASK-5X.32 (monitoring setup)
  Fri:     TASK-5X.27 (image strategy), TASK-5X.33 (versioning)

Week 6:
  Mon:     TASK-5X.35 (CI/CD image push skeleton)
  Tue–Wed: Phase 3 verification + human review
  Thu–Fri: Phase 3 fixes (if needed)
```

---

## Risk Mitigation

### Security Risks

| Risk | Mitigation |
|------|-----------|
| Non-root user breaks existing app | Testing: Run app as non-root locally; verify all file I/O works |
| Graceful shutdown causes data loss | Testing: Simulate shutdown during active request; verify no orphaned connections |
| Secrets leak into image layers | Scanning: docker history inspection; Trivy scan; manual layer audit |
| BuildKit cache poisoning | Mitigation: Separate cache mounts per package; no cross-layer cache reuse |
| CVE in base image | Scanning: Trivy; automated alerts; rapid base image updates |

### Operational Risks

| Risk | Mitigation |
|------|-----------|
| Bare-metal workflow breaks | Testing: Run `pnpm dev:server` + deployment scripts after each phase |
| docker-compose doesn't match production | Parity checks: Compare env vars, ports, health checks, startup order |
| Database migrations fail in compose | Testing: Dry run migrations in isolation; test rollback |
| Fly.io deployment fails | Staging test: Deploy to staging before prod; verify health checks |

### Implementation Risks

| Risk | Mitigation |
|------|-----------|
| Scope creep (architecture changes) | Gate: All architecture changes require human approval; document decision |
| Task dependencies overlooked | Planning: Critical path identified; sequencing locked before execution |
| Human review bottleneck | Batching: Group related tasks; conduct reviews in Phase gates |

---

## Success Metrics

### Phase 1 Success
- ✅ Production image is hardened (non-root, graceful shutdown, scanning clean)
- ✅ Fly.io deployment succeeds with zero downtime
- ✅ Security scanning integrated into CI
- ✅ Load test baseline established
- ✅ Zero bare-metal regressions

### Phase 2 Success
- ✅ New developers can `docker compose up` + `pnpm dev:server` in <10 minutes
- ✅ Integration tests pass 100% in compose environment
- ✅ Hot-reload works for rapid iteration
- ✅ Bare-metal dev still fully supported (no forced containerization)
- ✅ Documentation clear + complete

### Phase 3 Success
- ✅ Self-hosted deployment guide is executable and documented
- ✅ Backup/restore tested and working
- ✅ Operational runbooks cover all common scenarios
- ✅ Monitoring dashboards provide visibility
- ✅ Image publication strategy defined (execution TBD)

---

## Technical Decisions & Trade-offs

### Decision 1: Non-Root User Implementation
- **Choice**: Create nodejs:1001 user in runtime stage only
- **Rationale**: Minimal attack surface; user doesn't need write permissions except during startup
- **Trade-off**: Build stage still runs as root (acceptable; build artifacts trusted)

### Decision 2: Health Check Liveness vs. Readiness
- **Choice**: Two endpoints (`/health` for liveness, `/ready` for readiness)
- **Rationale**: Allows Kubernetes/orchestrators to distinguish states; liveness for monitoring, readiness for traffic
- **Trade-off**: Requires small code addition to server; worth the clarity

### Decision 3: docker-compose for Development
- **Choice**: Compose optional; both bare-metal and containerized paths supported
- **Rationale**: Flexibility for developers; no forced containerization
- **Trade-off**: Requires maintaining two setup paths; documented clearly to avoid confusion

### Decision 4: Single-Host Docker (No Kubernetes Initial)
- **Choice**: Docker Compose for local/staging; self-hosted single-host via Compose; scale later with Swarm/K8s
- **Rationale**: Simpler initial setup; no K8s complexity; can add K8s later if needed
- **Trade-off**: Swarm/K8s deferred; managed services (RDS) may be preferred for multi-host initially

### Decision 5: Docker Hardened Images (DHI)
- **Choice**: Evaluate in Phase 1; adopt if no cost/size regression
- **Rationale**: OS-level security hardening is worth small size increase
- **Trade-off**: May not be available for all architectures (arm64); research required

### Decision 6: Load Testing in Phase 1
- **Choice**: K6 baseline + comprehensive test script; optional CI integration (long-running)
- **Rationale**: Establish performance baseline early; enable regression detection
- **Trade-off**: Adds build time to CI (mitigated by running as optional step)

---

## Assumptions & Dependencies

### Assumptions
1. Fly.io remains the production deployment target (for now)
2. PostgreSQL (neondb) is external; local dev gets containerized PostgreSQL
3. SigNoz is self-hosted or managed (OTEL integration works as-is)
4. Bare-metal development workflow must remain fully functional
5. No breaking changes to application code allowed
6. All secrets already managed by Fly.io (secrets set via `fly secrets set`)

### External Dependencies
- Docker + Docker Compose installed on dev machines
- Docker Buildx available (or easily installed via Docker Desktop)
- K6 for load testing (optional; installable)
- Trivy for security scanning (Docker-based; no installation needed)
- GitHub Actions for CI (already configured)

---

## Future Work (Out of Scope)

1. **Kubernetes Migration** (Phase 4, future):
   - Full K8s manifests (Deployment, StatefulSet, Ingress, PVC)
   - Helm charts for packaging
   - Multi-cluster failover strategy

2. **Container Registry Setup** (Phase 4, future):
   - Push to Docker Hub / ECR / GitHub Container Registry
   - Image signing (cosign/Sigstore)
   - Automated image scanning in registry

3. **Advanced Observability** (Phase 4, future):
   - OpenTelemetry advanced instrumentation
   - Custom metrics per game event
   - Distributed tracing across microservices (if/when split)

4. **Performance Optimization** (Ongoing, not Phase 1–3):
   - Image size reduction (<300MB target; requires investigation)
   - Build time optimization beyond cache mounts
   - Runtime optimization (memory, CPU tuning)

---

## Document Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-03-17 | 1.0 | Initial comprehensive execution plan |

---

## Approval & Sign-Off

- **Plan Owner**: Gordon (Docker Infrastructure Expert)
- **Requires Approval**: Human (Product/Operations Lead)
- **Start Date**: TBD (upon human approval)
- **Target Completion**: 7–10 weeks (3 phases)

**Next Step**: Create backlog tasks from this plan; begin Phase 1 implementation.
