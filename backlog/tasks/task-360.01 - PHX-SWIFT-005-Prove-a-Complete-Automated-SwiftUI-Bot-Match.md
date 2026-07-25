---
id: TASK-360.01
title: PHX-SWIFT-005 - Prove a Complete Automated SwiftUI Bot Match
status: Done
assignee:
  - Codex
created_date: '2026-07-25 01:14'
updated_date: '2026-07-25 15:48'
labels:
  - swiftui
  - automation
  - playability
dependencies: []
documentation:
  - docs/testing.md
  - docs/reference/qa-runners.md
parent_task_id: TASK-360
priority: high
type: task
ordinal: 226800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create durable proof that the real native SwiftUI application, connected to a live local Phalanx Duel server, can be automatically operated through a complete player-versus-bot match. The proof must exercise user-visible gameplay rather than only compiling views or invoking the session model headlessly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Automation launches the native SwiftUI application, connects it to a live local server, starts or joins a bot match, and reaches the terminal game-over state without manual input.
- [x] #2 Automation performs the legal player actions needed across deployment and combat through the native app's user-facing automation surface.
- [x] #3 Each successful run writes a structured manifest containing at least match ID, player identities, winner, final score or life-point state, turn count, action count, seed when available, and timestamps.
- [x] #4 Each run retains user-visible evidence covering match start, gameplay, and game over, and failure runs retain diagnostics sufficient to locate the blocked phase.
- [x] #5 A documented one-command entrypoint reproduces the proof on a supported macOS development host.
- [x] #6 The one-command proof has an on-demand heads-up mode that keeps the real SwiftUI app visible, visibly paces user-facing actions, and holds the terminal state long enough for a human to watch the full sequence.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Repair the native live-contract seam needed for a real bot match: send protocol-required reliable IDs on WebSocket creation, handle ACK and application ping/pong frames, consume the server-projected `TurnViewModel.validActions`, and add a `SessionStore` bot-create path without changing engine/server gameplay semantics.
2. Add a user-visible bot-match control and stable accessibility identifiers for connection, match, phase, turn ownership, authoritative legal actions, players/life points, and terminal outcome. Drive gameplay from server-projected valid actions rather than client-invented legality.
3. Extend the macOS XCUITest target with a complete bot-match driver that launches the real app against a supplied local server, performs deployment/attack/reinforcement or pass actions through visible controls, reaches game over, captures start/gameplay/terminal screenshots, and always emits a structured manifest or failure diagnostics. Add explicit, clearly labeled automation hooks and a heads-up mode that activates the app on the primary display, exposes server-authoritative actions as visible controls, paces every interaction, and holds game over for observation.
4. Add a main-repo QA coordinator and package command that starts a uniquely ported server through `bin/maint/with-tooling-postgres.sh`, runs only the native proof test, extracts retained attachments from `.xcresult`, validates the manifest, retains server/Xcode/app logs, and cleans up only its owned processes. Expose a documented watch command/flag for an on-demand visible run.
5. Document the one-command lane and artifact contract. Use the installed on-device Apple Intelligence (`apfel`) for focused Swift/accessibility/XCUITest review, validating any findings with native tooling. Run native unit/build checks, the live heads-up proof, Xcode-specific formatting/static-analysis/validation checks, targeted main-repo checks, `pnpm qa:playthrough:verify`, and the unified repo check before finalization.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Started 2026-07-24. Research current native app flow, local server orchestration, browser QA artifact conventions, and supported XCUITest capabilities before recording the implementation plan.

Pre-implementation playability gate passed: `rtk pnpm qa:playthrough:verify` completed 12/12 deterministic matrix runs with zero warnings/errors on 2026-07-24. UI work may proceed once the researched implementation plan is recorded.

L2 context brief: reviewed `game-swiftui` instructions, Xcode topology, SessionStore, REST/WS clients, message/state models, ServerConnectView, GameSessionView, GameTableView, unit/UI tests, plus main-repo shared schemas, MatchManager WebSocket flow, projection/valid-action logic, and browser QA manifest patterns. Closest analogs are `bin/qa/simulate-headless.ts` for artifact/failure structure and its server-backed browser action loop for phase-aware legal input.

Primary gaps/risks: current UI test stops before authoritative state; bot creation is unreachable and its encoded frame lacks required `msgId`; ACKs become protocol errors; no app-level pong risks disconnect after 65 seconds; gameplay elements have no stable identifiers; local Swift legality diverges from authoritative attack rules; current native target is macOS-only; Xcode UI automation needs host GUI/cache access. Baseline native build and 12/12 playability matrix both pass.

User explicitly expanded the proof contract on 2026-07-24: the automation must be watchable on demand, visually headed, and show the full sequence rather than only producing background artifacts. The XCUITest driver and coordinator will expose a paced heads-up mode and retain visual evidence.

User explicitly requested that native Apple Intelligence carry appropriate review load. The installed `apfel` v1.8.4 reports its on-device Apple Foundation Model available; focused reviews will cover Swift correctness, accessibility/XCUITest brittleness, concurrency, and proof-integrity risks, with compiler/analyzer/live execution remaining authoritative.

Session handoff 2026-07-24 (Codex ran out of budget mid-task; Claude continued): the headed XCUITest bot-match proof now PASSES. Two blockers were fixed after Codex's last run: (1) the Automation Proof Driver section lived inside the scrollable List and was rendered at negative Y (offscreen), so automation.perform-next-action was never hittable — moved to a pinned safeAreaInset HUD above the list; (2) the view-level .accessibilityIdentifier("game.session") was applied after the safeAreaInset and stamped over every HUD child's identifier — reordered so the HUD keeps its own identifiers. Committed in game-swiftui as 3a5a98f.

Evidence (retained in .xcresult attachments; direct file writes from the UITest runner to the run dir silently fail and need the coordinator to extract from xcresult): LP3 smoke run /private/tmp/phalanx-swiftui-smoke-20260724-2140 — match e3fe2fcf, SwiftUI Thomas def. Bot (Random) 3→0 LP, lpDepletion, 17 actions (9 native). LP20 full run /private/tmp/phalanx-swiftui-proof-20260724-lp20 — 10/10 tests passed (9 contract + 1 UI proof); match 7037e135, SwiftUI Thomas def. Bot (Random) 20→0, lpDepletion, 7 turns, 29 actions (13 native), ~3 min headed at 500 ms cadence with screenshots (start/first-deploy/first-attack/game-over) plus full screen recording.

Remaining for AC #5/#6 and DoD: build the main-repo QA coordinator + one-command entrypoint (start wrapper-guarded server on a unique port, run only the proof test, extract attachments from .xcresult since the runner cannot write the run dir directly, validate manifest, clean up owned processes), expose the documented watch command/heads-up flag, write operator docs, then run the full main-repo DoD checks. Server for manual reruns: env PHALANX_SERVER_PORT=3101 HOST=127.0.0.1 bash bin/maint/with-tooling-postgres.sh pnpm --filter @phalanxduel/server exec tsx src/index.ts. Proof command: xcodebuild test -project PhalanxDuelClient.xcodeproj -scheme PhalanxDuelClientUIProof -destination platform=macOS PHALANX_QA_CONFIG_FILE=<config.json>.

Session handoff 2026-07-25 (continued by Claude): built the main-repo one-command coordinator closing AC #5/#6. bin/qa/swiftui-proof.sh starts a wrapper-guarded server on a uniquely owned port (first free from 3121), runs only AutomationTests/testCompleteBotMatch via the PhalanxDuelClientUIProof scheme, extracts manifest+screenshots from the .xcresult via bin/qa/verify-swiftui-proof.ts (the UITest runner cannot write the run dir directly), validates the run, and cleans up only its own server process. --watch is the documented heads-up flag (500ms action pacing, 20s game-over hold). Wired as `pnpm qa:swiftui:proof` / `pnpm qa:swiftui:proof:watch`; documented in docs/testing.md and docs/reference/qa-runners.md. Committed as game (bin/qa files) 45e5b3b8.

Three real bugs surfaced and fixed while making the coordinator green in game-swiftui (commit 2d053d9): (1) MatchOutcome.winnerIndex was non-optional Int, so decoding a draw's gameState (repetitionDraw/noProgressDraw/turnLimitDraw legitimately carry winnerIndex:null) threw and silently dropped the WS frame, stalling automation until timeout — made it Int? and handled nil in GameSessionView and the manifest/verification contract; a draw is now valid terminal evidence, not a failure. (2) waitForHittableElement now re-activates the app if it loses foreground focus mid-wait (seen when the proof runs unattended in the background — the whole accessibility tree reports Disabled and every element becomes unhittable). (3) The automation window is now maximized to the screen's visible frame on launch (was a fixed 1200x900 centered window) and the live battlefield renders pinned alongside the automation HUD instead of inside the scrollable List, so the whole board (both battlefields + both hands) stays visible to a human watcher instead of being scrolled off — confirmed visually against a real run's screenshots per user request.

Full DoD verified 2026-07-25 on main repo: pnpm verify:quick (build/lint/typecheck/db-isolation/docs:artifacts) green, pnpm test:run:all all suites green, pnpm --filter @phalanxduel/shared schema:gen + scripts/ci/verify-schema.sh up to date, pnpm rules:check (FSM consistency, event log coverage 6/6 action types, rule evidence 71 rules, combat reference) green, pnpm qa:playthrough:verify 12/12 green. End-to-end coordinator verified via `pnpm qa:swiftui:proof`: match 3f3f094b, SwiftUI Thomas def. Bot (Random) 20->12/0 by lpDepletion, 9 turns, 33 actions (18 native), maximized-window screenshots confirm full board visibility.

Follow-up noted, not in scope for this task: user observed the battlefield renders both players' rows stacked in the same orientation rather than facing each other (a 'dueling' game convention would mirror the opponent's row). This is pre-existing GameTableView layout, unrelated to the automation proof — worth a future design task if desired.

Follow-up polish 2026-07-25 (user-requested, post-Done): the battlefield now visually mirrors the browser reference client's dueling convention — GameTableView renders the opponent's rows in reverse order so both players' front lines (row 0, used for attacking) meet at the shared boundary between their fields, matching client/src/game.tsx's PhxBattlefield rowOrder logic exactly (viewerIndex defaults to player 0 for spectators, consistent with the documented 'board renders from player-0's perspective' convention). Also replaced the automation.perform-next-action synthetic dispatch button with real board interaction: AutomationTests now taps the same hand-card and battlefield-slot elements a human player would (select a hand card then tap a deploy-target slot; tap an attacker slot then a target slot; tap a reinforce-eligible card; tap Send Pass), keyed off the accessibility states GameTableView already exposes from server-authoritative validActions. Added game.hand-scroll.<playerIndex> identifier so automation can swipe a player's hand into view (it is not lazily loaded, so off-screen cards exist but aren't hittable without scrolling). Fixed a real SwiftUI bug found along the way: nesting a ForEach inside another ForEach's closure directly under LazyVGrid does not reliably flatten — only rendered one row per player until replaced with a flat precomputed GridCell sequence. Verified via `pnpm qa:swiftui:proof`: both rows render for both players, automation completes a full match purely through real card/slot taps (match 96894c5b, 18 native actions/33 authoritative). Committed as game-swiftui b2eb4f0.
<!-- SECTION:NOTES:END -->
