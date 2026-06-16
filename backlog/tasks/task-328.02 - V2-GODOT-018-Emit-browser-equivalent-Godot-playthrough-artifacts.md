---
id: TASK-328.02
title: V2-GODOT-018 - Emit browser-equivalent Godot playthrough artifacts
status: In Progress
assignee:
  - '@codex'
created_date: '2026-06-16 01:18'
updated_date: '2026-06-16 11:10'
labels: []
milestone: m-14
dependencies:
  - TASK-327
  - TASK-328.01
references:
  - bin/qa/godot-playthrough.ts
  - bin/qa/godot-automation.ts
  - godot/client/scripts/AutomationHarness.gd
  - godot/client/scripts/GameViewStore.gd
documentation:
  - docs/reference/qa-runners.md
  - docs/reference/pnpm-scripts.md
  - .agents/skills/phalanx-godot-ux-parity/SKILL.md
  - .agents/skills/phalanx-godot-ux-parity/references/parity-workflow.md
parent_task_id: TASK-328
priority: high
ordinal: 169200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the Godot playthrough/automation runners so a Godot run writes artifacts with the same shape as the browser/reference playthrough. This is the Godot-side shared dependency for all parity slices: every screen can be verified by comparing Godot manifest fields, events, checkpoints, and screenshots against the reference artifact contract.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `qa:godot:playthrough` or a dedicated Godot parity runner writes a per-run artifact directory containing `manifest.json`, `events.ndjson`, and `screenshots/`.
- [ ] #2 The Godot manifest includes the browser-equivalent result fields defined by TASK-328.01, plus Godot-specific checkpoint history when available.
- [ ] #3 The runner supports headless execution for local agents and returns non-zero on missing required artifacts or failed checkpoints.
- [ ] #4 Screenshots are captured for at least start/hydrated state, deployment, combat, and game-over when those states are available in the input replay/scenario.
- [ ] #5 Docs explain how to run the Godot artifact path and how it differs from the browser/reference oracle.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend `bin/qa/godot-automation.ts` to create a browser-compatible artifact directory with `manifest.json`, `events.ndjson`, `screenshots/`, existing `input.json`, `result.json`, and `godot.log`.
2. Derive browser-equivalent result fields from the authoritative TypeScript engine replay of the deterministic scenario, not from GDScript rule logic.
3. Include Godot checkpoint history and artifact metadata in the manifest, then fail non-zero if the Godot run fails or required artifact files are missing.
4. Update QA docs to describe the Godot artifact path and its current limitation versus the browser/reference oracle.
5. Verify with `rtk pnpm qa:godot:automation`, `rtk pnpm lint:tools`, and `rtk pnpm lint:md`, update Backlog evidence, then commit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Started implementation. First slice targets the headless Godot automation runner because it already has deterministic scenario input and checkpoint output. Real visual screenshots will be populated by later screen parity slices when replay states are available.
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
