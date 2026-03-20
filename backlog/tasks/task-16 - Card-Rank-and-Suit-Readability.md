---
id: TASK-16
title: Card Rank and Suit Readability
status: Planned
assignee: []
created_date: ''
updated_date: '2026-03-14 03:00'
labels: []
dependencies: []
priority: medium
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Card readability is core gameplay value, not just visual polish. On smaller
viewports the rank and suit glyphs need to stay legible without breaking the
board layout, otherwise players misread combat state and mobile play becomes
needlessly error-prone.

## Problem Scenario

Given a player is on a smaller laptop or phone-sized viewport, when they look at
hand cards or battlefield cards, then the current rank and suit glyphs can be
too small to scan quickly with confidence.

## Planned Change

Adjust card typography, spacing, and responsive layout so rank and suit glyphs
stay readable at small sizes without causing overlap or layout breakage. The
plan focuses on the existing renderer and CSS instead of introducing a new card
component model because the issue is primarily presentational.

## Delivery Steps

- Given the current card renderer, when the typography is revised, then rank and
  suit glyphs become easier to read on small screens.
- Given responsive layouts, when card sizing changes, then battlefield and hand
  layouts still fit without clipping or overlap.
- Given regression risk, when the UI change lands, then visual QA covers both
  hand cards and battlefield cards.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- Given a mobile-scale viewport, when cards render in hand or on the battlefield,
  then rank and suit glyphs are visibly larger and easier to distinguish.
- Given the revised card styles, when the board renders across supported
  viewports, then cards do not overlap, clip, or hide important status text.
- Given suit color and glyph styling, when the UI is reviewed, then readability
  improves without changing gameplay meaning.

<!-- AC:END -->

## References

- `client/src/game-preact.tsx`
- `client/src/style.css`

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