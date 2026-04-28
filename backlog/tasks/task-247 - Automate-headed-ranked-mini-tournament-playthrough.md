---
id: TASK-247
title: Automate headed ranked mini-tournament playthrough
status: Human Review
assignee: []
created_date: '2026-04-28 19:20'
updated_date: '2026-04-28 21:36'
labels:
  - qa
  - automation
  - ranked
  - playthrough
dependencies:
  - TASK-242
references:
  - bin/qa/simulate-ui.ts
  - bin/qa/bot-swarm.ts
  - package.json
  - server/src/routes/internal.ts
  - server/tests/bot-swarm.test.ts
  - server/tests/internal.test.ts
documentation:
  - >-
    backlog/tasks/task-247 -
    Automate-headed-ranked-mini-tournament-playthrough.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a local-first headed QA runner for a three-player mini tournament. The runner should create unique registered bot accounts, use spectator-chain registration to seed players, run low-3-lifepoint one-player-vs-bot games, and report tournament placement alongside pre/post Elo and Glicko rankings. It should be configurable for local, staging, and production base URLs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A runnable headed QA command creates three unique registered bot accounts with random passwords and emails of the form bot+<generated-player-name>@phalanxduel.com.
- [x] #2 The automation runs a spectator-chain flow where player 1 starts a match, player 2 opens it as a spectator and registers, then player 2 starts a match and player 3 opens it as a spectator and registers.
- [x] #3 Each registered player completes a one-player-vs-bot game configured for 3 starting lifepoints.
- [x] #4 The runner captures each player’s pre-tournament and post-tournament Elo and Glicko ranking data.
- [x] #5 The runner prints a deterministic mini-tournament summary with first, second, and third place based on ranked win/loss results with rating deltas as tie-break/evidence.
- [x] #6 The command is local-first and supports configurable base URL / headed options suitable for staging and production runs.
- [x] #7 The mini-tournament record artifact captures each battle's post-battle report, including player-facing result, LP outcome, turning point, why, impact, spectator report text, and final JSON artifact path.
- [x] #8 The tournament flow has registered players spectate each other's matches after the registration invite chain: player 2 watches player 1, players 1 and 3 watch player 2, and players 1 and 2 watch player 3.
- [ ] #9 The mini-tournament record artifact captures each battle's post-battle report, including player-facing result, LP outcome, turning point, why, impact, spectator report text, and final JSON artifact path.
- [ ] #10 The tournament flow has registered players spectate each other's matches after the registration invite chain: player 2 watches player 1, players 1 and 3 watch player 2, and players 1 and 2 watch player 3.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a local-first headed mini-tournament mode in bin/qa/simulate-ui.ts and exposed it via pnpm qa:playthrough:tournament. The runner creates unique bot identities with bot+<generated-player-name>@phalanxduel.com emails, registers players through the spectator-chain flow, runs 3-LP authenticated 1-player-vs-bot matches, captures pre/post Elo and Glicko snapshots, and prints ranked first/second/third standings with rating deltas. Added a protected internal ratings endpoint for precise snapshots when ADMIN_INTERNAL_TOKEN/--internal-token is available, with profile-inferred fallback for local runs without the token. Headed local run completed for run pt-7fzeew with three generated players and ranked results.

Follow-up completed 2026-04-28: expanded the headed mini-tournament runner to capture post-battle reports into the saved record artifact and console report. The output now includes per-battle result text, LP depletion summary, turning point, why/impact text, spectator report text, and an end summary with standings and rating deltas.

Verified reciprocal spectating in headed local run pt-fqutcv: player 2 spectated player 1's match, players 1 and 3 spectated player 2's match, and players 1 and 2 spectated player 3's match. Record artifact: artifacts/playthrough-ui/pt-fqutcv-mini-tournament-report.json. Final standings: Botptfqutcv03 first, Botptfqutcv02 second, Botptfqutcv01 third.

Follow-up completed 2026-04-28: expanded the headed mini-tournament runner to capture post-battle reports into the saved record artifact and console report. The output now includes per-battle result text, LP depletion summary, turning point, why/impact text, spectator report text, and an end summary with standings and rating deltas.

Verified reciprocal spectating in headed local run pt-fqutcv: player 2 spectated player 1's match, players 1 and 3 spectated player 2's match, and players 1 and 2 spectated player 3's match. Record artifact: artifacts/playthrough-ui/pt-fqutcv-mini-tournament-report.json. Final standings: Botptfqutcv03 first, Botptfqutcv02 second, Botptfqutcv01 third.

pt-fqutcv verified post-battle report artifact and reciprocal spectator flow on 2026-04-28.

pt-fqutcv verified post-battle report artifact and reciprocal spectator flow on 2026-04-28.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented and verified headed mini-tournament automation. Local headed run pt-7fzeew created Botpt7fzeew01, Botpt7fzeew02, and Botpt7fzeew03, registered them via spectator-chain seeding, completed three 3-LP 1-player-vs-bot matches, and printed ranked standings with Elo/Glicko deltas. Focused typechecks and targeted server tests passed.

Follow-up: post-battle report capture and reciprocal spectator validation were added and verified in headed run pt-fqutcv. The run wrote artifacts/playthrough-ui/pt-fqutcv-mini-tournament-report.json and printed the post-battle report plus final standings summary.
<!-- SECTION:FINAL_SUMMARY:END -->

## Verification Notes

<!-- SECTION:VERIFICATION:BEGIN -->
- `pnpm qa:playthrough:verify` passed: 12/12 scenarios, no warnings/errors.
- `pnpm check` passed lint, typecheck, workspace tests, Go client checks, replay verification, and playthrough verification, then failed at docs artifact freshness because regenerated docs differ from `HEAD`. Generated docs are present in the working tree and need to be included with the change set before that gate is green.
<!-- SECTION:VERIFICATION:END -->
