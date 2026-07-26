---
id: TASK-363
title: SwiftUI Dynamic Type and Reduce Motion support (gameplay screens)
status: To Do
assignee: []
created_date: '2026-07-26 11:19'
updated_date: '2026-07-26 11:21'
labels:
  - swiftui
  - accessibility
  - polish
dependencies: []
references:
  - 'game-swiftui:PhalanxDuelClient/UI/AppTheme.swift'
  - 'game-swiftui:PhalanxDuelClient/UI/GameTableView.swift (CombatOverlayView)'
  - 'game-swiftui:PhalanxDuelClient/UI/PhxCardView.swift'
priority: low
type: enhancement
ordinal: 230800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Two Apple HIG accessibility requirements that `XCUIApplication.performAccessibilityAudit` does NOT check on macOS (Dynamic Type / text-clipping / trait audits only exist on iOS/tvOS/watchOS per `XCUIAccessibilityAuditTypes.h`), so unlike TASK-362 these can't be verified by re-running that harness — they need manual verification via System Settings toggles.

### Dynamic Type
A static grep of `game-swiftui/PhalanxDuelClient/UI/*.swift` found 61 uses of fixed `.system(size: N)` fonts and zero uses of scalable text styles (`.headline`, `.caption`, `.body`, etc., or `.font(.system(.caption, design: .monospaced))` which does scale). Text will not grow when a user increases their system font size in System Settings > Accessibility > Display > Text Size — a HIG requirement, not a suggestion. This is broad (61 call sites across AppTheme-styled gameplay views: PhxCardView, GameTableView, NarrationTickerView, EngagementLogView, CombatBannerView, GameSessionView's automation HUD) and touches the same tight monospace tactical-HUD layout the look-and-feel pass (TASK-360) deliberately designed — retrofitting scalable text without breaking that layout at larger sizes needs real design judgement, not a mechanical find-replace. Recommend establishing a small set of semantic text-style helpers (e.g. `Font.gameLabel`, `Font.gameValue`, `Font.gameMono` wrapping `.system(_:design:)` relative-to-style APIs) used consistently going forward, then migrating call sites in passes rather than one giant diff.

### Reduce Motion
Zero checks for `@Environment(\.accessibilityReduceMotion)` anywhere in the UI layer. `CombatOverlayView` (GameTableView.swift) drives transient phase/attack-narration flashes via `Task { try? await Task.sleep(...) }` + `withAnimation`, and `PhxCardView`'s selection glow/shadow uses animatable modifiers — none of this gates on Reduce Motion. Users with that setting enabled currently get the same flash/glow animations as everyone else.

This was surfaced during the accessibility research pass that also produced TASK-362 (the Accessibility Inspector Audit findings) — see that task for the tool-verified issues; this task is scoped separately because it can't share the same automated pass/fail loop.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 A small set of semantic Font helpers (Dynamic-Type-scalable) is introduced and the highest-traffic gameplay text (card rank/suit, HP bars, phase/turn labels) migrated to use them, verified by increasing System Settings > Accessibility > Display > Text Size and confirming text grows without breaking the layout
- [ ] #2 #2 Remaining fixed .system(size:) call sites are either migrated or have a documented reason they must stay fixed (e.g. a tight numeric HP-bar readout where growth would break the bar), tracked as a follow-up if not fully completed in this task
- [ ] #3 #3 CombatOverlayView's phase/attack flash animations and PhxCardView's selection glow read @Environment(\.accessibilityReduceMotion) and skip/shorten the animated transition when enabled, verified by toggling Reduce Motion in System Settings and confirming no flash/glow animation plays
- [ ] #4 #4 bin/qa/swiftui-proof.sh passes end-to-end after all UI changes
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
