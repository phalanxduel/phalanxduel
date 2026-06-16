---
id: TASK-328.01
title: V2-GODOT-017 - Canonical reference playthrough artifact contract
status: Ready
assignee: []
created_date: '2026-06-16 01:18'
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
- [ ] #1 A canonical local reference command is documented for fast complete head-to-head proof using `qa:playthrough` with deterministic seed, LP, screenshot mode, and output directory.
- [ ] #2 The reference artifact contract documents required files (`manifest.json`, `events.ndjson`, `screenshots/`) and required manifest fields (`status`, `winnerName`, `victorySummaryText`, `lifepointsText`, `finalLifepoints`, `turnCount`, `actionCount`, `screenshots`).
- [ ] #3 At least one committed or reproducible reference artifact example is documented with instructions for finding and reading the latest run.
- [ ] #4 The contract explicitly states that this is the v1/browser reference oracle and not proof of Godot parity by itself.
- [ ] #5 Godot parity tasks can cite this task as the source of comparison expectations.
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
