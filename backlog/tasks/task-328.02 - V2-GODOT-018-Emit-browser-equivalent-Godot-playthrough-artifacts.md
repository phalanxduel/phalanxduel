---
id: TASK-328.02
title: V2-GODOT-018 - Emit browser-equivalent Godot playthrough artifacts
status: In Progress
assignee:
  - '@codex'
created_date: '2026-06-16 01:18'
updated_date: '2026-06-18 23:34'
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
modified_files:
  - .markdownlint-cli2.jsonc
  - bin/qa/godot-playthrough.ts
  - docs/adr/ADR-032-godot-v2-client-parity-and-verification.md
  - docs/reference/pnpm-scripts.md
  - docs/reference/qa-runners.md
  - godot/client/scenes/Battlefield.gd
  - godot/client/scenes/CardView.gd
  - godot/client/scenes/CardView.tscn
  - godot/client/scenes/GameOverScreen.gd
  - godot/client/scenes/HandView.gd
  - godot/client/scenes/LeaderboardScene.gd
  - godot/client/scenes/Lobby.gd
  - godot/client/scenes/Main.gd
  - godot/client/scenes/MatchRoot.gd
  - godot/client/scripts/ThemeManager.gd
  - knip.json
  - package.json
  - pnpm-lock.yaml
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
- [x] #1 `qa:godot:playthrough` or a dedicated Godot parity runner writes a per-run artifact directory containing `manifest.json`, `events.ndjson`, and `screenshots/`.
- [x] #2 The Godot manifest includes the browser-equivalent result fields defined by TASK-328.01, plus Godot-specific checkpoint history when available.
- [x] #3 The runner supports headless execution for local agents and returns non-zero on missing required artifacts or failed checkpoints.
- [ ] #4 Screenshots are captured for at least start/hydrated state, deployment, combat, and game-over when those states are available in the input replay/scenario.
- [x] #5 Docs explain how to run the Godot artifact path and how it differs from the browser/reference oracle.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend `bin/qa/godot-automation.ts` to create a browser-compatible artifact directory with `manifest.json`, `events.ndjson`, `screenshots/`, existing `input.json`, `result.json`, and `godot.log`.
2. Derive browser-equivalent result fields from the authoritative TypeScript engine replay of the deterministic scenario, not from GDScript rule logic.
3. Include Godot checkpoint history and artifact metadata in the manifest, then fail non-zero if the Godot run fails or required artifact files are missing.
4. Update QA docs to describe the Godot artifact path and its current limitation versus the browser/reference oracle.
5. Verify with `rtk pnpm qa:godot:automation`, `rtk pnpm lint:tools`, and `rtk pnpm lint:md`, update Backlog evidence, then commit.

2026-06-18 approved recovery plan after handoff validation:
1. Keep scope on TASK-328.02; defer Steamworks platform integration until Godot parity artifacts are healthy and avoid any account-creation or core service-internal changes.
2. Fix the Godot playthrough screenshot/finish path in `godot/client/scenes/MatchRoot.gd` so headless capture is bounded and the runner always writes `result.json` before quitting.
3. Keep `bin/qa/godot-playthrough.ts` responsible for clean process timeout/failure reporting and for failing when `--require-screenshots` is requested but screenshots are unavailable.
4. Remove temporary debug logging from the dirty Godot changes while preserving useful artifact errors in the result/manifest.
5. Re-run targeted verification: `rtk pnpm qa:playthrough:verify`, `rtk pnpm qa:godot:automation`, and `rtk pnpm qa:godot:playthrough -- --headless --require-screenshots`; update Backlog with evidence before finalizing.

2026-06-18 cleanup plan after user direction to move forward:
1. Keep the active path on Godot parity artifacts; do not start Steamworks, account creation, Steam auth tickets, or core service internals.
2. Wire the committed visual snapshot comparator into the repo QA surface/KNIP entrypoints so `@types/pngjs`, `pixelmatch`, and `pngjs` are no longer reported as stray devDependencies.
3. Clean obvious Godot dirty-code issues from the parity files: remove temporary prints, keep ThemeManager naming consistent, preserve automation IDs, and avoid UI/runtime changes that duplicate TypeScript gameplay rules.
4. Move Steam-ready backlog/proposal artifacts out of the active path or mark them deferred so Backlog no longer presents Steamworks as the next implementation task.
5. Re-run focused Godot/playability checks plus `rtk pnpm docs:check` and `rtk pnpm check`; update task evidence and remaining gaps.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Started implementation. First slice targets the headless Godot automation runner because it already has deterministic scenario input and checkpoint output. Real visual screenshots will be populated by later screen parity slices when replay states are available.

2026-06-18 Codex pickup from `/Users/mike/.gemini/tmp/game/handoff.md`: handoff says Godot parity is complete, but Backlog still has TASK-328/TASK-328.02 active and later parity gates in Backlog. Current branch is `experiment/gh-metadata-harvest` ahead of origin by 1 with additional uncommitted Godot parity/theme/screenshot changes. Validation run results: `rtk pnpm qa:playthrough:verify` passed 12/12 with 0 warnings/errors; `rtk pnpm qa:godot:automation` passed for `scenario-1000-heuristic-v-heuristic`, artifacts at `artifacts/godot-automation/godot-1781822927631/manifest.json`; `rtk pnpm qa:godot:playthrough -- --headless --require-screenshots` timed out after 300000ms, artifacts directory `artifacts/godot-playthrough/godot-playthrough-1781822932176/` contains an empty `screenshots/` directory and no result/manifest. Observed stdout reached connected, hydrated, replay_frame, animation_idle checkpoints and entered `_save_artifact_frame`, then hung without saving screenshots. Recommended next step: narrow TASK-328.02 to fixing the Godot playthrough screenshot capture/finish path before any Steamworks work.

2026-06-18 implementation update: fixed the Godot playthrough artifact finish path. `MatchRoot.gd` now prepares artifacts before runtime checkpoints, no longer resets artifact state at demo start, avoids `RenderingServer.frame_post_draw`/viewport texture reads under Godot's headless dummy renderer, writes a clear artifact error for headless screenshot attempts, and finishes artifact-mode game-over runs before the scene is replaced by `Main.gd`. Removed temporary debug prints from the touched launch/capture path. Docs now describe `bin/qa/godot-playthrough.ts` options and the `--headless --require-screenshots` clean-failure behavior.

Verification after fix:
- `rtk pnpm qa:godot:playthrough -- --headless --require-screenshots` exits in ~2s with code 1 and writes `artifacts/godot-playthrough/godot-playthrough-1781823888056/manifest.json`; failure message is `unable to capture screenshots with Godot headless dummy renderer; required screenshots were not emitted`.
- `rtk pnpm qa:godot:playthrough -- --headless` passes and writes `artifacts/godot-playthrough/godot-playthrough-1781823953277/manifest.json` with status `success`, browser-shaped summary fields, checkpoint history, `events.ndjson`, and `result.json`.
- `rtk pnpm qa:godot:automation` passes, latest artifact `artifacts/godot-automation/godot-1781823912797/manifest.json`.
- `rtk pnpm qa:playthrough:verify` passes 12/12 with 0 warnings/errors.
- `rtk pnpm lint:md` passes; `rtk pnpm lint:tools` passes.
- `rtk pnpm check` ran through lint, DB isolation, typecheck, coverage tests, schema/contracts/rules/property/perf/replay/playthrough gates successfully, then failed at `docs:check` because generated `docs/system/KNIP_REPORT.md` differs from HEAD by listing the already-dirty `@types/pngjs`, `pixelmatch`, and `pngjs` devDependencies from the current worktree. Running `rtk pnpm docs:check` reproduces the same artifact-drift failure. Acceptance criterion #4 remains open because screenshot capture requires a headed Godot run; headless now fails cleanly instead of hanging.

2026-06-18 cleanup evidence after user clarified Steamworks is not ready scope:

- Kept work scoped to Godot parity artifacts; no Steam account/auth-ticket/backend platform integration or core service internals were started.
- Deferred the Steam-ready backlog/proposal path out of active work: TASK-329.01 through TASK-329.05 were moved to Drafts as DRAFT-001 through DRAFT-005, stale m-15 milestone/proposal artifacts were removed from the working tree, and ADR-032 now states Godot is the parity target while Steam integration remains deferred pending human approval.
- Wired `qa:godot:compare-snapshots` into `package.json` and `knip.json` so `bin/qa/compare-snapshots.ts` owns the png snapshot dependencies and `docs:check` no longer drifts `docs/system/KNIP_REPORT.md`.
- Cleaned the obvious Godot dirty-code issues in the parity path: CardView is now a Control-based themed UI node, ThemeManager has stable singular/plural suit aliases, HandView no longer emits debug selection prints, and the artifact/capture path keeps clear manifest errors without temporary stdout noise.
- Added `backlog/drafts/**` to markdownlint ignores because Backlog MCP-generated draft files use Backlog's own setext heading format; Backlog files were not hand-edited.

Verification:
- `rtk pnpm qa:playthrough:verify` passed 12/12 with 0 warnings/errors.
- `rtk pnpm qa:godot:automation` passed.
- `rtk pnpm qa:godot:playthrough -- --headless` passed.
- `rtk pnpm qa:godot:playthrough -- --headless --require-screenshots` fails fast by design with a written failure manifest under the headless dummy renderer instead of hanging.
- `rtk pnpm docs:check` passed.
- `rtk pnpm lint:md` passed.
- `rtk pnpm check` passed end-to-end after formatting `bin/qa/godot-playthrough.ts` with Prettier.

Remaining gap: acceptance criterion #4 stays open because actual screenshot capture for start/hydrated, deployment, combat, and game-over still requires a headed Godot capture path or equivalent visual harness; headless dummy rendering now reports that limitation explicitly.
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
