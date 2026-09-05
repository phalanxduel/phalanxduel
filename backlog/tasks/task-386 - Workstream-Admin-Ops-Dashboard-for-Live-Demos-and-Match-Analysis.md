---
id: TASK-386
title: 'Workstream: Admin Ops Dashboard for Live Demos and Match Analysis'
status: To Do
assignee: []
created_date: '2026-09-04 14:24'
labels:
  - admin
  - ops
  - docs
dependencies: []
priority: medium
type: feature
ordinal: 260800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Turn the existing admin app into an operator surface Mike can use with zero anxiety during a live demo and for ongoing testing/experimentation: jump straight to any match from an ID or a shared link, watch a match live while it's in progress, run canned insight queries, and have a documented, accurate map of the system (diagrams, sequences, command library) to work from.

Survey done before filing (2026-09-04): the admin app already covers more than expected — `admin/src/client/pages/Dashboard.tsx` (active/recent match lists, polling), `MatchDetail.tsx` (transaction log, event log, integrity badges), `UserDetail.tsx`, and `Reports.tsx` + `SqlBlock.tsx` (parameterized canned reports across matches/players/integrity/database categories, with a visible SQL preview and CSV export — this already substantially covers "query for insights", not a gap). The wiki (`phalanxduel/wiki`) already has `Match-Lifecycle-Diagram.md`, `Architecture-and-Protocol-Overview.md`, `Observability-and-Debugging.md`, `API-Surface-Diagram.md`, `Container-Architecture-Diagram.md`, `Diagram-Index.md` — currency against the current codebase is unverified.

Confirmed gaps this workstream closes:
1. No way to paste a match ID or a player/spectator link and land on that match's admin context.
2. Unconfirmed whether MatchDetail reflects a match live while it's still in progress, or only renders a completed/historical transaction log.
3. Wiki diagrams' accuracy against current code is unaudited (recent unrelated audits this session found stale docs more often than not, e.g. the printed quickstart's facing diagram and the phalanxduel.com rules page both had real bugs).
4. No single operator-facing command/query library pulling together what already exists and is scattered: `scripts/dev-dashboard.ts` (pnpm dev:status/dev:verify), `bin/services`, `bin/phx-demo-ctl`, `Reports.tsx` canned reports, and the o2/OpenObserve MCP tools.

Full spec: backlog/docs (see linked specification document) for structure, sequencing rationale, and the first slice.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An operator can paste a bare match ID or any player/spectator link into the admin dashboard and land directly on that match's detail view, with links out to both players' history
- [ ] #2 MatchDetail's live-vs-historical behavior for an in-progress match is confirmed and, if missing, live gameplay is visible without a manual refresh
- [ ] #3 The wiki's architecture and gameplay diagrams are verified current against the codebase or corrected
- [ ] #4 A single documented command/query library covers health checks, log/trace access, and canned insight reports, discoverable from one place
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
