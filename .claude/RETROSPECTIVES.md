# Phalanx — Retrospective Summary

This is a compressed sprint-level retrospective (covering work from 2026-02-10
to 2026-02-16). It captures recurring learnings and explicit team agreements so
new sessions can load context quickly.

## Sprint Learnings

### 1) Schema-first sequencing is consistently reliable

- Most successful changes followed: schema -> generated artifacts -> engine ->
  tests -> server -> client -> docs.
- `pnpm schema:gen` remained stable across major changes (reinforcement,
  overflow/LP, forfeit/outcome, Heroical removal).
- Refactors stayed low-risk when changes were made in dependency order instead
  of cross-cutting edits.

### 2) Full-suite verification is required for rule changes

- Engine-only verification missed integration effects (victory-condition and
  reinforcement changes broke server flow tests).
- Running the entire test suite caught cross-package regressions early.
- Simulation/stress tests were high-value for validating state invariants.

### 3) Generated files are part of the source of truth

- `schema:check` failures repeatedly came from unstaged generated JSON/schema
  artifacts, not logic defects.
- Workflow must treat generated artifacts as mandatory outputs of schema edits.

### 4) Documentation drift is a recurring operational risk

- Multiple docs diverged from implementation (protocol, rules semantics,
  HOWTOPLAY details, deferred features mixed into v1 rules).
- Source-first doc rewrites improved accuracy and exposed hidden issues.
- Deferred mechanics (Joker, face-down, direct Spade damage, etc.) need clear
  separation from active rules to reduce confusion.

### 5) Security and protocol correctness need explicit gates

- Server broadcast behavior exposed sensitive state (opponent card visibility).
- Reconnect logic existed but did not restore authenticated match state.
- These issues were discoverable in code review but not consistently covered by
  tests/checklists.

### 6) Test design quality improved outcomes

- Batch authoring targeted tests (especially TDD for reinforcement) produced
  clearer implementation boundaries and faster iteration.
- Pure helper functions made behavioral changes easier to validate in isolation.
- Some misses were due to incomplete assertion scope (e.g., outcome metadata),
  not missing test execution.

### 7) Work decomposition improved throughput

- Explicit phased plans and task tracking reduced backtracking.
- Separating “execution plan” docs from “open work” docs improved triage and
  reduced duplicate maintenance.

## Team Agreements

These agreements are now the default execution standard:

1. Follow schema-first dependency order for game/protocol changes.
2. Run full repo verification for gameplay/state-machine changes:
   typecheck + lint + build + all tests (not engine-only).
3. When schema changes, always regenerate and stage generated artifacts in the
   same change set.
4. Keep docs implementation-anchored:
   RULES/HOWTOPLAY/PROTOCOL updates are required for user-visible behavior,
   protocol changes, or rule semantics updates.
5. Keep v1 scope clean:
   deferred or experimental mechanics belong in `docs/FUTURE.md`, not in active
   rules/spec docs.
6. Add explicit security/protocol review on server-phase work:
   state filtering/privacy, reconnect/re-auth, and lifecycle correctness.
7. Expand tests alongside behavior changes:
   include integration effects and structured outcome/state invariants, not only
   unit-level return values.
8. For large tasks, split into smaller committable chunks to reduce context and
   rollback risk.
9. Before starting new work, quickly scan this summary plus the current roadmap
   and tasks to avoid repeating prior mistakes.

## Open Risks To Track

- State broadcast privacy leakage risk until server filtering is complete.
- Reconnect flow still needs authenticated session restoration.
- Documentation can drift again without disciplined “change-with-code” updates.

## Retrospective Maintenance

- Add short incremental notes only when new learnings materially change this
  summary.
- Prefer updating existing sections over appending long chronological entries.
