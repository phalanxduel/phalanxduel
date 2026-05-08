---
id: TASK-259
title: Mini-tournament persistent players mode
status: Done
assignee: []
created_date: '2026-05-02 20:37'
updated_date: '2026-05-02 20:51'
labels:
  - qa
  - bot-swarm
  - tournament
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add `--persistent-players` flag to the mini-tournament QA runner so the same bot accounts are reused across runs. Enables tracking play behavior and win/loss records over time instead of generating fresh identities each run.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Running `pnpm qa:tournament --persistent-players` reuses existing bot accounts (registers on first run, logs in on subsequent runs)
- [x] #2 Bot identity files are stored in a deterministic JSON file (artifacts/tournament-accounts.json or similar)
- [x] #3 `buildPersistentTournamentIdentity` produces deterministic email/password — no randomBytes
- [x] #4 If accounts file exists, registration is skipped and login is used instead
- [x] #5 If accounts file is missing or entry is absent, registration proceeds and the file is updated
- [x] #6 pnpm check passes with no new errors
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added `--persistent-players` flag to mini-tournament runner. `buildPersistentTournamentIdentity` in bot-swarm.ts produces deterministic gamertag/email/password (TBotP001, bot+tp001@domain, PhxTour!00001!) with no randomBytes. Tournament accounts stored in `artifacts/tournament-accounts.json` — registered=false on first run triggers registration, registered=true on subsequent runs uses login. Also fixed a pre-existing bug where the `registerPlayer` function was defined but never called, leaving `tournamentPlayers` empty for the entire match loop. New script: `pnpm qa:playthrough:tournament:persistent`.
<!-- SECTION:FINAL_SUMMARY:END -->
