---
id: TASK-343.11
title: 'Polish Narration, Combat Effect, and Phase Transition Choreography'
status: Done
assignee:
  - '@codex'
created_date: '2026-07-13 18:55'
updated_date: '2026-07-13 19:11'
labels:
  - client
  - ux
  - animation
  - mathematical-narration
dependencies:
  - TASK-343.06
documentation:
  - docs/system/UI_COMPONENT_TAXONOMY.md
  - docs/reference/qa-runners.md
  - docs/testing.md
modified_files:
  - client/src/cinematic-overlay.ts
  - client/src/game.tsx
  - client/src/narration-overlay.ts
  - client/src/narration-producer.ts
  - client/src/pizzazz.ts
  - client/src/presentation-timing.ts
  - client/src/style.css
  - client/tests/narration-producer.test.ts
  - client/tests/pizzazz.test.ts
  - client/tests/presentation-overlays.test.ts
  - docs/system/dependency-graph.svg
parent_task_id: TASK-343
priority: high
ordinal: 196800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refine the browser client's presentation choreography so narration, mathematical combat explanations, combat effects, phase changes, and the terminal handoff feel deliberate, responsive, and visually cohesive without changing authoritative gameplay order or obscuring actionable controls. Preserve reduced-motion behavior, accessibility, deterministic automation markers, and mobile playability.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Narration, calculation, combat-effect, phase, and terminal cues use one visually coherent timing and easing language
- [x] #2 Phase transitions remain legible and never overlap active combat or terminal presentation
- [x] #3 Narration and mathematical explanations enter, persist, and exit without abrupt replacement or unreadable stacking
- [x] #4 Combat effects reinforce event causality without delaying or blocking player actions
- [x] #5 Reduced-motion mode preserves semantic cue order and readable state changes without decorative movement
- [x] #6 Desktop and mobile deterministic browser evidence confirms controls remain actionable and terminal presentation has one owner
- [x] #7 Focused automated tests cover transition ordering, cancellation, and reduced-motion behavior
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm available disk space and reuse the existing current-v1 design baseline and installed Playwright browser; do not generate a full duplicate visual catalog.
2. Run the mandatory 12/12 protocol playability gate before UI edits.
3. Consolidate presentation timing and easing into shared client motion tokens, preserving authoritative event order.
4. Give narration, mathematical explanation, combat effects, phase announcements, and terminal handoff explicit enter/hold/exit states with cancellation so only one high-emphasis cue owns the focal layer.
5. Keep controls immediately actionable and implement a semantically equivalent reduced-motion path.
6. Add deterministic fake-timer tests for ordering, replacement, cancellation, and reduced motion.
7. Run focused client tests and disk-light seeded desktop/mobile browser playthroughs with only targeted evidence, then run the full repository check and update the task evidence.

<!-- markdownlint-disable MD003 -->
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Introduced one immutable `PRESENTATION_TIMING` contract for narration queue cadence, overlay holds/exits, cinematic ownership, combat impact timing, phase transitions, and terminal effects. Narration now retains at most the current causal stack, dims prior equations, and crossfades to phase announcements through explicit entering/holding/exiting states. Cinematic replacement also crossfades and reserves the focal layer until its hold plus exit completes. Attack beams now land before impact flashes and staggered damage numbers, while controls remain independent of all presentation timers. CSS adds a cohesive motion vocabulary, restrained phase chapter transitions, responsive cinematic typography, and a reduced-motion projection that keeps semantic cue order without decorative movement. Disk constraint was honored by reusing the installed browser and existing baseline, skipping full catalog/video/trace capture, and retaining no new persistent QA bundle.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-13 18:56
---
Human constraint accepted: be mindful of disk space. Reuse existing design assets and browser installation, avoid full duplicate baseline/catalog generation, and keep generated QA evidence targeted.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Polished the browser client's narration, combat-effect, phase, and terminal choreography without changing gameplay semantics. Centralized presentation timing; added explicit overlay lifecycle ownership and cancellation; synchronized vector, impact, damage, equation, phase, and terminal cues; improved cinematic/phase aesthetics; and implemented equivalent reduced-motion behavior. Added fake-timer coverage for focal-layer reservation, narration-to-phase crossfade, terminal cancellation, cinematic replacement, reduced motion, and beam-before-impact causality. Verification passed: `pnpm qa:playthrough:verify` (12/12), client tests (26 files, 231 tests), deterministic desktop and 390x844 mobile PvP browser runs with `gameOverViews=1`, `phaseOverlays=0`, `activeCinematics=0`, `mathViews=1` for both players, full `pnpm check`, schema freshness, 71-rule/FSM/event-log checks, and the 2,355,388-case combat reference digest `9e3d7f6d1a034c70eca28998bb1636184d520a7815bd8231f0684ab3ab8741dc`. No full design catalog, video, trace archive, or persistent browser evidence bundle was generated; free disk remains approximately 11 GiB.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
