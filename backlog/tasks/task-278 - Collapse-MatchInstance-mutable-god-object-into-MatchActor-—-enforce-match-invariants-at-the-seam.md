---
id: TASK-278
title: >-
  Collapse MatchInstance mutable god-object into MatchActor — enforce match
  invariants at the seam
status: Done
assignee:
  - '@codex'
created_date: '2026-05-04 03:23'
updated_date: '2026-05-05 18:01'
labels:
  - refactor
  - server
  - architecture
  - correctness
  - invariants
milestone: m-12
dependencies:
  - TASK-274
  - TASK-276
references:
  - server/src/match-types.ts
  - server/src/match-actor.ts
  - server/src/match.ts
priority: high
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`MatchInstance` (`server/src/match-types.ts`) is an 18+ field mutable struct mutated directly in 15+ places across `server/src/match.ts`. `MatchActor` already exists as an XState wrapper class but `MatchInstance` is a parallel raw data bag. Nothing enforces invariants — `botPlayerIndex = 2` is structurally allowed. There is no history of mutations. The interface is as wide as the implementation: callers must know which fields are consistent with which lifecycle phases.

Deletion test: if you deleted `MatchInstance` and replaced all call sites with `MatchActor` accessors, the complexity would concentrate in `MatchActor` — it would not vanish. That's the signal: `MatchActor` is earning its keep, `MatchInstance` is the friction.

## Solution

Make `MatchActor` the authoritative source of truth for all match state. Concretely:

1. Move all mutable match fields into `MatchActor` as private state with typed accessors
2. Replace direct field mutations in `match.ts` (`match.state = ...`, `match.lifecycleEvents = ...`, `match.botConfig = ...`) with `MatchActor` method calls (`actor.applyResult(result)`, `actor.configureBotOpponent(opts)`)
3. Emit `MatchInstance` as a read-only snapshot type (or remove it) — callers read projections via `projectForViewer` (TASK-276), not raw fields
4. `botPlayerIndex` becomes a validated setter: only `0 | 1` accepted, invariant enforced at assignment

## Scope

- `server/src/match-actor.ts` — add mutation methods, remove public getter explosion
- `server/src/match-types.ts` — demote `MatchInstance` to a read-only snapshot or remove
- `server/src/match.ts` — replace direct mutations with actor method calls
- `server/src/routes/` — verify callers read from actor or snapshot, not mutable fields

## Depends on

- TASK-274 — phase predicates used inside MatchActor lifecycle methods
- TASK-276 — ViewerProjection must be stable so match.ts can drop raw state reads in favour of projectForViewer
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 No direct field assignments to MatchInstance fields exist in match.ts (grep for `match\.(state|config|lifecycleEvents|fatalEvents|botConfig|botStrategy|botPlayerIndex)\s*=`)
- [ ] #2 botPlayerIndex can only be 0 or 1 — enforced by MatchActor, not a comment
- [ ] #3 MatchActor has typed mutation methods (applyResult, configureBotOpponent, addFatalEvent) replacing direct field writes
- [ ] #4 All server tests pass; pnpm check passes
- [ ] #5 New unit tests for MatchActor cover: invalid botPlayerIndex rejected, duplicate action detected, fatal event appended idempotently
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Starting implementation of MatchActor consolidation. Plan:
1. Add private fields for botConfig, botPlayerIndex, botStrategy to MatchActor.
2. Add mutation methods (applyResult, configureBotOpponent, addFatalEvent) to MatchActor.
3. Update MatchActor to own and validate these fields.
4. Refactor LocalMatchManager and match.ts to use these methods instead of direct field writes.
5. Clean up MatchInstance definition.
<!-- SECTION:NOTES:END -->
