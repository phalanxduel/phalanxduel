---
id: TASK-365
title: 'SwiftUI game feel: real macOS haptics, sound layer, and interaction animation'
status: Done
assignee: []
created_date: '2026-07-26 11:31'
updated_date: '2026-07-26 21:01'
labels:
  - swiftui
  - ux
  - polish
  - game-feel
dependencies: []
references:
  - 'game-swiftui:PhalanxDuelClient/UI/HapticAndAudioEngine.swift'
  - 'game-swiftui:PhalanxDuelClient/UI/GameTableView.swift'
  - 'game-swiftui:PhalanxDuelClient/UI/PhxCardView.swift'
priority: high
type: enhancement
ordinal: 232800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Goal: the game should feel solid, like a game worth playing — not a data-driven form. Researched by tracing actual call sites (not just reading class names) and found the tactile feedback layer is largely absent despite being wired into real gameplay taps.

### Haptics are called but are no-ops on macOS
`GameTableView.swift` calls `HapticAndAudioEngine.shared.playDeployHaptic()` / `playCardSelectedHaptic()` / `playAttackHaptic()` on real card-select/deploy/attack taps. But `HapticAndAudioEngine.swift` gates every method body in `#if os(iOS)` (UIKit's `UIImpactFeedbackGenerator`/`UISelectionFeedbackGenerator`/`UINotificationFeedbackGenerator`) with no macOS branch at all — this is a macOS-only app (`platform=macOS` target), so every call today is a silent no-op. `playVictoryHaptic`/`playDefeatHaptic` aren't called anywhere either.

### No sound exists
Zero audio assets in the repo (`.mp3`/`.wav`/`.caf`/`.m4a`), zero `AVAudioPlayer`/`NSSound`/`AVFoundation` references anywhere. "HapticAndAudioEngine" has no audio half despite the name. Note: this task can wire real playback plumbing and system-sound-backed placeholders, but cannot originate bespoke sound-design assets — bespoke SFX/music need to come from the user or an asset pipeline outside this session.

### Almost nothing animates
Grepped every `.animation`/`withAnimation`/`.scaleEffect`/`.transition` in the battlefield UI — the only hits are `CombatOverlayView`'s phase/attack flash banner (`GameTableView.swift:644-646`, `.transition(.opacity.combined(with: .scale))` + `.animation(.easeOut(duration: 0.2), ...)`). Selecting a card, deploying into a slot, HP bars depleting, and taking damage are all instant, un-animated state snaps — no spring pop on select, no lift/slide-to-slot on deploy, no HP-bar tween, no shake on damage. This is the single biggest gap versus what a card game is expected to feel like. Not a new regression: the browser reference client already has a deploy-fly-in CSS animation (`.pz-deploy-fly`) and its own `commentary-engine.ts`/`music-engine.ts` that were previously, intentionally not ported to SwiftUI — this task is the first real pass at closing that gap.

Sequenced before TASK-362 (accessibility)/TASK-363 (Dynamic Type) since the user's stated goal for this pass is game feel first; those remain independently valuable, tracked separately.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 HapticAndAudioEngine gets a real macOS implementation via NSHapticFeedbackManager (e.g. .generic/.alignment/.levelChange performers matched to select/deploy/attack/victory/defeat), verified by manually triggering each action on a trackpad-equipped Mac
- [x] #2 #2 A minimal real audio-playback layer is wired (AVAudioPlayer or NSSound) with system-sound-backed placeholders for select/deploy/attack/victory/defeat, with clearly documented hook points for swapping in bespoke SFX later
- [x] #3 #3 Card selection gets a spring/scale pop; deploying a card animates into its slot rather than snapping; HP bar changes tween rather than jump-cutting; taking damage gets a brief shake or flash on the affected card
- [x] #4 #4 All new and existing animations (including CombatOverlayView's existing flash) read @Environment(\.accessibilityReduceMotion) and skip/shorten when enabled
- [x] #5 #5 bin/qa/swiftui-proof.sh passes end-to-end after the interaction-layer changes (automation identifiers and tap behavior unchanged)
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

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented in game-swiftui commit c15e3eb: NSHapticFeedbackManager-backed macOS haptics (.generic/.alignment/.levelChange), NSSound-backed placeholder audio layer, spring scale-pop on card selection, spring deploy-into-slot transition, tweened HP bar, hand-rolled damage shake, victory/defeat haptics wired to match outcome. All new and existing animations gate on @Environment(\.accessibilityReduceMotion). bin/qa/swiftui-proof.sh re-verified passing end-to-end after these changes (commit aa564d2 fixed an unrelated automation regression found during that verification — see TASK-366 notes).
<!-- SECTION:FINAL_SUMMARY:END -->
