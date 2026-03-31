# Docker Hardened Images (DHI) Evaluation Research

## 1. DHI Availability and Licensing Research

### Official Sources
- **Registry Location**: dhi.io (Docker's official DHI registry)
- **Documentation**: https://docs.docker.com/manuals/dhi/
- **Licensing**: DHI images are freely available and open source under Docker's standard licensing model

### DHI Image Coverage for Node.js
Based on Docker's official documentation, DHI provides hardened variants for:
- node: Available with tags like `node:24-alpine3.21-dev` and `node:24-alpine3.21`
- Python, Go, Java, Ruby, and other common runtimes

### Key Characteristics of DHI
1. **Security Focus**: Minimal attack surface with no shell, no package managers in runtime images
2. **Non-root User**: Runtime images default to running as non-root user
3. **Image Size**: Generally smaller than standard Docker Official Images
4. **Variant Tags**:
   - `-dev` suffix: Includes build tools, package managers (for build stages)
   - No suffix: Minimal runtime image (no package managers, no shell)

### Licensing Model
- **Cost**: Free and open source
- **Availability**: Public registry (dhi.io), no authentication required for public images
- **Support**: Community and Docker Professional support available
- **License Type**: Docker Open Source License (similar to other Docker images)

### CVE Coverage
DHI images are:
- Scanned regularly for vulnerabilities
- Built from minimal base layers
- Kept up-to-date with security patches
- Designed specifically to reduce CVE surface area

---

## 2. DHI vs Alpine Comparison Framework

### Expected Advantages of DHI
1. **Smaller attack surface** (no shell, no package managers in runtime)
2. **Reduced CVE count** (fewer packages = fewer potential vulnerabilities)
3. **Better compliance** (no unnecessary binaries/tools)
4. **Optimized for containers** (designed from ground up for containerization)

### Expected Challenges
1. **Different entry points** (may require CMD adjustments)
2. **No shell access** (testing/debugging requires different approaches)
3. **Learning curve** (different conventions from Alpine)

---

## 3. Current Phalanx Duel Setup Analysis

### Base Image: node:24-alpine
- **Current Approach**: Alpine-based, lightweight
- **Size**: ~150-200 MB for base image
- **Known Issues with Alpine**:
  - Uses musl libc instead of glibc (compatibility issues possible)
  - Still includes package manager (apk)
  - Includes shell (ash)

### Build Stages in Use
1. **deps**: Installs dependencies
2. **build**: Compiles and builds all packages
3. **runtime**: Final production image with non-root user

### Security Posture
- Already implements non-root user (best practice)
- Uses pnpm with frozen lockfile (reproducible builds)
- Includes health checks
- Uses BuildKit cache mounts for performance

---

## 4. Migration Path for Phalanx Duel

### Stage 1: Development/Testing (DHI Variant)
- Create `Dockerfile.dhi` alongside current Dockerfile
- Use `dhi.io/node:24-alpine3.21-dev` for build stages
- Use `dhi.io/node:24-alpine3.21` for runtime
- Preserve all build optimizations

### Stage 2: Comparison Testing
- Build both Alpine and DHI variants
- Scan both with trivy/syft for CVE comparison
- Measure image sizes
- Test startup performance

### Stage 3: Evaluation
- Document findings in detail
- Create risk/benefit analysis
- Provide implementation recommendations

---

## 5. Known DHI Considerations

### No Shell in Runtime Images
- Current Dockerfile doesn't rely on shell in runtime stage ✓
- HEALTHCHECK uses wget which may not be available
- Mitigation: Use curl or liveness probe instead

### Non-root User Already Present
- Current Dockerfile already creates nodejs user ✓
- DHI uses specific username (typically based on image purpose)
- Phalanx Duel needs to handle user compatibility

### Package Manager Changes
- Runtime stage: No apk available in DHI
- Build stages use `-dev` images with npm/pnpm available ✓
- Current approach of copying node_modules should work

---

## Next Steps
1. Create Dockerfile.dhi variant
2. Build both images
3. Run security scans on both
4. Compare metrics
5. Generate recommendation report
