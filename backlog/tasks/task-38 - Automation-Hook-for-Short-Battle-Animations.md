---
id: TASK-38
title: Automation Hook for Short Battle Animations
status: Planned
assignee: []
created_date: '2026-03-12 14:40'
updated_date: '2026-03-14 03:01'
labels: []
dependencies: []
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
- [ ] #1 Automated QA can verify recent Pizzazz animation triggers without depending on sub-200ms screenshot timing.
- [ ] #2 The verification hook is durable enough for test tooling but does not change player-facing animation behavior.
<!-- AC:END -->
