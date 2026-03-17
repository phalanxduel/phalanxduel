---
id: TASK-56
title: "Implement Image Size Monitoring & Gates"
status: To Do
priority: MEDIUM
assignee: null
parent: TASK-50
labels:
  - performance
  - ci-cd
created: "2025-03-17"
updated: "2025-03-17"
---

# TASK-56: Implement Image Size Monitoring & Gates

## Description

Implement CI step to track Docker image size and fail builds if size exceeds threshold (350MB). This prevents image bloat and ensures deployments remain fast.

## Acceptance Criteria

- [ ] CI records image size after each build
- [ ] Size gate: Build fails if image > 350MB
- [ ] Size threshold configurable in CI
- [ ] Size logged to Actions output and artifacts
- [ ] Size trend tracked over time
- [ ] Layer-by-layer breakdown documented
- [ ] Performance impact <5s per build

## Implementation

### GitHub Actions Step

```yaml
- name: Check image size
  run: |
    IMAGE_SIZE=$(docker image inspect phalanxduel:latest --format='{{.Size}}')
    SIZE_MB=$((IMAGE_SIZE / 1024 / 1024))
    
    echo "📦 Image size: ${SIZE_MB}MB"
    echo "image_size_mb=${SIZE_MB}" >> $GITHUB_OUTPUT
    
    if [ $SIZE_MB -gt 350 ]; then
      echo "❌ Image exceeds 350MB limit (${SIZE_MB}MB)"
      exit 1
    fi
    
    echo "✅ Image size within limits"

- name: Save size metric
  run: |
    echo "$(date +%Y-%m-%d),${SIZE_MB}MB" >> size-history.csv

- name: Upload size history
  uses: actions/upload-artifact@v3
  with:
    name: size-metrics
    path: size-history.csv
```

## Verification

```bash
docker build -t phalanxduel:size-test .
SIZE_BYTES=$(docker image inspect phalanxduel:size-test --format='{{.Size}}')
SIZE_MB=$((SIZE_BYTES / 1024 / 1024))
echo "Size: ${SIZE_MB}MB"
```

## Risk Assessment

**Risk Level**: None — Monitoring only

## Related Tasks

- TASK-51: Dockerfile security (affects size)
- TASK-54: BuildKit cache (affects final size)

---

**Effort Estimate**: 1 hour  
**Priority**: MEDIUM (Performance tracking)  
**Complexity**: Low (shell script in CI)

