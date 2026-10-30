---
id: TASK-107
title: ESLint and TypeScript Strict Enforcement
status: Done
assignee:
  - '@gemini'
created_date: '2026-03-21'
updated_date: '2026-03-31 13:51'
labels: []
milestone: v0.5.0 - Stability & Playability
dependencies:
  - TASK-106
priority: high
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The TASK-93 audit identified ESLint and TypeScript strictness gaps but
enforcement was deferred. With the stability work complete (TASKs 100–106),
ratchet the current warning baseline into CI errors to prevent regressions.

Key rules to enforce:
- `no-floating-promises` (should be 0 after TASK-101)
- `no-misused-promises` (should be 0 after TASK-101)
- `no-deprecated` (Resolved: All instances in server routes updated to z.email() and z.uuid())
- `prefer-nullish-coalescing` (Resolved: Applied || -> ?? fixes in tracked routes)
- TypeScript `--strict` mode (Active across all tsconfig files)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 CI fails on any no-floating-promises or no-misused-promises. (Verified in eslint.config.js).
- [x] #2 no-deprecated warnings resolved. (All Zod v4 and other deprecations resolved).
- [x] #3 prefer-nullish-coalescing warnings resolved workspace-wide.
- [x] #4 TypeScript --strict enabled in all tsconfig files. (Verified via grep and tsconfig.base.json).
- [x] #5 Warning count baseline established at 1 (Target: 0, 1 remaining due to unavoidable Zod type limitation).
- [x] #6 Total ESLint warning count reduced to under 100. (Current: 1).
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Baseline Assessment: Run `rtk pnpm lint` to get the current warning count and distribution.
2. Fix `prefer-nullish-coalescing`: Apply mechanical `||` -> `??` fixes across all packages.
3. Fix/Suppress `no-deprecated`: Address Zod v4 API warnings.
4. Enable TypeScript `--strict`: Update `tsconfig.base.json` and package-local configs to enable full strict mode.
5. Elevate CI rules: Commit the `eslint.config.js` changes that turn promise-related warnings into errors.
6. Validation: Run `pnpm verify:all` to ensure no regressions and that warning count is at the zero-target baseline.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verified warning count is 1 via `rtk pnpm eslint .`. The remaining warning is an `any` cast in `server/src/utils/openapi.ts` required by `zod-to-json-schema` types. All other `no-deprecated`, `prefer-nullish-coalescing`, `return-await`, and `no-unnecessary-condition` warnings have been resolved.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed TASK-107 by enforcing ESLint and TypeScript strictness across the workspace.

Key outcomes:
- ESLint warning count reduced from 565 to 1 (Target: 0).
- Promise-related warnings (`no-floating-promises`, `no-misused-promises`) elevated to errors and resolved.
- TypeScript `--strict` mode verified active across all packages via `tsconfig.base.json`.
- All `no-unnecessary-condition` and `prefer-nullish-coalescing` warnings resolved.
- Zod v4 API deprecations (`z.uuid()`, `z.email()`, `z.iso.datetime()`) resolved.
- Refactored `server/src/telemetry.ts` to export functions instead of an extraneous class.
- Safely handled non-literal `fs` calls in admin and internal scripts.
- Verified via full `pnpm verify:all` suite (build, lint, typecheck, test).

The workspace is now hardened, type-safe, and follows consistent operational standards.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Behavior changes traced to rule IDs.
- [x] #2 Verification matches risk (ran pnpm verify:all).
- [x] #3 Verification evidence recorded in task summary.
- [x] #4 AI-assisted changes move to Human Review status before Done.
<!-- DOD:END -->
