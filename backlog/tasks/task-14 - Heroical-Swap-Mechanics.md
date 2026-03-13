---
id: TASK-14
title: Heroical Swap Mechanics
status: Planned
assignee: []
created_date: ''
updated_date: '2026-03-13 14:50'
labels: []
dependencies: []
priority: medium
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

- Given a legal Heroical action, when it is described in the rules, then timing,
  eligibility, and cost are explicit.
- Given a swap occurs, when the source and destination cards are defined, then
  the outcome for both cards is deterministic and testable.
- Given balance review, when the design slice is complete, then the mechanic has
  clear restrictions that prevent it from becoming an undefined power spike.

## Open Questions

- Which face cards can trigger Heroical?
- Does the swap consume the player's normal action, a special resource, or both?
- What happens to the displaced battlefield card?
