---
id: TASK-59
title: Optimize .dockerignore for Performance & Security
status: Done
assignee:
  - 'null'
created_date: ''
updated_date: '2026-03-18 02:47'
labels:
  - performance
  - security
dependencies: []
priority: medium
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enhance .dockerignore to exclude all unnecessary files, reducing build context and improving cache hit rates.
<!-- SECTION:DESCRIPTION:END -->

# TASK-59: Optimize .dockerignore for Performance & Security

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Exclude all dev/test files
- [x] #2 Exclude source files (not needed in runtime)
- [x] #3 Exclude unnecessary build artifacts
- [x] #4 Exclude secrets/env files
- [x] #5 Exclude large/unnecessary docs
- [x] #6 Build context <50MB
- [x] #7 No performance regression in build time

## Implementation

See TASK-51 .dockerignore example.

## Verification

```bash
docker build --progress=plain . 2>&1 | grep -i "context"
# Should show context <50MB
```

## Risk Assessment

**Risk Level**: None — Only excludes files outside runtime

## Related Tasks

- TASK-51: Dockerfile security
- TASK-54: BuildKit cache

---

**Effort Estimate**: 1 hour  
**Priority**: MEDIUM (Performance)  
**Complexity**: Low (file listing)
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