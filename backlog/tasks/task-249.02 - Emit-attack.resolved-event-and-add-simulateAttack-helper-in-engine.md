---
id: TASK-249.02
title: Emit attack.resolved event and add simulateAttack helper in engine/
status: In Progress
assignee: []
created_date: '2026-04-30 03:45'
updated_date: '2026-04-30 04:03'
labels:
  - engine
  - events
  - tests
dependencies:
  - TASK-249.01
parent_task_id: TASK-249
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

Wire the engine to emit a single rolled-up `attack.resolved` event per attack and expose a deterministic `simulateAttack` helper for pre-action preview. The shared derivation helpers from the previous subtask are the source of truth; this task is integration only.

## Scope

1. **Telemetry name**: add `TelemetryName.EVENT_ATTACK_RESOLVED = 'game.combat.attack.resolved'` in `shared/src/telemetry.ts`.
2. **Event emission**: in `engine/src/events.ts:deriveEventsFromEntry`, after the `attack` case's per-step `combat.step` loop, emit one `functional_update` event named `EVENT_ATTACK_RESOLVED`. Payload is the result of `deriveCombatResolution(details.combat, { mode, reinforcementTriggered, victoryTriggered })`. Mode must be derivable from the entry; if not, thread it through. Event ID follows the existing `seq:ev` scheme.
3. **Preview helper**: add `engine/src/combat-preview.ts` exporting `simulateAttack(state, action)` that clones the state, calls the existing `resolveAttack` (no rule duplication), and runs the resulting `combatEntry` through `deriveCombatResolution`. Returns `{ verdict, resolution }`.
4. **Re-exports**: add `simulateAttack` and re-export the shared types/helpers via `engine/src/index.ts`.
5. **Redaction**: confirm `server/src/utils/redaction.ts:filterEventLogForPublic` handles the new event name correctly. The payload should only reference cards already revealed by combat — verify with a redaction test.

## Reuse / do not duplicate

- `resolveAttack` in `engine/src/combat.ts` is the only place combat math may live. `simulateAttack` calls it on a clone.
- `deriveCombatResolution` from the previous subtask is the only place explanation logic may live.

## Determinism

The new event slots into the existing per-turn hash via `eventIds`. Hashes for *new* matches will be stable; historical matches keep their old hashes because their stored event arrays don't include the new event. Document in PR description.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `TelemetryName.EVENT_ATTACK_RESOLVED` constant added
- [ ] #2 `deriveEventsFromEntry` emits exactly one `attack.resolved` event per attack entry, after all `combat.step` events
- [ ] #3 `engine/src/combat-preview.ts:simulateAttack` exists, calls `resolveAttack` against a cloned state, and returns `{ verdict, resolution }` with no rule logic duplicated
- [ ] #4 `engine/tests/events.test.ts` asserts presence, ordering, payload shape, and determinism of `attack.resolved` across two derivations of the same entry
- [ ] #5 `engine/tests/combat-preview.test.ts` asserts ≥5 sampled scenarios where `simulateAttack(state, action).resolution` equals the `attack.resolved` payload after `applyAction(state, action)`
- [ ] #6 `engine/tests/replay.test.ts` updated to assert replay regenerates `attack.resolved` payloads byte-for-byte
- [ ] #7 Server-side redaction test added covering the new event name
- [ ] #8 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm check` all pass
- [ ] #9 No changes to `engine/src/combat.ts:resolveAttack` signature or behavior
- [ ] #10 No DB schema or persistence changes
<!-- AC:END -->
