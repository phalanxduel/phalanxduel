---
id: TASK-54
title: Configure Docker BuildKit Cache Mounts
status: Human Review
assignee:
  - '@gordon'
created_date: ''
updated_date: '2026-03-18 01:32'
labels:
  - performance
  - dockerfile
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enable BuildKit cache mounts for pnpm store to dramatically improve rebuild performance. Caches persist across builds, eliminating redundant dependency installations.
<!-- SECTION:DESCRIPTION:END -->

# TASK-54: Configure Docker BuildKit Cache Mounts

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Dockerfile stages 1 & 2 use `--mount=type=cache,target=/root/.pnpm-store`
- [ ] #2 pnpm cache persists across builds
- [ ] #3 Second build 40-60% faster than first (measured)
- [ ] #4 Works with `docker buildx build` (no impact on standard docker build)
- [ ] #5 CI pipeline uses BuildKit: `DOCKER_BUILDKIT=1` environment
- [ ] #6 GitHub Actions workflow enables buildx
- [ ] #7 .dockerignore excludes unnecessary files to improve cache hits
- [ ] #8 Build context size <50MB (measured)

## Implementation

### Update Dockerfile (Stages 1-2)

Replace:
```dockerfile
RUN pnpm install --frozen-lockfile
```

With:
```dockerfile
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile
```

Apply to both deps stage and build stage.

### Update .github/workflows/ci.yml

Add BuildKit support:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Build image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          load: true
          tags: phalanxduel:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Local Testing

```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1

# First build (full)
time docker build -t phalanxduel:v1 .
# Takes ~120–180s

# Second build (with cache)
time docker build -t phalanxduel:v2 .
# Should take ~30–60s (40-60% faster)

# Verify cache is being used
docker builder prune --verbose
```

## Verification

```bash
# Measure build times
for i in {1..3}; do
  time docker build -t phalanxduel:cache-test . 2>&1 | grep real
done

# Compare output:
# Build 1: ~150s (full)
# Build 2: ~50s (cached)
# Build 3: ~50s (cached)

# Check cache size
docker builder du

# Measure context size
docker build --progress=plain . 2>&1 | grep -i "context"
```

## Risk Assessment

**Risk Level**: None

- **BuildKit**: Backward compatible; doesn't affect standard docker build
- **Performance**: Only improves build time; no functional changes
- **CI/CD**: GitHub Actions buildx action is well-tested

## Dependencies

- Docker Buildx (included in Docker Desktop; available via Homebrew for Docker Engine)
- GitHub Actions docker/build-push-action@v5

## Related Tasks

- TASK-51: Dockerfile security (works together)
- TASK-55: Security scanning in CI (uses buildx)
- TASK-56: Image size gates (measures final output)

---

**Effort Estimate**: 1.5 hours  
**Priority**: MEDIUM (Performance optimization)  
**Complexity**: Low (configuration-based)
<!-- AC:END -->
