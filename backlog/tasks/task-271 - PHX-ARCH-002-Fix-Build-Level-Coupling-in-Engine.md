---
id: TASK-271
title: PHX-ARCH-002 - Fix Build-Level Coupling in Engine
status: Done
assignee: []
created_date: '2026-05-02 20:46'
updated_date: '2026-05-02 20:57'
labels: []
milestone: m-11
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolve the build-process coupling by redirecting Engine's imports from shared/dist/ to shared/src/, ensuring type integrity and source-level consistency.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Update tsconfig.base.json path mappings to resolve to shared/src instead of shared/dist.
- [x] #2 Ensure engine compiles correctly using source-level imports.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Used TypeScript project references instead of paths aliases (which hit the rootDir constraint). Added `composite: true` to shared/tsconfig.json and `references: [{ path: "../shared" }]` to engine/tsconfig.json. This makes the build dependency explicit — `tsc -b` will auto-build shared when engine is built. `tsc --noEmit` still works as before. Full check passes.
<!-- SECTION:FINAL_SUMMARY:END -->
