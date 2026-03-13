---
id: TASK-16
title: Card Rank and Suit Readability
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

- Given a mobile-scale viewport, when cards render in hand or on the battlefield,
  then rank and suit glyphs are visibly larger and easier to distinguish.
- Given the revised card styles, when the board renders across supported
  viewports, then cards do not overlap, clip, or hide important status text.
- Given suit color and glyph styling, when the UI is reviewed, then readability
  improves without changing gameplay meaning.

## References

- `client/src/game-preact.tsx`
- `client/src/style.css`
