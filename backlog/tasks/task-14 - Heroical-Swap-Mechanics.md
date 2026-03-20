---
id: TASK-14
title: Heroical Swap Mechanics
status: Planned
assignee: []
created_date: ''
updated_date: '2026-03-20 21:40'
labels:
  - rules
  - gameplay
  - design
dependencies:
  - TASK-13
priority: medium
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Heroical play could create a signature face-card mechanic, but the current note
does not say when swaps are legal, what they cost, or how they interact with the
existing battlefield rules. This task defines the mechanic well enough that it
can be implemented and balanced intentionally instead of as an ad hoc exception.

## Problem Scenario

Given a player holds a face card, when they want to swap it onto the
battlefield, then the backlog does not define timing, limits, replacement rules,
or whether the move counts as deployment, attack setup, or a unique action.

## Planned Change

Define Heroical as a scoped face-card swap system with explicit legality,
timing, and cost rules before coding it. The plan is rules-first because this
mechanic affects turn economy, balance, and combat sequencing in ways that
cannot be tested well until the product behavior is explicit.

## Delivery Steps

- Given the Heroical concept, when the rules are written, then only specific
  card types, timings, and costs are allowed.
- Given battlefield replacement has edge cases, when the design is reviewed,
  then the treatment of displaced cards, damage state, and reinforcements is
  explicit.
- Given future implementation, when the next task is created, then it can focus
  on engine and UI work instead of open-ended product discovery.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- Given a legal Heroical action, when it is described in the rules, then timing,
  eligibility, and cost are explicit.
- Given a swap occurs, when the source and destination cards are defined, then
  the outcome for both cards is deterministic and testable.
- Given balance review, when the design slice is complete, then the mechanic has
  clear restrictions that prevent it from becoming an undefined power spike.

<!-- AC:END -->

## Open Questions

- Which face cards can trigger Heroical?
- Does the swap consume the player's normal action, a special resource, or both?
- What happens to the displaced battlefield card?

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
