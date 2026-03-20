---
id: TASK-91
title: 'Remediation: Runtime Surface Reduction'
status: Done
assignee: []
created_date: '2026-03-20 15:25'
updated_date: '2026-03-20 18:31'
labels:
  - security
  - hardening
milestone: m-0
dependencies: []
priority: low
ordinal: 63000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Minimize the production attack surface by removing build-time tools (pnpm) from the final runtime image.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dockerfile runtime stage uses a pre-installed node_modules directory instead of installing via pnpm.
- [x] #2 The 'pnpm' binary is absent from the final production image.
- [x] #3 Verified image size reduction and container functionality.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Refactored `Dockerfile` into a 5-stage secure build:
  1. `otel-collector-base`: Sourcing the OTel binary.
  2. `deps`: Installing full build-time dependencies.
  3. `build`: Compiling all workspace packages.
  4. `prod-deps`: Installing ONLY production dependencies using `pnpm install --prod`.
  5. `runtime`: Final minimal Alpine image.
- Removed `pnpm` from the `runtime` stage. Production `node_modules` are now copied from the `prod-deps` stage.
- Verified that the server starts correctly and `pnpm` is not available in the final image.
- Optimized image by copying only the required `dist` and `node_modules` for each workspace package.
<!-- SECTION:NOTES:END -->

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
