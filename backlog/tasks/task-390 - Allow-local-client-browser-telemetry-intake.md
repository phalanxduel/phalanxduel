---
id: TASK-390
title: Allow local client browser telemetry intake
status: In Progress
assignee:
  - codex
created_date: '2026-09-08 21:36'
updated_date: '2026-09-08 21:39'
labels: []
dependencies: []
ordinal: 267800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Local Phalanx client RUM requests to OpenObserve lack an allowed-origin response, preventing browser reporting. Browser OTel must also reach the local collector feeding Jaeger.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Local client origins can submit RUM to OpenObserve and OTLP to the collector.
- [ ] #2 Unrelated web origins are not newly allowed.
- [ ] #3 Document the active configuration and verify CORS preflight and telemetry intake.
- [ ] #4 Local demo builds enable browser telemetry on localhost, `*.localhost`, `*.local`, and lan.phalanxduel.com / `*.lan.phalanxduel.com`, including optimized builds; public hosts stay disabled.
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
L1 bounded intake configuration change. Trace client/src/instrument.ts and client/vite.config.ts: RUM goes directly to o2.localhost; HTTPS OTLP uses same-origin /otel, feeding host collector and Jaeger. Live preflights omit ACAO for play.phalanxduel.localhost at both intakes; same-origin OTLP POST succeeds. Inspect host configuration and supported CORS controls; add explicit local client origins without broadening unrelated origins; validate preflight and synthetic intake; document active host paths and verification. Preserve existing uncommitted client/AGENTS/docs changes. Shared host changes require filesystem escalation.

User clarified wildcard local/demo host policy. Playability gate passed 12/12. Upgrade to L2: coordinated client runtime policy, nginx RUM intake (OpenObserve 0.90.3 only supports exact-origin env matching), and collector glob-origin rules. Use anchored nginx hostname allowlist and collector scheme/hostname globs. Use same-origin /rum and /otel for LAN devices; Vite and project nginx proxy to host intakes. Keep explicit opt-out; add hostname/endpoint tests, docs and pnpm check. Preserve pre-existing bootstrap/main changes.
<!-- SECTION:PLAN:END -->
