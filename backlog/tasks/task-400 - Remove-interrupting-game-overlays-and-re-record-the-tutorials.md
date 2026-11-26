---
id: TASK-400
title: Remove interrupting game overlays and re-record the tutorials
status: Done
assignee: []
created_date: '2026-11-25T20:13:47Z'
updated_date: '2026-11-25T20:39:11Z'
labels: []
dependencies: []
references:
  - client/src/lobby.tsx
  - client/src/game.tsx
  - scripts/tutorials/record-episode.ts
modified_files:
  - client/src/lobby.tsx
  - client/src/game.tsx
  - client/src/main.ts
  - client/src/components/WelcomeDialog.tsx
  - client/src/components/HowToPlayDialog.tsx
  - client/src/components/HelpDialog.tsx
  - client/src/components/OnboardingBriefing.tsx
  - scripts/tutorials/schema.ts
  - scripts/tutorials/record-episode.ts
  - scripts/tutorials/build-episode.mjs
  - client/src/components/AuthPanel.tsx
  - scripts/tutorials/scenarios/ep-01-welcome-and-objective.json
  - scripts/tutorials/narrations/ep-01-welcome-and-objective.md
  - scripts/tutorials/scenarios/ep-02-deployment-and-quick-deploy.json
  - scripts/tutorials/narrations/ep-02-deployment-and-quick-deploy.md
  - scripts/tutorials/scenarios/ep-03-combat-cascade.json
  - scripts/tutorials/narrations/ep-03-combat-cascade.md
  - scripts/tutorials/scenarios/ep-04-suit-boundaries.json
  - scripts/tutorials/narrations/ep-04-suit-boundaries.md
  - scripts/tutorials/scenarios/ep-05-special-cards-pass-reinforce.json
  - scripts/tutorials/narrations/ep-05-special-cards-pass-reinforce.md
  - scripts/tutorials/scenarios/ep-08-hud-combat-math-and-settings.json
  - scripts/tutorials/narrations/ep-08-hud-combat-math-and-settings.md
  - scripts/tutorials/scenarios/ep-09-classic-vs-cumulative-and-custom.json
  - scripts/tutorials/narrations/ep-09-classic-vs-cumulative-and-custom.md
  - scripts/tutorials/scenarios/ep-20-advanced-column-and-suit-synergy.json
  - scripts/tutorials/narrations/ep-20-advanced-column-and-suit-synergy.md
  - scripts/tutorials/scenarios/ep-21-tempo-pass-economy-and-traps.json
  - scripts/tutorials/narrations/ep-21-tempo-pass-economy-and-traps.md
  - scripts/tutorials/scenarios/ep-22-full-annotated-champion-duel.json
  - scripts/tutorials/narrations/ep-22-full-annotated-champion-duel.md
  - scripts/tutorials/tutorial-terminal.ts
  - scripts/tutorials/scenarios/ep-06-account-signup-and-management.json
  - scripts/tutorials/narrations/ep-06-account-signup-and-management.md
  - scripts/tutorials/scenarios/ep-07-cardbacks-and-cosmetics.json
  - scripts/tutorials/narrations/ep-07-cardbacks-and-cosmetics.md
  - scripts/tutorials/scenarios/ep-10-pvp-1v1-lobby-and-reconnect.json
  - scripts/tutorials/narrations/ep-10-pvp-1v1-lobby-and-reconnect.md
  - scripts/tutorials/scenarios/ep-11-bots-basics-scout-to-soldier.json
  - scripts/tutorials/narrations/ep-11-bots-basics-scout-to-soldier.md
  - scripts/tutorials/scenarios/ep-12-bots-specialist-and-champion.json
  - scripts/tutorials/narrations/ep-12-bots-specialist-and-champion.md
  - scripts/tutorials/scenarios/ep-13-rankings-elo-and-seasons.json
  - scripts/tutorials/narrations/ep-13-rankings-elo-and-seasons.md
  - scripts/tutorials/scenarios/ep-14-profiles-history-and-achievements.json
  - scripts/tutorials/narrations/ep-14-profiles-history-and-achievements.md
  - scripts/tutorials/scenarios/ep-15-replays-and-hash-verification.json
  - scripts/tutorials/narrations/ep-15-replays-and-hash-verification.md
  - scripts/tutorials/scenarios/ep-16-spectator-mode.json
  - scripts/tutorials/narrations/ep-16-spectator-mode.md
  - scripts/tutorials/scenarios/ep-17-playing-in-a-tournament.json
  - scripts/tutorials/narrations/ep-17-playing-in-a-tournament.md
  - scripts/tutorials/scenarios/ep-18-hosting-a-local-tournament.json
  - scripts/tutorials/narrations/ep-18-hosting-a-local-tournament.md
  - scripts/tutorials/scenarios/ep-19-terminal-client-duel-cli.json
  - scripts/tutorials/narrations/ep-19-terminal-client-duel-cli.md
  - client/src/components/MatchDetailsDialog.tsx
  - client/src/components/MatchDetails.tsx
  - client/src/components/MatchHistory.tsx
  - client/src/cinematic-overlay.ts
  - client/src/narration-overlay.ts
  - client/src/help.ts
  - client/tests/presentation-overlays.test.ts
  - client/tests/help.test.ts
  - client/src/style.css
  - client/src/presentation-timing.ts
  - client/src/pizzazz.ts
  - client/src/constants.ts
  - client/src/components/SettingsPanel.tsx
  - scripts/tutorials/stage-episode.ts
  - client/src/index.ts
  - scripts/tutorials/manifest.json
  - client/src/renderer.ts
  - scripts/tutorials/README.md
  - client/src/components/EngagementLog.tsx
priority: high
type: bug
ordinal: 274800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The tutorial footage repeatedly shows the lobby or first deployment while the narration promises another feature. Informational dialogs and full-screen announcements also cover the game and interrupt capture.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Informational dialogs and full-screen announcements no longer interrupt play.
- [x] #2 Tutorial footage shows the action and result described by the narration.
- [x] #3 Portrait edits focus on the featured controls and board state from a desktop recording.
- [x] #4 The recording workflow documents the previous failures and how to review replacement footage.
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
Inspect prior renders and pass the playability gate. Remove passive lobby and gameplay overlays; keep rules available inline or by link. Capture at desktop resolution using observable actions, state assertions, interaction pacing, and per-cue shot framing. Render and visually review replacements locally, documenting feature gaps and the repeatable process.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Audited 22 original scenarios. Eight held the lobby throughout, 13 deployed at most one card, and zero submitted attacks. Existing renders confirmed the combat episode stopped at deployment and the terminal episode only displayed the browser lobby.

Verified 22 local MP4s with AAC audio, VTT captions, edit maps, and contact sheets. All masters are 1600×900. Portrait exports use wide context and a cue-specific foreground crop, and landscape exports retain the full board. Outputs are under output/video/rerecorded/.

pnpm check, qa:playthrough:verify (12/12), tutorial:validate, schema:check, rules:check, and standalone tutorial-script type checking passed. The documentation artifact check passed. Staging preview was local and dry-run only.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed passive onboarding and combat modals, moved settings and match breakdowns in-flow, and recorded verified gameplay and feature demonstrations for all 22 episodes. Added per-cue evidence, desktop capture, portrait framing, and rendered timeline metadata. The local replacements include 10 portrait and 12 landscape videos.
<!-- SECTION:FINAL_SUMMARY:END -->
