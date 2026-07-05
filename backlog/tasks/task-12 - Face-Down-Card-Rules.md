---
id: TASK-12
title: Face-Down Card Rules
status: Icebox
assignee: []
created_date: ''
updated_date: '2026-07-05 00:22'
labels:
  - rules
  - gameplay
  - design
milestone: 'Future Roadmap: Modes & Customization'
dependencies:
  - TASK-11
priority: medium
ordinal: 9010
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Face-down deployment could add bluffing and hidden-information play, but the
current task does not define reveal timing, legality, or how hidden cards
interact with deterministic replay. This task turns the concept into a rules
definition that can later be implemented without ambiguity.

## Problem Scenario

Given a player can theoretically place a card face-down, when combat, scanning,
or replay occurs, then the backlog does not define who knows the card identity,
when it flips, or how hidden information is represented safely.

## Planned Change

Define the minimum viable face-down rules, including visibility, reveal timing,
and replay-safe state representation. The plan starts with a rules contract
because hidden-information mechanics can easily break determinism or spectator
clarity if they are coded before the product rules are explicit.

## Delivery Steps

- Given a face-down deployment action, when the rules are written, then player
  visibility and spectator visibility are explicit.
- Given combat or reveal effects, when a hidden card resolves, then the reveal
  moment and any pre-reveal constraints are deterministic.
- Given replay and persistence requirements, when the representation is chosen,
  then hidden-state storage is compatible with audit and verification tooling.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- Given a face-down card on the battlefield, when turns progress, then the rules
  define exactly who can see what information before reveal.
- Given a combat or reveal trigger, when the face-down card flips, then the
  timing is explicit and testable.
- Given replay or admin tooling, when a historical match is inspected, then the
  hidden-information representation is still deterministic and reviewable.

<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Iceboxed on 2026-07-04 per stabilization/consolidation direction. Face-down card rules are future gameplay expansion, not core v1.x platform stabilization.
<!-- SECTION:NOTES:END -->

## Defined Rules

- **Visibility:** Face-down cards are strictly hidden from the opponent, spectators, and replay viewers. They are only revealed when flipped during gameplay or when the match ends.
- **Combat Interaction:** Face-down cards can be attacked directly. When a face-down card is attacked, it is forced to immediately reveal before damage calculation occurs.
- **Eligibility:** All cards in the game are eligible to be played face-down.

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
