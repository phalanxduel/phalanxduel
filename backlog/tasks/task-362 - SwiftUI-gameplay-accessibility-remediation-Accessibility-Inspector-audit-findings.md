---
id: TASK-362
title: >-
  SwiftUI gameplay accessibility remediation (Accessibility Inspector audit
  findings)
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
  - game-swiftui commit bae5b66 (AccessibilityAuditTests.swift harness)
  - 'game-swiftui:PhalanxDuelClient/UI/AppTheme.swift'
  - 'game-swiftui:PhalanxDuelClient/UI/GameTableView.swift'
  - 'game-swiftui:PhalanxDuelClient/UI/EngagementLogView.swift'
  - 'game-swiftui:PhalanxDuelClient/UI/NarrationTickerView.swift'
  - 'game-swiftui:PhalanxDuelClient/UI/CombatBannerView.swift'
  - /private/tmp/phalanx-swiftui-accessibility-audit-20260726/exported/
priority: medium
type: bug
ordinal: 229800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Apple's XCTest accessibility audit (`XCUIApplication.performAccessibilityAudit` — the same engine behind Accessibility Inspector's Audit tab) was run against a live, populated `game-swiftui` gameplay screen via a new harness (`PhalanxDuelClientUITests/AccessibilityAuditTests.swift`, committed in game-swiftui@bae5b66). It found 63 issues across 4 of macOS's 4 supported audit categories (contrast, element-detection, hit-region, sufficient-element-description are the macOS set; this run had zero element-detection/hit-region hits). Two more HIG-relevant gaps (Dynamic Type, Reduce Motion) are NOT covered by this audit tool on macOS at all — tracked separately in TASK-363 since they need manual verification instead of tool-verified pass/fail.

Raw evidence: /private/tmp/phalanx-swiftui-accessibility-audit-20260726/exported/ (accessibility-audit.json, audited-screen.png) — regenerate anytime via the harness (see AC #6).

### Findings by category

### 1. Contrast (29 failed + 10 near-pass = 39/63 issues, the majority)
Root cause: `Color.gameTextMuted` (0x9CA3AF) and `Color.gameTextDim` (0x6B7280) from `AppTheme.swift` don't meet the contrast floor against `Color.gameBackground`/`gameSurface` in several contexts. Affected surfaces: `automationHUD` field labels (Phase/Turn/Owner/Actions/Local/Match/last-action — GameSessionView.swift), `TurnStatusBarView` phase/turn labels, `DuelStatStripView` stat strips, `EngagementLogView` WHY-equation lines, `CombatBannerView` summary text. One stock List row ("Health" under Server Snapshot) was also flagged — needs checking whether a `.listRowBackground` override is bleeding contrast from an ancestor.

### 2. Missing accessibility actions (20/63) — functionally the most serious
`BattlefieldSlotView` and the hand-card views in `GameTableView.swift` (lines ~334, 355, 467-471, 495-499) use `.onTapGesture { }` + `.accessibilityAddTraits(.isButton)` without a paired `.accessibilityAction(.default)`. VoiceOver announces these as buttons but has no way to actually invoke them — a VoiceOver user cannot deploy or attack. This is the one category where the fix touches code the XCUITest automation suite depends on (`game.slot.*`, `game.hand-card.*` identifiers must survive unchanged).

### 3. Insufficient element descriptions (13/63)
- Decorative SF Symbol icons with no accessibility label read their literal symbol name aloud: confirmed for `bolt.shield.fill` (`CombatBannerView.swift`); same pattern likely affects the chevron icons in `NarrationTickerView.swift`/`EngagementLogView.swift` toggle buttons even though only one wasn't flagged this pass (the audit's "human-readable" heuristic apparently accepts "chevron.down" but not "bolt.shield.fill").
- `game.engagement-log-toggle` (`EngagementLogView.swift:125-139`) has an empty/unreadable synthesized label — `.buttonStyle(.plain)` wrapping a composite `HStack(Text+Spacer+Image)` label doesn't reliably synthesize a combined label on macOS. Same structural pattern exists in `NarrationTickerView.swift`'s toggle (`game.narration-toggle`) and should be fixed alongside it even though it wasn't individually flagged.
- `HiddenHandView` (`game.hand-hidden.*`) has identifier/label/value but no accessibility trait ("Unknown role").
- Several unlabeled `Group`/`Other` containers (List section dividers, per-row battlefield row containers) — likely default-container noise, needs a quick per-item check rather than a blanket suppression.

### 4. Parent/child mismatch (1/63)
A 14×14 element near screen position (65,49) — matches the "LIVE" eye-icon badge in `automationHUD`'s `Label(..., systemImage: "eye.fill")`. Lowest priority; re-check after category 2/3 fixes land since some hierarchy artifacts resolve themselves once sibling issues are fixed.

### Verification

Re-run the harness after each phase and confirm `issueCount` drops (ideally to 0, or document any remaining issue as an accepted false positive with a comment in the test):

```bash
bash bin/qa/swiftui-proof.sh   # regression: automation identifiers unchanged
# then, against the same running server:
cd ../game-swiftui && xcodebuild test-without-building \
  -project PhalanxDuelClient.xcodeproj -scheme PhalanxDuelClientUIProof \
  -destination 'platform=macOS' \
  -only-testing:PhalanxDuelClientUITests/AccessibilityAuditTests/testGameplayAccessibilityAudit \
  -resultBundlePath /tmp/audit.xcresult PHALANX_QA_CONFIG_FILE=<config.json>
xcrun xcresulttool export attachments --path /tmp/audit.xcresult --output-path /tmp/audit-out
jq '.issueCount' /tmp/audit-out/*.json
```

Category 2 (accessibility actions) is the highest-risk change since it touches automation-critical tap handlers — `bin/qa/swiftui-proof.sh` MUST pass after that phase, not just the audit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 Contrast: gameTextMuted/gameTextDim (and any other flagged token) retuned in AppTheme.swift until the audit's contrast category (failed + near-pass) drops to 0 for the audited screen; the one flagged stock List row is root-caused and fixed or explained
- [ ] #2 #2 Accessibility actions: BattlefieldSlotView and hand-card views get a paired .accessibilityAction(.default) (or are converted to real Button(action:)) alongside every .accessibilityAddTraits(.isButton), with zero 'Action is missing' issues remaining and zero regressions in bin/qa/swiftui-proof.sh's automation identifiers
- [ ] #3 #3 Element descriptions: decorative SF Symbol icons get .accessibilityHidden(true) or a real label; the narration-ticker and engagement-log toggle buttons get an explicit .accessibilityLabel reflecting open/closed state; HiddenHandView gets an appropriate accessibility trait; remaining unlabeled container issues are triaged (fixed or documented as accepted)
- [ ] #4 #4 Parent/child mismatch re-checked after #2/#3 land and fixed or documented if it persists
- [ ] #5 #5 A full re-run of the audit harness shows issueCount at 0, or every remaining issue has an inline code comment explaining why it's an accepted false positive
- [ ] #6 #6 bin/qa/swiftui-proof.sh passes end-to-end after all UI changes (automation identifiers and tap behavior unchanged)
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
