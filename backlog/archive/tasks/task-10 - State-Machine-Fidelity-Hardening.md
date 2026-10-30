---
id: TASK-10
title: State-Machine Fidelity Hardening
status: Done
assignee: []
created_date: ''
updated_date: '2026-03-20 13:29'
labels: []
dependencies: []
priority: medium
ordinal: 60000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The engine's deterministic replay guarantees depend on the runtime reducer, the
explicit state-machine graph, and the regression tests all describing the same
transition rules. This task hardens that contract so future engine evolution,
including any XState-forward work, does not let documentation or transition
tests drift away from the reducer that actually runs matches.

## Problem Scenario

Given the engine evolves over time, when a transition is added or changed in one
place but not the others, then replay guarantees and reviewer confidence erode
because the canonical graph, runtime behavior, and tests stop agreeing.

## Planned Change

Create one authoritative transition contract that keeps `STATE_MACHINE`, the
runtime reducer, and regression coverage aligned. The plan is intentionally
XState-forward but replay-first, following the locked decision that framework
adoption must not weaken deterministic hash compatibility.

## Delivery Steps

- Given the current reducer and transition graph, when they are audited, then
  every legal transition and trigger has a canonical mapping.
- Given replay and hash compatibility are the primary constraint, when state
  machine changes are proposed, then the contract explains how compatibility is
  preserved.
- Given the canonical transition contract exists, when engine behavior changes,
  then tests and documentation fail loudly instead of silently drifting.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- Given the runtime reducer and `STATE_MACHINE`, when the audit is complete,
  then every supported phase transition is represented consistently in code and
  tests.
- Given replay/hash compatibility, when future state-machine work is planned,
  then the migration guardrails are documented and easy to review.
- Given a transition regression, when CI runs, then there is targeted coverage
  that makes the drift visible.

## References

- `engine/src/state-machine.ts`
- `engine/tests/state-machine.test.ts`
- `docs/adr/decision-005 - DEC-2B-002 - Deterministic replay hash compatibility.md`

- [x] #1 STATE_MACHINE graph includes every legal phase transition and forfeit path.
- [x] #2 validateAction uses the state machine to reject invalid actions for the current phase.
- [x] #3 Engine tests achieve 100% transition coverage of the STATE_MACHINE graph.
- [x] #4 GameOptions schema includes classicDeployment flag to support alternate start states.
- [x] #5 All project packages (engine, server, client) compile successfully with the new schema.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Formalized `STATE_MACHINE` in `engine/src/state-machine.ts` with 100% transition coverage.
- Added missing `forfeit` edges to all non-terminal phases.
- Refactored `validateAction` in `engine/src/turns.ts` to use `canHandleAction` for phase fidelity checks.
- Introduced `classicDeployment` option to `GameOptions` to support deployment-skipping transitions.
- Fixed cascading type errors in `server/src/app.ts`, `client/src/lobby.ts`, and `client/src/lobby-preact.tsx` due to new schema fields.
- Merged programmatic coverage verification into `engine/tests/state-machine.test.ts`.
- Regenerated all shared JSON schemas to reflect the new `GameOptions` structure.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [x] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [x] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [x] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [x] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [x] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [x] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->