---
id: TASK-387
title: Build Phalanx Duel PVL scenario catalog
status: In Progress
assignee:
  - '@codex'
created_date: '2026-09-05 17:22'
updated_date: '2026-09-05 17:23'
labels:
  - observability
  - panoramic-view
  - pvl
  - qa
  - zdots
dependencies: []
references:
  - >-
    https://o2.localhost/web/dashboards/view?org_identifier=default&dashboard=7501905489362419712&folder=default&tab=default&refresh=Off&period=15m&print=false
  - 'https://jaeger.localhost/search'
  - 'https://jaeger.localhost/dependencies'
  - 'https://jaeger.localhost/monitor'
documentation:
  - docs/observability/gameplay-panoramic-view.md
  - docs/observability/openobserve-phalanx-duel.md
  - docs/agents/profiles/pavel-agent.md
modified_files:
  - bin/qa/
  - docs/observability/
  - server/src/observability/
  - artifacts/
priority: high
type: feature
ordinal: 264800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
PVL currently produces individual local walkthrough artifacts and correlated telemetry, but there is no project-level view that lets an operator start at Phalanx Duel, browse named business and gameplay scenarios, inspect run history, and follow every finding back to the originating service, trace, log, query, datastore operation, or replay evidence. The demo needs a compact, honest inventory/evaluation/address surface that makes both the business journey and game journey legible without exposing secrets or claiming unobserved behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A Phalanx Duel project entry is discoverable in the local PVL operator surface.
- [ ] #2 The project lists a small initial scenario inventory covering signup, login, profile access, and the captured gameplay walkthroughs.
- [ ] #3 Each scenario exposes run history with status, timestamps, scenario runner identifier, match or session identifiers when applicable, and links to its rendered report and source artifacts.
- [ ] #4 Each scenario maps observed evidence across browser, edge, service, engine or business logic, persistence, telemetry, and diagnostics layers while preserving native identities and explicit unknowns.
- [ ] #5 Each scenario supports Inventory, Evaluate, and Address findings with severity, evidence references, affected layer, and disposition.
- [ ] #6 Where datastore evidence exists, the view reports safe CRUD rollups by affected table or keyspace and links to the originating SQL, Redis, or telemetry query without exposing secrets or raw sensitive data.
- [ ] #7 The catalog and report contract are documented, locally reproducible, covered by tests, and remain development-only.
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
1. Confirm the zdots context-engine registration contract through the phalanxduel coordination bus; preserve the fallback as a local development-only export if no supported API exists.
2. Define a versioned PVL catalog contract for one project, named scenarios, run history, layer/identity mappings, Inventory-Evaluate-Address findings, evidence references, and safe datastore CRUD rollups.
3. Reuse the existing playthrough manifest, Panoramic View renderer, O2 attachment, PVL JSONL, and Jaeger/O2 links rather than creating a second telemetry format.
4. Add a catalog generator/index that inventories committed scenario definitions plus ignored local run artifacts, explicitly distinguishing inventory from observed execution and unknown evidence.
5. Add the initial business scenario inventory (signup, login, profile access) and the existing gameplay walkthrough inventory; do not claim business flows were executed until evidence exists.
6. Extend the local cockpit/PVL operator surface with project -> scenario -> run navigation and links to reports, source artifacts, O2 queries, Jaeger traces, and datastore evidence.
7. Add focused contract/generator tests and documentation, then run targeted checks and the repository verification gate before committing and pushing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created from the requested PVL expansion: project-level catalog, business and gameplay scenario inventory, run history, identity mappings, evidence references, and Inventory/Evaluate/Address analysis. Awaiting Pavel's supported zdots registration contract before wiring the external index.
<!-- SECTION:NOTES:END -->
