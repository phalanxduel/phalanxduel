---
id: TASK-11
title: Joker Wildcard Rules
status: Planned
assignee: []
created_date: ''
updated_date: '2026-03-29 22:33'
labels:
  - rules
  - gameplay
  - design
milestone: v0.5.0 - Stability & Playability
dependencies: []
priority: medium
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adding a Joker can create a high-identity wildcard card for the game, but the
current backlog note does not define what the card actually does in a rules-safe
way. This task is a design-first slice that turns the idea into a testable and
implementable rule instead of leaving the mechanic as a vague placeholder.

## Problem Scenario

Given the rules mention a Joker conceptually, when a developer tries to
implement or test it, then they still have to guess whether the Joker copies a
suit, changes draw behavior, or triggers some other effect.

## Planned Change

Choose one official Joker mechanic, define its interaction with combat and suit
systems, and leave the task implementation-ready once those decisions are
recorded. The plan starts with rules definition because any direct code change
without a specific mechanic would be guesswork and produce brittle tests.

## Delivery Steps

- Given the Joker is meant to be a wildcard, when the rules are written, then
  its core value, timing, and suit interaction are explicit.
- Given combat and card schemas, when the mechanic is finalized, then the
  implementation surface in engine/shared/client code is identifiable.
- Given QA needs deterministic behavior, when the task is ready for
  implementation, then representative Given/When/Then scenarios exist.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- Given the Joker card concept, when this task is complete, then the canonical
  rules specify exactly what happens when it is drawn, deployed, and used in
  combat.
- Given suit-based bonuses and card typing, when the Joker resolves, then its
  relationship to suits, bonuses, and wildcard behavior is unambiguous.
- Given implementation planning, when a developer picks up the next slice, then
  they can write engine tests without inventing missing behavior.

<!-- AC:END -->

## Open Questions

- Does the Joker copy a suit, act as a neutral suit, or trigger a unique effect?
- Is the Joker legal in ranked play immediately or only in experimental modes?
- Should the Joker stay 0/0 permanently, or is its value derived at resolution
  time?

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [ ] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [ ] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [ ] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [ ] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [ ] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [ ] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->
