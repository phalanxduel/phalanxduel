---
id: TASK-34.3
title: Replay Viewer from Persisted Logs
status: Done
assignee: []
created_date: '2026-03-12 13:34'
updated_date: '2026-05-01 22:48'
labels:
  - ranked
  - platform
  - ui
milestone: 'Future Roadmap: Modes & Customization'
dependencies:
  - TASK-34.1
references:
  - backlog/tasks/task-24 - Per-Action-Audit-Log-Persistence.md
  - server/src/db/schema.ts
parent_task_id: TASK-34
priority: medium
ordinal: 9100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Players and support staff need more than an admin replay endpoint; they need a
focused viewer that can step through a completed match from persisted history.
This task creates the player-facing replay surface that turns canonical match
logs into an understandable theater mode.

## Problem Scenario

Given a completed match exists in persistence, when a player or operator wants
to review how it unfolded, then the repo offers admin replay data but not a
dedicated client experience for exploring the recorded turn history.

## Planned Change

Build a replay viewer that reads the canonical persisted match and
transaction-log format instead of inventing a second ad hoc playback model. This
keeps the UI aligned with the same audit data used for verification and support.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A replay/theater experience can render a persisted transaction log for a completed match.
- [x] #2 The replay viewer uses the canonical persisted match and transaction-log format.
- [x] #3 The ranked roadmap has a canonical Backlog successor for the replay-viewer item.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Implement after persistent transaction logging is stable. Reuse the persisted match record format from the database layer and expose a focused client replay surface instead of a second ad hoc log format.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
All ACs satisfied by the TASK-248 workstream: TASK-248.08 delivered GET /api/matches/:id/actions and GET /api/matches/:id/replay?step=N using the canonical transaction_logs table; TASK-248.09 delivered GET /api/matches/history with pagination and playerId filter; TASK-248.10 delivered the REWATCH client screen with scrubber, Play/Pause, and read-only board. No additional implementation needed.
<!-- SECTION:FINAL_SUMMARY:END -->

## Delivery Steps

- Given canonical persisted match data exists, when the replay surface is built,
  then it can load and render a completed match without requiring live gameplay
  code paths.
- Given the transaction log is the source of truth, when playback advances, then
  the viewer steps through the canonical recorded history rather than derived UI
  state.
- Given support and player review use cases, when the viewer ships, then it is
  clear how to open a match, navigate turns, and inspect key state changes.

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [ ] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [ ] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [ ] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [ ] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [ ] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [ ] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
- [ ] #8 Code builds without errors (pnpm build)
- [ ] #9 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #10 All unit and integration tests pass (pnpm test:run:all)
- [ ] #11 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #12 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #13 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
