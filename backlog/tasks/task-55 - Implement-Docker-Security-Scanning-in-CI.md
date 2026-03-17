---
id: TASK-55
title: "Implement Docker Security Scanning in CI"
status: To Do
priority: CRITICAL
assignee: null
parent: TASK-50
labels:
  - security
  - ci-cd
created: "2025-03-17"
updated: "2025-03-17"
---

# TASK-55: Implement Docker Security Scanning in CI

## Description

Integrate Trivy security scanning into GitHub Actions CI pipeline to automatically detect CVEs in Docker image. Scan detects vulnerabilities in runtime dependencies, base image, and OS packages. Fails build on CRITICAL/HIGH severity findings.

## Acceptance Criteria

- [ ] CI workflow builds image and runs Trivy scan
- [ ] Scan detects all CVE types: OS packages, dependencies, app code
- [ ] CVEs categorized by severity (CRITICAL, HIGH, MEDIUM, LOW)
- [ ] Build fails on CRITICAL or HIGH CVEs (configurable threshold)
- [ ] Scan results published as GitHub Actions artifact
- [ ] SBOM (Software Bill of Materials) generated and stored
- [ ] Scan results accessible in Actions logs + artifacts
- [ ] Cosign signature preparation documented (for future)
- [ ] No false positives; findings actionable

## Implementation

### Create .github/workflows/docker-security.yml

```yaml
name: Docker Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v6
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Build Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          load: true
          tags: phalanxduel:scan
          cache-from: type=gha
      
      - name: Run Trivy vulnerability scan
        uses: aquasec/trivy-action@master
        with:
          image-ref: phalanxduel:scan
          format: sarif
          output: trivy-results.sarif
          severity: CRITICAL,HIGH
      
      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: trivy-results.sarif
      
      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          image: phalanxduel:scan
          format: json
          output-file: sbom.json
      
      - name: Upload SBOM artifact
        uses: actions/upload-artifact@v3
        with:
          name: sbom
          path: sbom.json
      
      - name: Check for CRITICAL/HIGH vulnerabilities
        run: |
          CRITICAL=$(grep -c '"Severity": "CRITICAL"' trivy-results.sarif || true)
          HIGH=$(grep -c '"Severity": "HIGH"' trivy-results.sarif || true)
          
          if [ $CRITICAL -gt 0 ] || [ $HIGH -gt 0 ]; then
            echo "❌ Found $CRITICAL CRITICAL and $HIGH HIGH severity vulnerabilities"
            exit 1
          fi
          
          echo "✅ No CRITICAL/HIGH vulnerabilities found"
```

### Local Testing

```bash
docker build -t phalanxduel:test .

docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image phalanxduel:test
```

## Verification

```bash
# Run locally
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image phalanxduel:latest --severity HIGH,CRITICAL

# Should output vulnerability report
# Exit code 0 if no CRITICAL/HIGH found
# Exit code 1 if vulnerabilities present
```

## Risk Assessment

**Risk Level**: None

- **CI/CD**: Scanning is non-invasive; informational only
- **False Positives**: May need to suppress known acceptable vulns
- **Performance**: Scan takes ~30–60s; acceptable for security gate

## Dependencies

- Docker image successfully built
- Trivy scanner (Docker-based; no installation needed)
- GitHub Actions SARIF support

## Related Tasks

- TASK-51: Dockerfile security (provides image to scan)
- TASK-56: Image size gates (similar CI integration)
- TASK-63: Dependency security validation (complementary scanning)

---

**Effort Estimate**: 2.5 hours  
**Priority**: CRITICAL (Security validation)  
**Complexity**: Medium (GitHub Actions + Trivy configuration)

