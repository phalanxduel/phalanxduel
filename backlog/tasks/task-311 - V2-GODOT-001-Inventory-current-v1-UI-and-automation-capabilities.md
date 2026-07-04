---
id: TASK-311
title: V2-GODOT-001 - Inventory current v1 UI and automation capabilities
status: Icebox
assignee:
  - '@codex'
created_date: '2026-06-14 05:24'
updated_date: '2026-07-03 19:00'
labels: []
milestone: m-14
dependencies: []
references:
  - client/src/
  - bin/qa/simulate-headless.ts
  - bin/qa/simulate-ui.ts
  - bin/qa/scenario.ts
  - shared/src/protocol.ts
  - server/src/
documentation:
  - docs/reference/qa-runners.md
  - docs/reference/playthrough-scenarios.md
  - docs/agents/skills/gameplay-automation.md
  - docs/testing.md
modified_files:
  - docs/v2/v1-ui-capability-inventory.md
  - docs/v2/v1-automation-contract.md
  - docs/v2/v1-websocket-contract.md
  - docs/v2/v1-replay-contract.md
priority: high
ordinal: 152000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Produced docs/v2/v1-ui-capability-inventory.md
- [x] #2 Produced docs/v2/v1-automation-contract.md
- [x] #3 Produced docs/v2/v1-websocket-contract.md
- [x] #4 Produced docs/v2/v1-replay-contract.md
- [x] #5 Every DOM-bound feature is identified and mapped to a portable state feature
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory the browser/reference UX surfaces by tracing the playable flow from app entry through lobby, deployment, combat, spectator/replay, and game-over, using existing selectors and playthrough artifacts as the source of truth.
2. Inventory automation entrypoints and artifact fields from `bin/qa/simulate-headless.ts`, `bin/qa/simulate-ui.ts`, scenario tooling, and existing QA docs.
3. Inventory WebSocket/protocol state consumed by clients from shared protocol definitions and server/client WebSocket handlers, focusing on portable state versus DOM-bound behavior.
4. Inventory replay/recording surfaces and the fields needed for visual confirmation, deterministic comparison, and Godot playback.
5. Produce `docs/v2/v1-ui-capability-inventory.md`, `docs/v2/v1-automation-contract.md`, `docs/v2/v1-websocket-contract.md`, and `docs/v2/v1-replay-contract.md` with explicit DOM-bound-to-portable-state mappings.
6. Run doc/format checks relevant to the new markdown, update `TASK-311` acceptance criteria with completed evidence, then commit the inventory slice before moving to `TASK-328.01`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Execution started from the Godot parity plan. Scope is documentation and contract inventory only; implementation of Godot artifact emission begins in TASK-328.02 after TASK-328.01 defines the canonical artifact contract.

Produced the v1 capability and contract inventory needed for Godot parity execution. The docs replace prior low-signal stubs with a browser UX inventory, automation artifact contract, WebSocket/projection contract, and replay contract. Verification: `rtk pnpm lint:md` passed with 0 markdown errors.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
