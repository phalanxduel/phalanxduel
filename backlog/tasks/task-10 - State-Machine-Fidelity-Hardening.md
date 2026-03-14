---
id: TASK-10
title: State-Machine Fidelity Hardening
status: To Do
assignee: []
created_date: ''
updated_date: '2026-03-14 03:24'
labels: []
dependencies: []
priority: medium
ordinal: 10000
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
- `backlog/decisions/DEC-2B-002 - Deterministic replay hash compatibility.md`
