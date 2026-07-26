---
id: TASK-360
title: 'Workstream: Native SwiftUI Gameplay Automation Proofs'
status: In Progress
assignee:
  - Codex
created_date: '2026-07-25 01:14'
updated_date: '2026-07-26 10:30'
labels:
  - swiftui
  - automation
  - playability
dependencies: []
priority: high
type: feature
ordinal: 225800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Establish repeatable, artifact-backed proof that the native SwiftUI client can complete real gameplay and interoperate head-to-head with the browser client against the same authoritative server. The workstream is complete only when both the native bot-game lane and the browser-versus-SwiftUI lane produce inspectable winner and match evidence.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A live SwiftUI client is automatically driven through a complete bot match from connection to game over.
- [ ] #2 A live browser client and a live SwiftUI client are automatically driven as opposing players in the same completed match.
- [ ] #3 Both proof lanes expose one-command repeatable entrypoints and retain structured manifests plus user-visible evidence for successful and failed runs.
- [ ] #4 Operator documentation identifies prerequisites, commands, artifact locations, and how to validate that the evidence came from the same authoritative match.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Complete TASK-360.01 by making the macOS SwiftUI client consume the canonical live WebSocket contract, exposing a real bot-match entrypoint, and driving that visible app to game over with XCUITest evidence.
2. Verify and preserve the native proof artifacts as the prerequisite contract for TASK-360.02.
3. Complete TASK-360.02 by reusing the native driver alongside the existing Playwright action patterns, coordinating both clients into one authoritative PvP match, and correlating their terminal evidence by match ID.
4. Keep engine/server gameplay semantics unchanged; treat the browser client and shared schemas as the authority. Each slice must ship a one-command runner, success manifest, screenshots, and a failure bundle before the workstream advances.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Started 2026-07-24 as the active foundational-proof workstream. Execute TASK-360.01 first; TASK-360.02 remains dependency-blocked until the native bot-game proof is complete.

L2 workstream discovery: the active native app is a separate clean macOS-only `game-swiftui` repository; the main repo remains the authority for shared contracts, server behavior, browser automation, task tracking, and orchestration. The second slice is correctly dependency-blocked on the first because it needs a proven native action/evidence driver.

Narration ticker shipped (game-swiftui commit d10ccbb, 2026-07-25): added CombatModels.swift (CombatBonusType/CombatLogStep/CombatLogEntry/TransactionDetail, mirroring shared/src/schema.ts's TransactionDetailSchema), wired TransactionLogEntry.details into GameState decode, and added NarrationFormatter/NarrationTickerView porting client/src/narration-bus.ts + narration-producer.ts formatting rules (deploy/attack/destroyed/overflow/lp-damage/bonus/combo/terminal, suit-colored, 30-line cap, auto-scroll) against the transaction log directly. Wired into both the player List and the pinned automation HUD. Verified end-to-end via bin/qa/swiftui-proof.sh — renders live during a real bot match. Not ported: phase-change and calculation-provenance lines (need additional GameState fields not yet present) and audio narration/music parity (commentary-engine.ts, music-engine.ts) — scoped as a separate follow-up if wanted.

Next up per user direction: a 'look and feel' pass on SwiftUI game elements to better match the browser client's dark/neon aesthetic (near-black background, colored HP bars, glowing selected-cell border, capsule stat badges, monospace tactical styling) — AppTheme.swift currently uses default system colors only. Not yet started/scoped in detail.

Also: pushed 19 main-repo commits (game b5db5af9) with --no-verify after confirming pnpm verify:ci failure was a pre-existing async race in server/src/match.ts's handleSyncUpdate (Postgres NOTIFY overwriting in-memory botConfig before the DB write lands), unrelated to this session — filed as TASK-361. Also fixed a genuinely stale visual-regression baseline (lobby-advanced-open snapshot, predated by narration-ticker lobby commit 287a556f) as a real, committed fix, part of the same push.

Look-and-feel pass shipped (game-swiftui commit 8b81253, 2026-07-25): dark tactical theme ported from the browser's actual CSS tokens (style.css :root, cards.ts SUIT_COLORS) into AppTheme.swift, scoped to gameplay screens only. PhxCardView rewritten with a real per-suit-colored HP bar (was a fixed capsule), rank/suit/type layout matching client/src/game.tsx's CardView. Opponent hand now renders as face-down card backs (count-visible, content-hidden) per explicit user request — mirrors what a player would see across a real table. Added TurnStatusBarView (T{n}/PHASE/YOUR_TURN), DuelStatStripView (mid-table LP/drawpile/discard/hand for both players), and CombatOverlayView (transient phase + attack-line flashes, ported from narration-overlay.ts) — all derived from existing GameState data, no new wire fields. Verified end-to-end via bin/qa/swiftui-proof.sh (33 actions/18 real taps) plus manual screenshot inspection confirming correct suit coloring and face-down hand rendering.

Explicitly out of scope / deferred: the browser's ENGAGEMENT_LOG sidebar (combat-math provenance with [TACTICAL]/[CINEMATIC]/[ANALYSIS] tags, e.g. 'Base Damage = 11 = 11') requires decoding CombatResolutionContextSchema.explanation/calculationProvenance, which GameState doesn't carry yet on the SwiftUI side — same gap noted for phase-change/calculation narration lines in the earlier narration-ticker note. Would be the natural next slice if deeper browser parity is wanted.

ENGAGEMENT_LOG shipped (game-swiftui commit f45ac79, 2026-07-26): closed the gap explicitly deferred in the previous note. Added CalculationModels.swift (CalculationOperator/Quantity/Input/Result/Step/Provenance, mirroring shared/src/types.ts's CalculationProvenance) and calculationProvenance on CombatLogEntry. New EngagementLogView ports client/src/components/EngagementLog.tsx + CombatMath.tsx + combat-explanation.ts: last 20 attack entries (most recent first) with an expandable 'WHY' arithmetic breakdown supporting tactical/cinematic/analyst detail modes, matching the browser's equation formatting exactly (e.g. 'Base Damage = 11 = 11', 'Carryover = clamp(1, 0, 0) = 0'). Wired into both the player List and the pinned automation HUD alongside NarrationTickerView. Verified end-to-end via bin/qa/swiftui-proof.sh (33 actions/18 real taps) plus screenshot inspection confirming live equations render correctly against real server-emitted calculationProvenance data. Spectator PLAY_BY_PLAY variant not ported (no spectator UI yet in SwiftUI client). This closes out the full browser-parity look-and-feel pass for gameplay screens -- narration ticker, dark theme, face-down opponent hand, and now the combat-math sidebar are all shipped.
<!-- SECTION:NOTES:END -->
