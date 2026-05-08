---
id: TASK-249
title: Engine-blessed combat explanation surface
status: Done
assignee:
  - '@codex'
created_date: '2026-04-30 03:43'
updated_date: '2026-04-30 19:21'
labels:
  - engine
  - client
  - shared
  - ux
dependencies: []
priority: medium
ordinal: 116000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

Combat resolution already produces a rich `CombatLogEntry` with per-step damage, suit modifiers, and destruction flags, but UI code in `client/src/ux-derivations.ts` and `client/src/narration-producer.ts` re-implements the rules to render combat — counting destroyed cards, inferring shield triggers from `bonuses[]`, and re-simulating damage chains for action preview. Every rule change risks engine and UI drifting.

This initiative adds a deterministic, engine-derived combat explanation surface so the UI consumes engine-blessed data instead of re-deriving it. No gameplay or persistence changes; behavior is unchanged.

## Outcome

- Typed `CombatResolutionContext` with explanation, modifiers, outcome, and resolution cues, derivable purely from existing combat log data.
- Rolled-up `attack.resolved` event in the existing event stream.
- `ColumnPressureState` derivation for column-level UI cues.
- Pure `simulateAttack` helper that replaces the client-side speculative action preview by calling the real engine resolver against a cloned state.
- All UI inference functions for combat removed; UI consumes engine-blessed data only.

## Reference

Approved planning doc: `/Users/mike/.claude/plans/here-is-the-compressed-tender-storm.md` (local, not in repo). Key existing code: `engine/src/combat.ts:resolveAttack`, `engine/src/events.ts:deriveEventsFromEntry`, `shared/src/schema.ts:CombatLogEntry`, `client/src/ux-derivations.ts`, `client/src/narration-producer.ts`.

## Sequencing

Do not begin implementation until TASK-HIGH.01.03 and TASK-248 reach Human Review (WIP=1).

Also clean up the stale `TASK-242 is the active In Progress task` claim in `AGENTS.md` — it's actually `Done`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All three subtasks merged in dependency order
- [x] #2 Behavior unchanged — existing replay, engine, and client tests still pass without unrelated snapshot churn
- [x] #3 `pnpm qa:playthrough:verify` passes (non-negotiable gameplay gate)
- [x] #4 AGENTS.md no longer claims TASK-242 is the active task
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
2026-04-30 closeout plan: clean stale `AGENTS.md` current-priority text that still points agents at completed TASK-249.03, then run parent-level verification (`rtk pnpm qa:playthrough:verify` and `rtk pnpm check`). If both pass, check parent AC and move TASK-249 to Human Review with the verification evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-30 closeout: all three subtasks are Done in dependency order (`TASK-249.01`, `TASK-249.02`, `TASK-249.03`). The `TASK-249.02` audit gap is fixed by `engine/tests/replay.test.ts` coverage for byte-for-byte regenerated `attack.resolved` replay payloads. `AGENTS.md` current-priority text no longer pins agents to completed TASK-249.03/TASK-242-era stale instructions and now points agents back to Backlog as source of truth. Verification: `rtk pnpm qa:playthrough:verify` passed 12/12 with zero warnings/errors; `rtk pnpm check` passed full verification (lint, typecheck, tests, Go client checks, schema/docs/rules checks, replay verify, playthrough verify, markdown lint, formatting).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
TASK-249 is ready for Human Review. Subtasks landed in order: shared pure combat-resolution derivation (`TASK-249.01`), engine `attack.resolved` event plus `simulateAttack` preview (`TASK-249.02`), and client migration off duplicated combat inference (`TASK-249.03`). Audit fix added replay coverage proving `attack.resolved` payloads regenerate byte-for-byte across deterministic replays. `AGENTS.md` no longer points agents at the completed TASK-249.03 as active work and now directs them to Backlog for current priority.

Verification: `rtk pnpm qa:playthrough:verify` passed 12/12 with zero warnings/errors. `rtk pnpm check` passed full verification: lint, typecheck, all tests (shared 107, engine 210, admin 4, client 189, server 304), Go client checks, schema/docs/rules checks, replay verify, playthrough verify, markdown lint, and formatting.
<!-- SECTION:FINAL_SUMMARY:END -->
