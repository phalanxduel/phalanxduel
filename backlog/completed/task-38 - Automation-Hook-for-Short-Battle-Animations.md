---
id: TASK-38
title: Automation Hook for Short Battle Animations
status: Done
assignee: []
created_date: '2026-03-12 14:40'
updated_date: '2026-05-02 12:35'
labels:
  - qa
  - tooling
  - animation
milestone: v0.5.0 - Stability & Playability
dependencies:
  - TASK-37
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Track the short-lived animation verification problem as explicit QA tooling
work. Automation needs a durable signal that recent Pizzazz animations fired,
without depending on screenshot timing windows that are narrower than tool
round-trip latency.

## Problem Scenario

Given a combat animation fires and disappears quickly, when Playwright or
another QA tool tries to assert it, then the visible window can be too short for
reliable screenshot-based verification.

## Planned Change

Add a durable test hook that records recent animation triggers long enough for
automation to assert them, while leaving the player-facing animation behavior
unchanged. This plan verifies the event instead of racing the renderer.

## Delivery Steps

- Given a recent Pizzazz animation event, when the hook is added, then QA can
  inspect a durable signal after the animation has visually completed.
- Given the feature is test-only, when it is implemented, then it does not slow
  down or visibly alter real player animations.
- Given automation stability is the goal, when the hook is used, then tests no
  longer depend on sub-200ms screenshot windows.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Automated QA can verify recent Pizzazz animation triggers without depending on sub-200ms screenshot timing.
- [x] #2 The verification hook is durable enough for test tooling but does not change player-facing animation behavior.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added `recentTriggers` ring-buffer (cap 100) and `recordTrigger()` to `PizzazzEngine`. Triggers fire for: `combat` (per attack), `screenShake` (per LP-damage hit), `damagePop` (per damage step), `gameOver` (on phase transition). Each call updates `document.body.dataset.pzLastTrigger` and `dataset.pzTriggerSeq`. The engine registers as `window.__pizzazz`; `getTriggers()` returns the snapshot. Playwright can now assert `await page.evaluate(() => window.__pizzazz.getTriggers())` or poll `body[data-pz-trigger-seq]` after animations complete. 5 new vitest tests cover all cases. pnpm check passes.
<!-- SECTION:FINAL_SUMMARY:END -->

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
