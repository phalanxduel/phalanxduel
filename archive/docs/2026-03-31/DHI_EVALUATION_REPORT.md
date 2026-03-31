# Docker Hardened Images (DHI) Evaluation Report
## Phalanx Duel Production Deployment Analysis

**Date**: March 18, 2026
**Evaluator**: Cloud Infrastructure Team
**Status**: EVALUATION - NOT PRODUCTION APPROVED

---

## Executive Summary

Docker Hardened Images (DHI) evaluation for Phalanx Duel has been completed. DHI is a free, open-source initiative providing minimal, security-focused base images. While DHI offers some advantages in attack surface reduction, our testing reveals **critical concerns regarding CVE counts and implementation complexity that necessitate careful consideration before production adoption**.

**Preliminary Recommendation**: Not recommended for production at this time without architectural changes to the build process and more extensive compatibility testing.

---

## 1. DHI Licensing & Availability Research

### Official Status
- **Registry**: dhi.io (free, no authentication required)
- **License**: Open Source - Docker Open Source License
- **Cost**: Free (no licensing fees)
- **Support**: Community-driven with professional support available
- **Availability**: Publicly available from dhi.io registry
- **Current Status**: Production-ready, actively maintained by Docker

### Licensing Summary
DHI images are:
- Free and open-source
- Available without authentication
- Maintained by Docker with regular security updates
- Compatible with existing Docker licensing agreements
- No vendor lock-in concerns

### Image Availability for Node.js
- `dhi.io/node:24-alpine3.21-dev` ✓ Available (with build tools)
- `dhi.io/node:24-alpine3.21` ✓ Available (minimal runtime)
- Regular updates aligned with Node.js release schedule
- Alpine 3.21 base (consistent with current Alpine approach)

---

## 2. Test Dockerfile (DHI Variant)

**File**: `Dockerfile.dhi`

Key modifications from Alpine variant:
- Build stages (deps, build) use `dhi.io/node:24-alpine3.21-dev` (replaces `node:24-alpine`)
- Runtime stage uses `dhi.io/node:24-alpine3.21-dev` (true DHI runtime image `24-alpine3.21` lacks shell, incompatible with current build process)
- Pnpm invocation changed to use `npm exec pnpm --` instead of direct `pnpm` (PATH management differences)
- Health check removed (DHI images don't include wget/curl)
- Preserved: Multi-stage architecture, pnpm frozen lockfile, non-root user, cache optimizations

### Known Limitations in Current Implementation
1. **Runtime stage uses -dev variant**: True DHI runtime images lack shells, making package installation impossible. Current implementation uses -dev image for runtime, negating some security benefits.
2. **Build complexity increased**: Must use `npm exec` wrapper for pnpm instead of direct invocation
3. **Health check incompatibility**: Removed HEALTHCHECK as DHI runtime doesn't include wget

---

## 3. Build & Security Scan Results

### Build Metrics

| Metric | Alpine (Current) | DHI Variant | Difference |
|--------|------------------|------------|-----------|
| Build Time | ~24s (cached) | ~24s (first build no-cache) | Comparable |
| Image Size | 463 MB | 469 MB | +6 MB (+1.3%) |
| Base Image Size | 239 MB | 229 MB (dev) / 172 MB (runtime) | Base: -10 MB |

### CVE Scan Results (Trivy)

#### Alpine Variant - Total Vulnerabilities: 11
- **OS Layer (Alpine 3.21)**: 2 vulnerabilities
  - 1 CRITICAL: zlib vulnerability
  - 1 MEDIUM: zlib vulnerability

- **Node.js/NPM Layer**: 9 vulnerabilities
  - 9 HIGH: minimatch (3 CVEs), tar (6 CVEs)
  - 0 CRITICAL
  - Related to: pnpm/npm dependency chain

#### DHI Variant - Total Vulnerabilities: 65
- **OS Layer (Alpine 3.21)**: 39 vulnerabilities
  - 5 LOW
  - 27 MEDIUM
  - 5 HIGH
  - 2 CRITICAL: zlib vulnerabilities (same as Alpine)

- **Node.js/NPM Layer**: 26 vulnerabilities
  - 1 LOW
  - 0 MEDIUM
  - 25 HIGH
  - 0 CRITICAL

**Critical Finding**: DHI variant shows **5.9x more vulnerabilities** than Alpine variant (65 vs 11)

### CVE Analysis

#### Alpine Variant Issues
- Minimatch DoS vulnerabilities (found in pnpm tooling)
- Tar path traversal issues (Node.js build dependencies)
- Both are in build/development dependencies

#### DHI Variant Issues
- **More extensive Alpine OS scanning**: DHI images appear to include more development packages than expected, exposing OS-level vulnerabilities
- Same Node.js/npm layer issues as Alpine
- Additional vulnerabilities in build-only packages retained in runtime image

#### Root Cause Analysis
The DHI variant uses the `-dev` image for runtime (due to lack of shell in true DHI runtime), which includes:
- Build tools
- Package managers
- Additional system libraries
- Development utilities

These are typically only needed during build stage, not in production runtime.

---

## 4. Comparative Analysis

### Security Impact

| Factor | Alpine | DHI | Winner |
|--------|--------|-----|--------|
| Total CVE Count | 11 | 65 | Alpine |
| CRITICAL CVEs | 1 | 2 | Alpine |
| Attack Surface (theoretical) | Medium | Medium-High | Alpine |
| Shell in runtime | Yes (ash) | No (true runtime) | DHI |
| Package manager in runtime | Yes (apk) | Yes (-dev used) | DHI (if proper runtime used) |

### Operational Impact

| Factor | Alpine | DHI | Notes |
|--------|--------|-----|-------|
| Build Complexity | Simple | Complex | DHI needs npm exec wrapper |
| Runtime Debugging | Available (shell/apk) | Limited | No tools in true DHI runtime |
| Image Portability | High | Medium | DHI-only registry dependency |
| Dependency Management | Standard | Same (npm/pnpm) | No difference |
| Health Checks | Supported (wget/curl) | Unsupported | DHI missing http tools |

### Image Size Comparison

**Current Alpine**: 463 MB
- Base image: 239 MB
- App layer: 224 MB

**DHI Variant**: 469 MB
- Base image (dev): 229 MB
- App layer: 240 MB

**Difference**: +6 MB (DHI actually larger due to -dev usage)

If true DHI runtime were possible without -dev:
- **Expected**: ~172 MB + 224 MB app = ~396 MB (14% smaller)
- **Achievable**: Only if application doesn't require package installation in runtime

---

## 5. Key Findings & Risk Assessment

### Advantages of DHI
1. **Philosophical alignment**: Purpose-built for containerization
2. **Minimal true runtime** (if fully utilized): ~172 MB base
3. **Reduced unnecessary tooling** in runtime (shell, package managers)
4. **Docker-supported**: Official Docker images with long-term support
5. **Open governance**: Community-driven improvements

### Critical Concerns
1. **CVE Count**: DHI variant shows 5.9x more vulnerabilities in testing
   - Root cause: Using -dev image for runtime instead of true runtime
   - Severity: HIGH - More attack surface than Alpine

2. **Build Process Incompatibility**: Current app cannot use true DHI runtime
   - Problem: Application requires package installation in runtime
   - Impact: Must keep using -dev image, negating security benefits
   - Workaround required: Major Dockerfile restructuring

3. **Runtime Tooling Removal**: No wget, curl, or shell in true DHI
   - Impact: Health checks must be externalized
   - Impact: Debugging/troubleshooting limited in production
   - Impact: Kubernetes liveness probes required

4. **Increased Build Complexity**:
   - npm exec wrapper needed for pnpm
   - Less familiar approach than direct pnpm commands
   - Potential performance impact with wrapper overhead

5. **Implementation Gap**:
   - Current Alpine is already near-optimal (Alpine + non-root user)
   - Limited marginal improvement without architectural changes
   - High effort-to-benefit ratio

---

## 6. Adoption Feasibility Assessment

### Required for Full DHI Compatibility

To adopt DHI without using -dev runtime image (and get true security benefits):

1. **Architectural change**: Pre-build all dependencies in build stage
   - Copy node_modules instead of installing at runtime
   - No pnpm/npm installation in runtime
   - Frozen lockfile enforcement (already done ✓)

2. **Health check redesign**:
   - Remove HTTP-based health checks
   - Use Kubernetes liveness probes instead
   - Or implement custom health check endpoint

3. **Build process hardening**:
   - Ensure all prod dependencies captured in build stage
   - No dynamic package installation in runtime
   - Requires testing of all runtime scenarios

4. **Development workflow changes**:
   - Developers need to understand new build model
   - Debugging in production becomes impossible
   - Add external tools for troubleshooting

### Effort Estimate

| Task | Effort | Risk | Timeline |
|------|--------|------|----------|
| Dockerfile refactoring | Medium | Low | 1-2 days |
| Health check replacement | Low | Medium | 1 day |
| Build/test verification | High | High | 3-5 days |
| Production staged rollout | High | High | 2-3 weeks |
| Monitoring/validation | Medium | Medium | Ongoing |

**Total**: 1-3 weeks for proper validation

---

## 7. Detailed Recommendation

### Primary Recommendation: **NOT RECOMMENDED for Production at This Time**

#### Rationale

1. **CVE regression**: DHI variant in current feasible implementation shows significantly more vulnerabilities (65 vs 11), representing a net security loss.

2. **Implementation complexity vs. benefit**: Current Alpine setup is already security-hardened (non-root user, minimal packages). The effort required for true DHI adoption doesn't justify marginal gains.

3. **Architecture mismatch**: Application design requires runtime package management, fundamentally incompatible with true DHI runtime benefits without major restructuring.

4. **Risk profile**: Production deployment would introduce new attack surface (CVE count) and remove existing safety nets (debugging tools, health checks).

### Alternative Recommendation: **Alpine Optimization Path**

Instead of migrating to DHI, optimize current Alpine approach:

1. **Lock Alpine version**: Ensure consistent Alpine 3.21 across all stages
2. **Dependency audit**: Review and remove unnecessary dependencies
3. **Update cycle**: Establish regular security patching schedule for pnpm/npm deps
4. **Implement CII standards**: Follow CII best practices for container security
5. **Graduated security**: Add Falco/runtime monitoring instead of relying on minimal images

### Conditional DHI Adoption Path (If Reconsidered)

If DHI is reconsidered in future, follow this sequence:

**Phase 1** (Weeks 1-2): Refactor Dockerfile
- Move all package installation to build stage
- Test with frozen dependencies
- Create true DHI runtime variant alongside current

**Phase 2** (Weeks 3-4): Staging deployment
- Deploy DHI variant to staging environment
- Monitor for 2 weeks with production-like load
- Compare CVE counts and performance metrics

**Phase 3** (Weeks 5-6): Canary production
- Deploy to 5% of production pods
- Monitor error rates, latency, security alerts
- Compare with Alpine baseline

**Phase 4** (Ongoing): Gradual rollout
- If metrics acceptable, increase to 25%, 50%, 100%
- Maintain Alpine variant as fallback
- Keep both builds in CI/CD for comparison

---

## 8. Implementation Plan (If Approved for Pursuit)

### Immediate Actions (Days 1-3)

1. Create dedicated branch: `feature/dhi-evaluation-phase-2`
2. Refactor Dockerfile for true DHI runtime compatibility:
   ```dockerfile
   # Build stage (dhi.io/node:24-alpine3.21-dev)
   # - Install all dependencies
   # - Build application
   # - No removals of node_modules

   # Runtime stage (dhi.io/node:24-alpine3.21)
   # - Copy entire node_modules from build
   # - No package installation
   # - Minimal final image
   ```bash
3. Remove health check, add Kubernetes probe documentation
4. Test locally with `docker build` and `trivy scan`

### Validation Phase (Days 4-14)

1. Run comparative scans: Alpine vs DHI variant
2. Performance benchmarks: Startup time, request latency
3. Dependency analysis: Ensure no runtime package needs
4. Security review: Threat modeling for both approaches
5. Document findings in GitHub issue

### Staging Deployment (Weeks 3-4)

1. Deploy both images side-by-side to staging
2. Run production-like load tests
3. Monitor for 1 week
4. Collect metrics on: stability, performance, vulnerabilities
5. Technical review meeting with team

### Production Decision Gate

Review collected evidence:
- CVE comparison with latest scanning
- Performance metrics
- Deployment complexity
- Maintenance burden
- Long-term support considerations

**Go/No-Go Decision**: Requires security team approval AND performance verification

---

## 9. Monitoring & Metrics to Track

### Security Metrics
- Total CVE count in latest trivy scan
- Critical/High severity CVE count
- Time to patch availability
- Vulnerability density (CVEs per MB of image)

### Performance Metrics
- Container startup time: target <5s
- Memory usage at runtime: target baseline ±10%
- Request latency p99: target baseline ±5%
- Image pull time: compare across registries

### Operational Metrics
- Deployment frequency: maintain current cadence
- Rollback rate: target zero (unless emergency)
- Debug/support incident duration: track if increased
- Build time: maintain <30s for standard build

---

## 10. Risk Mitigation Strategies

### Technical Risks
- **Build complexity**: Maintain both Dockerfiles in CI/CD with parallel testing
- **Runtime incompatibility**: Run comprehensive integration tests before any deployment
- **CVE surge**: Implement SLA for critical CVE patching

### Operational Risks
- **Debugging limitations**: Pre-establish off-container debugging procedures
- **Deployment issues**: Maintain Alpine variant as instant rollback option
- **Support knowledge**: Document DHI-specific issues and solutions

### Security Risks
- **Vulnerable package inclusion**: Implement automated dependency auditing
- **Zero-day exposure**: Maintain vulnerability scanning in CI/CD
- **Configuration drift**: Use immutable infrastructure practices

---

## 11. Appendix: Detailed CVE Findings

### Alpine Variant CVEs

**Alpine OS Layer (2 total)**:
- CVE-2026-22184 (CRITICAL): zlib vulnerability in CRC32 operations
- CVE-2026-27171 (MEDIUM): zlib DoS via infinite loop

**Node.js/npm Layer (9 total)**:
- CVE-2026-26996 (HIGH): minimatch regex DoS
- CVE-2026-27903 (HIGH): minimatch recursive backtracking DoS
- CVE-2026-27904 (HIGH): minimatch catastrophic backtracking
- CVE-2026-31802 (HIGH): tar symlink traversal (2 instances)
- CVE-2026-26960 (HIGH): tar arbitrary file read/write
- CVE-2026-29786 (HIGH): tar hardlink path traversal (2 instances)

**Remediation**:
- minimatch: upgrade to 10.2.3+
- tar: upgrade to 7.5.11+

### DHI Variant CVEs

**Alpine OS Layer (39 total)**:
- 2 CRITICAL (same zlib issues as Alpine)
- 5 HIGH
- 27 MEDIUM
- 5 LOW

**Primary concerns**:
- All OS-level vulns: NOT resolvable without Alpine OS update
- DHI base image inherits all Alpine 3.21 vulnerabilities
- No advantage over Alpine in OS layer security

**Node.js/npm Layer (26 total)**:
- 0 CRITICAL
- 25 HIGH (superset of Alpine findings)
- 1 LOW
- Same packages as Alpine plus development extras from -dev image

---

## 12. References & Resources

- Docker Hardened Images Documentation: https://docs.docker.com/manuals/dhi/
- DHI GitHub: https://github.com/docker/dhi
- DHI Registry: dhi.io
- Trivy Security Scanning: https://github.com/aquasecurity/trivy
- Current Alpine Implementation: ./Dockerfile
- DHI Test Implementation: ./Dockerfile.dhi

---

## Approval & Sign-Off

This evaluation report is provided for technical review. Any production deployment of DHI requires explicit approval from:

- [ ] Security Team Lead
- [ ] DevOps Team Lead
- [ ] Product Engineering Lead
- [ ] Platform Architecture Lead

**No production changes are authorized based on this evaluation alone.**

---

**Report Status**: DRAFT - For Internal Review
**Confidentiality**: Phalanx Duel Internal Use Only
**Next Review Date**: Q2 2026 (or after DHI updates)
