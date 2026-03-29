---
id: TASK-17
title: Per-Player Card Themes
status: Planned
assignee: []
created_date: ''
updated_date: '2026-03-29 22:33'
labels:
  - rules
  - gameplay
  - design
  - ui
milestone: v0.5.0 - Stability & Playability
dependencies:
  - TASK-16
priority: medium
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Per-player theming can increase ownership and identity without changing the
rules of play, but the current task does not define scope, persistence, or how
to keep cosmetic changes safely out of canonical gameplay state. This task
defines the first delivery slice for client-side card themes.

## Problem Scenario

Given two players want different cosmetic treatments for their cards, when the
game renders today, then both players are limited to the same visual style and
there is no explicit contract for how personal themes should stay separate from
the shared match state.

## Planned Change

Introduce a client-side theming system for card visuals only, with player-owned
preferences that do not alter the canonical rules, payloads, or replay data.
The plan keeps cosmetics out of shared state so theming can evolve without
creating compatibility or fairness problems.

## Delivery Steps

- Given the current card renderer, when theming support is added, then visual
  tokens such as borders, backgrounds, and glyph treatments can vary by player
  preference.
- Given multiplayer integrity, when themes are chosen, then they stay cosmetic
  and do not modify engine or network state.
- Given persistence needs, when a player returns, then their selected theme has
  a defined storage path or clearly documented temporary fallback.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- Given two different player preferences, when cards render, then each player
  can use a different cosmetic theme without affecting gameplay state.
- Given a replay or spectator flow, when the match is inspected, then the
  canonical transaction log and rules remain unchanged by theming choices.
- Given the first implementation slice, when the feature ships, then there is at
  least one non-default theme and a clear fallback to the default style.

<!-- AC:END -->

## Open Questions

- Should theme choice live in local storage first, in player accounts, or both?
- Do spectators see their own chosen theme, a neutral theme, or each player's
  selected cosmetics?
- Is theme selection available in ranked play from day one?

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
