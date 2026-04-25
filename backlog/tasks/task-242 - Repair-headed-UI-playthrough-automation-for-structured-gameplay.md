---
id: TASK-242
title: Repair headed UI playthrough automation for structured gameplay
status: In Progress
assignee: []
created_date: '2026-04-24 02:55'
updated_date: '2026-04-25 19:45'
labels:
  - qa
  - automation
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix the browser UI playthrough automation so headed runs drive real gameplay across supported scenarios instead of degrading into pass-only loops. The command-line interface must expose every automation setting that can be configured by environment variable, while retaining env vars as defaults for compatibility.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Headed local guest PvP playthrough reaches an end state while executing real attack actions, not only pass actions.
- [ ] #2 UI automation can identify playable deploy, attack, reinforce, pass, and forfeit controls through stable selectors or equivalent compatibility hooks.
- [ ] #3 Every playthrough automation option currently configurable by environment variable is also configurable via a documented command-line flag.
- [ ] #4 Docs list the supported playthrough scenarios and CLI flags for local, staging, and production targets.
- [ ] #5 Targeted client tests and at least one headed local playthrough validation pass.
- [ ] #6 Headed UI playthroughs can launch an optional spectator browser that joins through the public observer link and validates the streamable spectator HUD, live active-player status, spectator count, and play-by-play log.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## In-Session Progress (2026-04-25)

### Completed
- [x] AC#2 — all automation selectors verified with 13 new client tests (game.test.ts)
  - `.status-my-turn`, phase indicator text, `data-qa-attackable`, `attack-playable`, `valid-target`,
    `playable`, `reinforce-playable`, `is-reinforce-col`, `combat-skip-reinforce-btn`, `combat-forfeit-btn`
- [x] AC#3 — all 26 env-var options have CLI flags (already done in fa708065)
- [x] AC#4 — complete 27-row CLI flags reference table added to docs/reference/playthrough-scenarios.md
- [x] AC#6 — spectator code exists; joinSpectator now logs banner/livePanel/count; client tests cover all spectator HUD selectors

### Bug found and fixed
- **MATCH_FULL regression from TASK-243**: `claimPublicOpenSeat` was called for ALL matches
  when playerIndex=1. `claimPublicOpenMatch` returns false for private matches (visibility ≠ public_open),
  causing MATCH_FULL on every private guest-pvp join attempt.
- Fix: guard `claimPublicOpenSeat` call in `joinMatch` with `if (match.visibility === 'public_open')`.
- File: `server/src/match.ts` line ~709.

### Still needed
- [ ] AC#1 — headed local playthrough must complete with real attack actions (not pass-only)
  - Servers are running locally; need to re-run after MATCH_FULL fix and restart server
  - Run: `pnpm qa:playthrough:ui -- --headed --scenario guest-pvp --max-games 1 --starting-lp 5 --no-telemetry`
  - Look for `[MOVE N] ... attack col=N` lines in output
- [ ] AC#5 — "at least one headed local playthrough validation pass" (same run as AC#1)
- [ ] Server test covering MATCH_FULL regression (verify private join works after fix)
<!-- SECTION:NOTES:END -->
