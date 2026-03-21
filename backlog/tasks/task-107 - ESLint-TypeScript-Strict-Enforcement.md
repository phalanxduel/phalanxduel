---
id: TASK-107
title: ESLint and TypeScript Strict Enforcement
status: To Do
assignee: []
created_date: '2026-03-21'
labels: []
milestone: v0.5.0 - Stability & Playability
dependencies:
  - TASK-106
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The TASK-93 audit identified ESLint and TypeScript strictness gaps but
enforcement was deferred. With the stability work complete (TASKs 100–106),
ratchet the current warning baseline into CI errors to prevent regressions.

Key rules to enforce:
- `no-floating-promises` (should be 0 after TASK-101)
- `no-misused-promises` (should be 0 after TASK-101)
- `no-deprecated` (40 warnings, mostly Zod v4 API — fix or suppress with plan)
- `prefer-nullish-coalescing` (39 warnings — mechanical fix)
- TypeScript `--strict` mode (currently only `--strictNullChecks`)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 CI fails on any `no-floating-promises` or `no-misused-promises`
      violation (zero-tolerance).
- [ ] #2 `no-deprecated` warnings resolved or tracked with suppression comments
      linking to upgrade plan.
- [ ] #3 `prefer-nullish-coalescing` warnings resolved (mechanical `||` → `??`).
- [ ] #4 TypeScript `--strict` enabled in all tsconfig files.
- [ ] #5 Warning count ratchet: CI records current warning count and fails if
      it increases.
- [ ] #6 Total ESLint warning count reduced from 565 to under 100.
<!-- AC:END -->

## Verification

```bash
# Zero critical warnings
pnpm lint 2>&1 | grep -E 'no-floating-promises|no-misused-promises'
# Should output nothing

# Warning count under threshold
pnpm lint 2>&1 | grep 'warnings' | head -1
# Should show < 100

# TypeScript strict
pnpm typecheck
# Should pass with 0 errors

# Full verification
pnpm verify:all
```
