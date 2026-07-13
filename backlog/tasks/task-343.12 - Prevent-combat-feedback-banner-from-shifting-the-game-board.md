---
id: TASK-343.12
title: Prevent combat feedback banner from shifting the game board
status: Done
assignee:
  - '@codex'
created_date: '2026-07-13 19:23'
updated_date: '2026-07-13 19:31'
labels:
  - client
  - ux
  - bug
  - animation
dependencies:
  - TASK-343.11
documentation:
  - client/src/game.tsx
  - client/src/style.css
  - client/tests/game.test.ts
modified_files:
  - client/src/game.tsx
  - client/src/style.css
  - client/tests/game.test.ts
parent_task_id: TASK-343
priority: high
ordinal: 197800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Preserve the high-impact combat feedback banner and its authoritative math narration while preventing its appearance or removal from changing board or hand layout. The browser client currently renders the transient banner as a normal-flow child between the top HUD and main board, causing visible vertical reflow during large damage events.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The existing combat feedback headline, cause tags, math narration, timing, and visual animation remain available for qualifying damage events.
- [x] #2 Showing or hiding combat feedback does not alter the game board or hand layout geometry.
- [x] #3 The feedback presentation does not intercept game controls and remains legible on desktop and mobile viewports.
- [x] #4 Reduced-motion behavior remains supported.
- [x] #5 Automated regression coverage verifies the feedback uses a layout-independent presentation layer, and relevant client and playability checks pass.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a stable, layout-independent combat-feedback presentation layer inside the game layout while preserving the existing CombatFeedbackBanner component, content, timing, and animation.
2. Anchor the layer near the lower play area/hand using repo-native absolute positioning, pointer-event isolation, bounded width, safe viewport spacing, and existing reduced-motion behavior.
3. Add focused DOM regression coverage proving the banner is hosted by the overlay layer and remains outside the main board flow.
4. Run focused client tests and static checks, the deterministic playability gate, disk-light desktop/mobile verification, and the unified project check. Preserve the unrelated deleted visual artifact and avoid new captures/videos/traces.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User explicitly requested the layout fix while preserving the effect, which constitutes approval to execute this focused plan. Baseline playability gate passed 12/12 before UI edits. Root cause confirmed during discovery: CombatFeedbackBanner is currently a normal-flow child between the top HUD and .phx-main-content in the .phx-game-layout grid.

Diagnosis: .phx-game-layout defines exactly hud-top/main/hud-bottom rows, while CombatFeedbackBanner had no grid-area. Its transient insertion created an implicit row after hud-bottom and compressed the 1fr main row. CSS transforms were not causal.

Regression loop: added a focused test requiring a permanent combat-feedback-layer directly under game-layout and requiring the active banner to render inside it. The test failed before implementation and passed after the layer was added.

Implementation: the stable layer is absolutely positioned against the existing hud-bottom grid area, centered at the bottom, pointer-events:none, and z-indexed above the HUD. Existing CombatFeedbackBanner state, timing, math, animation, semantic data attributes, and reduced-motion rule are unchanged. Mobile cause tags now wrap within the bounded layer.

Verification: pnpm check passed (build, lint, typecheck, documentation artifacts, shared/engine/server/client/admin/MCP tests); client suite 231/231; schema:check passed; rules:check passed including FSM consistency, event-log coverage, 71 rule evidence checks, and 2,355,388-case combat reference digest; post-build qa:playthrough:verify passed 12/12 with zero anomalies.

Disk-light Chromium geometry probe used the compiled client CSS without a server or database. Desktop board 1220x1246 and hand 1220x157 were identical before/after feedback insertion; mobile board 390x658 and hand 390x149 were identical. Both computed position:absolute and pointer-events:none. Probe was deleted and no screenshots, traces, videos, or database records were retained.

The user-owned deletion under test-results was not modified, restored, or included in this task.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Summary
- Preserve the existing high-impact combat feedback banner, including authoritative combat math, cause tags, timing, pulse animation, and reduced-motion behavior.
- Host the banner in a stable absolute presentation layer assigned to the existing bottom-HUD grid area, eliminating the transient implicit grid row that compressed the battlefield.
- Keep the layer non-interactive and viewport-safe, with wrapping cause tags for narrow screens.
- Add regression coverage proving the layer is permanently outside board flow and the active banner renders within it.

## Verification
- `pnpm check`
- Client tests: 231/231
- `pnpm qa:playthrough:verify`: 12/12, zero anomalies
- `pnpm schema:check`
- `pnpm rules:check`
- Headless Chromium geometry proof at 1600x1440 and 390x844: board and hand bounds unchanged before/after feedback insertion; layer computed absolute and pointer-transparent.

## Risk
Low and localized to client presentation. The feedback component and event/timing logic are unchanged; only its layout host changed.
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
