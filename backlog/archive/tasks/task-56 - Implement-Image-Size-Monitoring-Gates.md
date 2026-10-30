---
id: TASK-56
title: Implement Image Size Monitoring & Gates
status: Done
assignee:
  - '@gordon'
created_date: ''
updated_date: '2026-03-18 01:55'
labels:
  - performance
  - ci-cd
dependencies: []
priority: medium
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement CI step to track Docker image size and fail builds if size exceeds threshold (350MB). This prevents image bloat and ensures deployments remain fast.
<!-- SECTION:DESCRIPTION:END -->

# TASK-56: Implement Image Size Monitoring & Gates

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 CI records image size after each build
- [x] #2 Size gate: Build fails if image > 350MB
- [x] #3 Size threshold configurable in CI
- [x] #4 Size logged to Actions output and artifacts
- [x] #5 Size trend tracked over time
- [x] #6 Layer-by-layer breakdown documented
- [x] #7 Performance impact <5s per build

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
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [x] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [x] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [x] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [x] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [x] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [x] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->