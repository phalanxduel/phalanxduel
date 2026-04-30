---
id: TASK-249
title: Engine-blessed combat explanation surface
status: In Progress
assignee:
  - '@codex'
created_date: '2026-04-30 03:43'
updated_date: '2026-04-30 16:22'
labels:
  - engine
  - client
  - shared
  - ux
dependencies: []
priority: medium
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
- [ ] #1 All three subtasks merged in dependency order
- [ ] #2 Behavior unchanged — existing replay, engine, and client tests still pass without unrelated snapshot churn
- [ ] #3 `pnpm qa:playthrough:verify` passes (non-negotiable gameplay gate)
- [ ] #4 AGENTS.md no longer claims TASK-242 is the active task
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
2026-04-30 closeout plan: clean stale `AGENTS.md` current-priority text that still points agents at completed TASK-249.03, then run parent-level verification (`rtk pnpm qa:playthrough:verify` and `rtk pnpm check`). If both pass, check parent AC and move TASK-249 to Human Review with the verification evidence.
<!-- SECTION:PLAN:END -->
