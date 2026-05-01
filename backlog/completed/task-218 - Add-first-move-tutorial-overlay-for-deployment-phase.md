---
id: TASK-218
title: Add first-move tutorial overlay for deployment phase
status: Done
assignee: []
created_date: '2026-04-07 02:40'
updated_date: '2026-05-01 01:40'
labels:
  - client
  - ux
  - onboarding
  - p1
  - promotion-readiness
milestone: m-5
dependencies:
  - TASK-211
references:
  - client/src/game-preact.tsx
  - ../site/STYLE_GUIDE.md
priority: high
ordinal: 1010
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The deployment phase drops first-time players into a 4x2 grid with 12 cards and zero explanation. No context about suit roles, deployment strategy, or objectives. Quick Start Guide exists but is collapsed. This is the highest bounce-risk moment. Add a minimal, dismissable overlay shown once on first visit: explain the grid, suit roles (Red=defense, Blue=offense per STYLE_GUIDE.md), and the deployment goal.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 First-time visitor sees a brief overlay explaining deployment before their first card placement
- [ ] #2 Overlay is dismissable and does not reappear (localStorage flag)
- [ ] #3 Overlay content matches STYLE_GUIDE.md voice and tone (deterministic, not casual)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added SUIT_CLASSIFICATION intel block to the deployment onboarding overlay in OnboardingBriefing.tsx. Block only renders during deployment phase and explains Red family (♥ Hearts, ♦ Diamonds) as DEFENSE_MATRIX and Blue family (♠ Spades, ♣ Clubs) as OFFENSE_VECTOR, matching STYLE_GUIDE.md semantics.
<!-- SECTION:FINAL_SUMMARY:END -->
