---
id: TASK-12
title: Face-Down Card Rules
status: Planned
assignee: []
created_date: ''
updated_date: '2026-03-14 03:00'
labels: []
dependencies: []
priority: medium
ordinal: 3000
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

- Given a face-down card on the battlefield, when turns progress, then the rules
  define exactly who can see what information before reveal.
- Given a combat or reveal trigger, when the face-down card flips, then the
  timing is explicit and testable.
- Given replay or admin tooling, when a historical match is inspected, then the
  hidden-information representation is still deterministic and reviewable.

## Open Questions

- Do spectators or replay viewers see hidden cards immediately, after the match,
  or only after reveal?
- Can face-down cards be attacked directly before reveal?
- Are all cards eligible for face-down play, or only a subset?
