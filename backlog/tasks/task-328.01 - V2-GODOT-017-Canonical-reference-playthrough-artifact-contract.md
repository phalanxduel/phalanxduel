---
id: TASK-328.01
title: V2-GODOT-017 - Canonical reference playthrough artifact contract
status: Icebox
assignee:
  - '@codex'
created_date: '2026-06-16 01:18'
updated_date: '2026-07-03 19:00'
labels: []
milestone: m-14
dependencies:
  - TASK-311
references:
  - bin/qa/simulate-headless.ts
  - artifacts/playthrough-head2head/
documentation:
  - docs/reference/qa-runners.md
  - docs/reference/playthrough-scenarios.md
  - .agents/skills/phalanx-end-to-end-playthrough/SKILL.md
  - >-
    .agents/skills/phalanx-end-to-end-playthrough/references/local-playthrough-runbook.md
modified_files:
  - docs/v2/reference-playthrough-artifact-contract.md
  - docs/v2/v1-automation-contract.md
parent_task_id: TASK-328
priority: high
ordinal: 169100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Freeze the browser/reference playthrough artifact as the shared parity oracle for all Godot UX work. This task turns the v1 playthrough output into a documented contract that future Godot tasks can consume without rediscovering the browser harness. This is the highest-value shared dependency because every Godot screen and scenario can compare against the same manifest, event log, and screenshot shape.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A canonical local reference command is documented for fast complete head-to-head proof using `qa:playthrough` with deterministic seed, LP, screenshot mode, and output directory.
- [x] #2 The reference artifact contract documents required files (`manifest.json`, `events.ndjson`, `screenshots/`) and required manifest fields (`status`, `winnerName`, `victorySummaryText`, `lifepointsText`, `finalLifepoints`, `turnCount`, `actionCount`, `screenshots`).
- [x] #3 At least one committed or reproducible reference artifact example is documented with instructions for finding and reading the latest run.
- [x] #4 The contract explicitly states that this is the v1/browser reference oracle and not proof of Godot parity by itself.
- [x] #5 Godot parity tasks can cite this task as the source of comparison expectations.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create a canonical artifact-contract document under `docs/v2/` that names the deterministic browser/reference command, required files, required manifest fields, screenshot naming, event stream expectations, and latest-artifact discovery command.
2. Tie the contract explicitly to the v1/browser oracle and state that passing it is not Godot parity by itself.
3. Cross-reference the new contract from the existing v1 automation contract so future Godot tasks can cite one comparison source.
4. Validate markdown with `rtk pnpm lint:md`, update TASK-328.01 acceptance criteria and notes, then commit the artifact-contract slice before moving to TASK-328.02.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Started implementation. Scope is documentation only: freeze the browser/reference playthrough artifact shape that Godot emitters and comparators must match.

Created `docs/v2/reference-playthrough-artifact-contract.md` as the canonical browser/reference artifact contract for Godot parity work and linked it from `docs/v2/v1-automation-contract.md`. Verification: `rtk pnpm lint:md` passed with 0 markdown errors.
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
