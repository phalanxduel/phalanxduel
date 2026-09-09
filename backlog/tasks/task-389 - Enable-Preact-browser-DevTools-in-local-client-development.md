---
id: TASK-389
title: Enable Preact browser DevTools on local and LAN hosts
status: In Progress
assignee:
  - Codex
created_date: '2026-09-08 15:28'
updated_date: '2026-09-08 15:30'
labels: []
dependencies: []
type: enhancement
ordinal: 266800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Browser integration debugging needs Preact component inspection and runtime diagnostics. The current client uses Preact without initializing its browser DevTools bridge.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Client initializes Preact debug integration before app rendering on localhost, *.localhost, lan.phalanxduel.com, and its subdomains in development and production builds.
- [ ] #2 Other hosts do not load or initialize Preact debug integration.
- [ ] #3 Development documentation explains browser extension setup and hostname behavior, with verification recorded.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
L1 context brief: client/index.html formerly loaded main.ts; main initializes telemetry before rendering. Add bootstrap.ts to await preact/debug before dynamically importing main, preserving initialization order without dependencies. Per user clarification, testing/demo mode is identified by hostname in all builds: localhost, `*.localhost`, lan.phalanxduel.com and `*.lan.phalanxduel.com`. Use domain-boundary checks; public hosts and raw IPs do not load debug. Debug ships as a lazy production chunk. Document browser extension setup and host behavior. Verify extension attach handshake before initial render, debug network loading and host exclusions in Chromium for development and production assets; run pnpm check and playability gate. Gameplay preflight passed 12/12. New bootstrap name denotes startup sequencing separate from main app initialization.
<!-- SECTION:PLAN:END -->
