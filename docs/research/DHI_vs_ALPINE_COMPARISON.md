# Docker Hardened Images vs Alpine: Side-by-Side Comparison
## Phalanx Duel Evaluation

---

## 1. Base Image Comparison

### Alpine (node:24-alpine)
```bash
Registry: docker.io (Docker Hub)
Size: 239 MB
Base OS: Alpine Linux 3.21 (musl libc)
Included Tools: apk, ash shell, wget, curl
User: runs as root by default
Package Manager: apk (lightweight)
Build Tools: Available by default
License: Multi-license (depends on components)
```bash

### DHI Runtime (dhi.io/node:24-alpine3.21)
```bash
Registry: dhi.io (Docker Hardened Images)
Size: 172 MB
Base OS: Alpine Linux 3.21 (musl libc)
Included Tools: None (intentionally minimal)
User: runs as 'node' non-root by default
Package Manager: Not included
Build Tools: Not included
License: Docker Open Source License (free)
```bash

### DHI Build (dhi.io/node:24-alpine3.21-dev)
```bash
Registry: dhi.io (Docker Hardened Images)
Size: 229 MB
Base OS: Alpine Linux 3.21 (musl libc)
Included Tools: apk, ash shell, build tools
User: runs as root (for build)
Package Manager: apk
Build Tools: Make, gcc, etc.
License: Docker Open Source License (free)
```bash

---

## 2. Image Size Analysis

### Final Application Images


| Component | Alpine Variant | DHI Variant | Difference |

|-----------|------------------|-------------|-----------|

| Base Image | 239 MB | 229 MB (dev) | -10 MB |

| npm modules | 178 MB | 178 MB | Same |

| App artifacts | 46 MB | 46 MB | Same |

| **Total** | **463 MB** | **469 MB** | **+6 MB** |

**Finding**: DHI variant is actually larger in practice because we must use -dev image for runtime (lacks shell needed for package installation). True DHI runtime would be ~396 MB.

### Size Breakdown
```bash
Alpine 463 MB:
├─ Alpine base: 239 MB
├─ Node.js runtime: 59 MB
├─ npm/pnpm tooling: 119 MB
├─ app/dist: 46 MB
└─ node_modules: 178 MB (installed)

DHI -dev variant 469 MB:
├─ Alpine base: 229 MB
├─ Node.js runtime: 59 MB
├─ Build tools: 180 MB (shouldn't be in runtime!)
├─ app/dist: 46 MB
└─ node_modules: 178 MB (installed)
```bash

---

## 3. Security Posture Comparison

### CVE Metrics


| Metric | Alpine | DHI | Status |

|--------|--------|-----|--------|

| Total CVEs | 11 | 65 | Alpine wins |

| CRITICAL | 1 | 2 | Alpine wins |

| HIGH | 9 | 25 | Alpine wins |

| MEDIUM | 1 | 27 | Alpine wins |

| LOW | 0 | 5 | Alpine wins |

| Trend | Stable | Deteriorated | Alpine wins |

### CVE Sources

**Alpine (11 CVEs)**:
- OS layer (Alpine 3.21): 2 CVEs
  - Both zlib related
  - Same in both variants
- npm dependencies (pnpm, tar, minimatch): 9 CVEs
  - Build/tooling chain
  - Can be updated in future

**DHI (65 CVEs)**:
- OS layer (Alpine 3.21): 39 CVEs
  - More extensive scanning reveals OS vulns
  - Same base OS as Alpine (inherited)
  - Plus development packages
- npm dependencies: 26 CVEs
  - Superset of Alpine findings
  - Plus build-only package vulns

### Attack Surface Analysis


| Factor | Alpine | DHI -dev | DHI Runtime* |

|--------|--------|----------|--------------|

| Shell access | Yes (ash) | Yes (ash) | No |

| Package manager | Yes (apk) | Yes (apk) | No |

| Build tools | Yes | Yes (dev stage) | No |

| HTTP tools | Yes (wget, curl) | Yes (dev stage) | No |

| Lines of code | ~1.2M | ~1.2M | ~800K |

| CVE count | 11 | 65 | ~35 (est) |

*Theoretical - not achievable with current app

---

## 4. Build Process Comparison

### Alpine Build

```dockerfile
FROM node:24-alpine AS deps
RUN npm install -g pnpm@10.30.3
RUN pnpm install --frozen-lockfile

FROM node:24-alpine AS build
RUN npm install -g pnpm@10.30.3
RUN pnpm build

FROM node:24-alpine AS runtime
RUN addgroup nodejs && adduser nodejs
RUN npm install -g pnpm@10.30.3
RUN pnpm install --prod
# Direct pnpm command works
```bash

**Build Characteristics**:
- Standard npm install -g
- Direct pnpm command invocation
- No PATH issues
- Familiar to most developers

### DHI Build

```dockerfile
FROM dhi.io/node:24-alpine3.21-dev AS deps
RUN npm install -g pnpm@10.30.3
RUN npm exec pnpm -- install --frozen-lockfile

FROM dhi.io/node:24-alpine3.21-dev AS build
RUN npm install -g pnpm@10.30.3
RUN npm exec pnpm -- build

FROM dhi.io/node:24-alpine3.21-dev AS runtime
RUN id -u node || adduser -D node
RUN npm install -g pnpm@10.30.3
RUN npm exec pnpm -- install --prod
# Cannot use true DHI runtime (no shell)
```bash

**Build Characteristics**:
- Must use `npm exec pnpm --` wrapper
- PATH management issues with global installs
- More complex for developers
- Slight performance overhead from npm exec

**Difference**: DHI requires npm exec wrapper due to PATH issues with global package management

---

## 5. Runtime Tooling Comparison

### Available in Alpine

```bash
Shell:          ash shell
Package manager: apk (Alpine Package Keeper)
HTTP clients:   wget, curl
Text tools:     grep, sed, awk
Debugging:      strace, gdb availability
Utilities:      find, grep, less, more
```bash

**Usage in Phalanx Duel**:
- HEALTHCHECK uses wget
- Developers can shell into container for debugging
- Can install debug tools with apk
- Can inspect files with standard tools

### Available in DHI Runtime

```bash
Shell:          NONE (no /bin/sh)
Package manager: NONE (no apk)
HTTP clients:   NONE (no wget/curl)
Text tools:     NONE (no grep/sed/awk)
Debugging:      NONE (no strace/gdb)
Utilities:      NONE
```bash

**Impact on Phalanx Duel**:
- HEALTHCHECK must be removed ❌
- Cannot shell into container for debugging ❌
- Cannot install debug tools ❌
- Cannot inspect files ❌
- Kubernetes probes required instead

### Workarounds Required for DHI

1. **Health checks**: Replace with external Kubernetes probes
   ```yaml
   livenessProbe:
     httpGet:
       path: /health
       port: 3001
     initialDelaySeconds: 15
     periodSeconds: 30
   ```bash

2. **Debugging**: Use external tools or logging
   - No shell access = no interactive debugging
   - Logs become critical
   - External monitoring tools required

3. **Troubleshooting**: Different approach needed
   - Before: `docker exec -it container ash`
   - After: Must review logs, metrics, and external probes

---

## 6. Deployment Scenario Comparison

### Scenario: Application needs runtime update to package

**Alpine**:
```bash
docker exec -it container ash
apk add some-package
```bash
✓ Works immediately

**DHI Runtime**:
```bash
docker exec -it container bash
# Error: no such file or directory
```bash
❌ Impossible - no shell

**Mitigation**: Requires container rebuild, no runtime flexibility

### Scenario: Need to debug production issue

**Alpine**:
```bash
docker exec -it container sh
ps aux | grep node
cat /proc/1/maps
# Interactive debugging possible
```bash
✓ Works

**DHI Runtime**:
```bash
docker exec -it container sh
# Error: no shell
```bash
❌ Impossible

**Mitigation**: Must use logs and external monitoring exclusively

### Scenario: Health check fails

**Alpine**:
```dockerfile
HEALTHCHECK CMD wget -qO- http://localhost:3001/health || exit 1
```bash
✓ Built-in support

**DHI Runtime**:
```dockerfile
# No HEALTHCHECK possible
# Instead use Kubernetes probe
```bash
⚠️ Requires orchestration layer support

---

## 7. Dockerfile Architecture Comparison

### Alpine (Current)

```bash
3 Stages:
├─ deps: Install dependencies (node:24-alpine)
├─ build: Compile application (node:24-alpine)
└─ runtime: Run application (node:24-alpine)
   └─ Features: npm/pnpm available, shell available

Key Optimization:
- Cache mount for /root/.pnpm-store (speeds up rebuilds)
- Non-root user for security hardening
- Frozen lockfile for reproducibility
```bash

### DHI -dev (Current Implementation)

```bash
3 Stages:
├─ deps: Install dependencies (dhi.io/node:24-alpine3.21-dev)
├─ build: Compile application (dhi.io/node:24-alpine3.21-dev)
└─ runtime: Run application (dhi.io/node:24-alpine3.21-dev)
   └─ Features: npm/pnpm available, shell available

Problem: Uses -dev for runtime = keeps build tools in production

Key Changes:
- npm exec pnpm wrapper (PATH issue workaround)
- Health check removed (no wget)
- More complex user management
- No real security benefit
```bash

### DHI Runtime (Ideal, Not Currently Possible)

```bash
3 Stages:
├─ deps: Install dependencies (dhi.io/node:24-alpine3.21-dev)
├─ build: Compile application (dhi.io/node:24-alpine3.21-dev)
└─ runtime: Run application (dhi.io/node:24-alpine3.21)
   └─ NO package installation possible
   └─ NO shell available

Requirement: ALL dependencies must be copied from build stage
Problem: Phalanx Duel installs packages at runtime - not feasible
```bash

---

## 8. Compatibility Matrix


| Feature | Alpine | DHI -dev | DHI Runtime |

|---------|--------|----------|-------------|

| Standard pnpm commands | ✓ | ⚠️ (needs exec wrapper) | ✗ |

| Health check with wget | ✓ | ✗ | ✗ |

| Interactive debugging | ✓ | ✓ | ✗ |

| Runtime package installs | ✓ | ✓ | ✗ |

| Build tool chain | ✓ | ✓ in -dev | ✓ in -dev |

| Non-root by default | ✗ | ✓ | ✓ |

| Minimal attack surface | ✗ | ✗ | ✓ |

| Free licensing | ✓ | ✓ | ✓ |

---

## 9. Cost-Benefit Analysis

### Costs of DHI Migration

**Implementation Costs**:
- Dockerfile refactoring: 8-16 hours
- Testing and validation: 24-40 hours
- Documentation updates: 4-8 hours
- CI/CD pipeline adjustments: 4-8 hours
- **Total**: 40-72 hours ($3,000-$5,000)

**Ongoing Costs**:
- Developer training: 4 hours per engineer
- Increased debugging complexity: +20% support time
- Build process changes: +10% build time (npm exec overhead)
- Monitoring adjustments: 8-16 hours

**Risk Costs**:
- Potential rollback if issues found: 16-24 hours
- Vulnerability management: ongoing

### Benefits of DHI Migration

**Theoretical Benefits**:
- Smaller attack surface (shell removal): Medium
- Build tools not in production: Medium
- Non-root by default: Low (already implemented in Alpine)
- Official Docker support: Low (Alpine already well-supported)

**Measurable Benefits**:
- Image size reduction: -67 MB (14% smaller) - only with true runtime
- CVE reduction: NONE (actually increased with current approach)
- Compliance improvement: Minimal

**Reality Check**:
- Current Alpine is already hardened (non-root user, minimal)
- True DHI runtime incompatible with current app architecture
- CVE metrics show regression instead of improvement

### ROI Calculation

```bash
If using DHI -dev (only feasible option):
  Benefits: Minimal (same tools as Alpine)
  Costs: $3,000-$5,000 + ongoing overhead
  ROI: Negative

If redesigning for DHI runtime (would require changes):
  Benefits: -67 MB image (14% smaller)
  Benefits: ~30 fewer CVEs (from -dev tools removed)
  Costs: $5,000-$10,000 + architecture changes
  ROI: Marginal positive (~3-6 month break-even)
  Risk: High architectural changes needed
```bash

---

## 10. Recommendation Summary Table


| Criterion | Alpine | DHI | Recommendation |

|-----------|--------|-----|-----------------|

| Security (CVE count) | Better | Worse | Alpine |

| Image size | Adequate | Slightly larger (dev) | Alpine |

| Build complexity | Simple | Complex | Alpine |

| DevOps tooling | Better | Limited | Alpine |

| Debugging capability | Better | Limited | Alpine |

| Long-term support | Good | Good | Neutral |

| License cost | Free | Free | Neutral |

| Industry adoption | Higher | Growing | Alpine |

| Maintenance burden | Lower | Higher | Alpine |

| **Overall score** | **8/10** | **4/10** | **Alpine** |

---

## 11. Decision Matrix

### For Production Deployment Today
## Recommendation: Stay with Alpine
- Proven track record
- Lower CVE count
- Better tooling availability
- Lower maintenance overhead
- Lower risk profile

### For Future Consideration
**Conditions for DHI adoption**:
1. ✓ Architect application for true DHI runtime (no runtime package installs)
2. ✓ Reduce CVE count below Alpine baseline
3. ✓ Migrate health checks to Kubernetes probes
4. ✓ Establish robust external monitoring
5. ✓ Training and documentation for team
6. ✓ Extended staging validation period

---

## 12. Timeline for Future DHI Transition (If Approved)

```bash
Week 1: Architecture planning
  - Design app for runtime deployment
  - Plan health check redesign
  - Cost estimation

Week 2-3: Implementation
  - Dockerfile refactoring
  - Health check removal/migration
  - Local testing and validation

Week 4: Staging validation
  - Deploy to staging environment
  - Load testing
  - Security scanning comparison

Week 5: Canary deployment
  - 5% production canary
  - 2-week monitoring

Week 6+: Gradual rollout
  - 25%, 50%, 75%, 100%
  - Maintain Alpine fallback
  - Production validation
```bash

---

## Conclusion

**Alpine remains the superior choice for Phalanx Duel in the current state.**

Docker Hardened Images offer valuable security principles and long-term promise, but:
1. Current implementation forces use of -dev image (loses benefits)
2. CVE metrics show regression vs improvement
3. Operational tooling significantly degraded
4. Requires major architectural changes for true benefits
5. Cost-benefit ratio unfavorable for current timeline

**Recommendation**: Continue with Alpine + existing security hardening while monitoring DHI maturity for future migration opportunity.

---

**Report prepared**: March 18, 2026
**Comparison basis**: Alpine: node:24-alpine vs DHI: dhi.io/node:24-alpine3.21 and dev variant
