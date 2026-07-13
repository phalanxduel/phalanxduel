---
id: TASK-343.06
title: Add Progressive Mathematical Combat Narration and Event Displays
status: Done
assignee:
  - '@codex'
created_date: '2026-07-13 14:00'
updated_date: '2026-07-13 18:55'
labels:
  - client
  - mathematical-narration
  - ux
dependencies:
  - TASK-343.05
  - TASK-343.07
documentation:
  - docs/gameplay/rules.md
  - docs/reference/test-constitution.md
  - docs/architecture/principles.md
parent_task_id: TASK-343
priority: high
ordinal: 191800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Use authoritative calculation provenance to create a distinctive player-facing mathematical experience across live narration, combat events, attack preview, replay, and post-match explanation. Provide compact tactical narration by default with cinematic and analyst presentations from the same trace.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Nontrivial combat modifiers display concise equations during live play
- [x] #2 Every combat event offers an accessible explanation of how its result was calculated
- [x] #3 Cinematic tactical and analyst presentations render the same authoritative trace
- [x] #4 Attack preview and replay show formula chains consistent with committed resolution
- [x] #5 Displayed values originate only from observer-authorized calculation provenance
- [x] #6 Screen-reader narration communicates equivalent mathematical meaning
- [x] #7 Deterministic browser evidence covers desktop and mobile gameplay
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Establish a deterministic client presentation timeline for each authoritative PhalanxTurnResult: resolution and calculation cues first, nonterminal phase transition second, and terminal verdict/result ownership last. Remove stale global-state reads, define cancellation/barrier behavior, and ensure reduced motion changes duration but never semantic order.
2. Consolidate phase presentation so the persistent HUD, narration ticker, cinematic overlay, and terminal splash have explicit noncompeting responsibilities. Add semantic data-component/state markers for automation.
3. Build one observer-safe combat explanation view model from authoritative calculation provenance, then render compact tactical narration by default with cinematic and analyst expansions, equivalent screen-reader text, and reuse in live events, attack preview, replay, and post-match explanation without recomputing rules.
4. Remove visible prototype identity leakage (TACTICAL_INIT_SYSTEM_v1.1, WIRE_0.5 | SPEC_1.0, and production-visible DEV affordance) while retaining real diagnostics behind an appropriate non-primary surface.
5. Add fake-timer unit/integration tests for cue order, terminal barriers, single-overlay ownership, hidden provenance, reduced motion, and shared trace equivalence; add deterministic desktop/mobile browser assertions and captures.
6. Run targeted client tests, playability verification, schema/rule/doc checks as applicable, full pnpm check, update Backlog evidence, and commit the focused TASK-343.06 slice on main without touching the unrelated screenshot deletion.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added one fail-closed combat explanation model over observer-authorized `CalculationProvenance`, with tactical, cinematic, and analyst renderings that preserve the same ordered rule trace and provide equivalent spoken equations. Reused that model in attack preview, live combat feedback, narration, engagement history, match replay, and the post-match turning point without recalculating authoritative damage. Reworked the presentation timeline so transaction and calculation cues precede a phase cue, while terminal results cancel phase/cinematic overlays and transfer ownership exactly once to the game-over view. The resolved arena remains mounted through lethal narration, reconnects to completed matches open the result directly, and late snapshots from an inactive match are rejected. Replaced prototype lobby identity text, removed the primary DEV affordance, stabilized the phase indicator, made empty valid targets semantically actionable, and kept the narration ticker collapsed by default on narrow screens.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Delivered progressive mathematical combat narration across preview, live play, event history, replay, and post-match explanation using the engine's authoritative ordered arithmetic witness. Tactical, cinematic, analyst, and screen-reader presentations derive from the same observer-safe trace. Terminal sequencing now proves a single game-over owner with no phase or cinematic bleed (`gameOverViews=1`, `phaseOverlays=0`, `activeCinematics=0`, `mathViews=1`) in deterministic 390x844 browser play; desktop and the 12/12 protocol playability gate also pass. Verified `pnpm check`, schema freshness, FSM/event-log/rule evidence, and the 2,355,388-case independent combat reference (digest `9e3d7f6d1a034c70eca28998bb1636184d520a7815bd8231f0684ab3ab8741dc`).
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
