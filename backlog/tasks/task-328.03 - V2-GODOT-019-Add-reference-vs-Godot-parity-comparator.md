---
id: TASK-328.03
title: V2-GODOT-019 - Add reference-vs-Godot parity comparator
status: Icebox
assignee:
  - '@codex'
created_date: '2026-06-16 01:18'
updated_date: '2026-06-29 12:49'
labels: []
milestone: m-14
dependencies:
  - TASK-328.01
  - TASK-328.02
references:
  - bin/qa/simulate-headless.ts
  - bin/qa/godot-playthrough.ts
  - artifacts/playthrough-head2head/
  - artifacts/godot-automation/
documentation:
  - docs/reference/qa-runners.md
  - .agents/skills/phalanx-godot-ux-parity/references/parity-workflow.md
parent_task_id: TASK-328
priority: high
ordinal: 169300
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a local comparison gate that reads the browser/reference artifact and the Godot artifact, then reports structured parity status. This avoids every screen task inventing its own comparison logic and gives future agents a single way to prove Godot remains aligned with the v1 playthrough oracle.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A local command compares a browser/reference artifact directory with a Godot artifact directory and fails non-zero on required parity mismatches.
- [ ] #2 The comparator checks manifest fields including status, winner/score when available, turn/action counts within documented tolerance, screenshot inventory, and required Godot checkpoints.
- [ ] #3 The comparator writes a machine-readable parity report and a concise human-readable summary.
- [ ] #4 The comparator can be used by later tasks for partial slices where only a subset of screens is expected.
- [ ] #5 Docs explain how to run the comparator and how to interpret acceptable partial-slice gaps.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add `bin/qa/compare-parity-artifacts.ts` as a structural comparator for supplied `--reference-dir` and `--godot-dir` artifact directories without reviving the archived Godot client.
2. Compare browser/reference and Godot manifests for status, winner/result/LP fields, action and turn counts with explicit tolerances, screenshot inventory, and required Godot checkpoints.
3. Support partial-slice mode through flags so later screen tasks can require only the checkpoints/screenshots they have implemented while still failing non-zero for required mismatches.
4. Emit a machine-readable JSON report and concise Markdown/human summary under `artifacts/diffs/`.
5. Wire the command into `package.json` and `knip.json`, document it in QA runner docs, then verify with synthetic artifacts plus focused lint/doc checks before committing.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
