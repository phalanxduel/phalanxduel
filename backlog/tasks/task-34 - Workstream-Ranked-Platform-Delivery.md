---
id: TASK-34
title: 'Workstream: Ranked Platform Delivery'
status: Planned
assignee:
  - '@codex'
created_date: '2026-03-12 13:29'
updated_date: '2026-03-29 22:33'
labels:
  - ranked
  - platform
  - workstream
milestone: v0.5.0 - Stability & Playability
dependencies: []
references:
  - backlog/tasks/task-1 - Forfeit-After-Repeated-Total-Passes.md
  - backlog/tasks/task-18 - Optional-Player-Accounts-and-Gamertags.md
  - backlog/tasks/task-19 - Player-Match-History-and-Lifetime-Stats.md
  - backlog/tasks/task-20 - Rolling-Elo-Ratings.md
  - backlog/tasks/task-21 - Ranked-Matchmaking-Queue.md
  - backlog/tasks/task-22 - Ranked-Lobby-Leaderboards.md
  - backlog/tasks/task-23 - Seasonal-Ladder-Resets-and-Archives.md
  - backlog/tasks/task-24 - Per-Action-Audit-Log-Persistence.md
  - backlog/tasks/task-34.1 - Ranked-Audit-and-Verification-Chain.md
  - backlog/tasks/task-34.2 - Database-Integration-Baseline.md
  - backlog/tasks/task-34.3 - Replay-Viewer-from-Persisted-Logs.md
priority: medium
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Epic-like coordinator for ranked platform delivery. Backlog in this repo does not expose a dedicated epic type, so this parent task plus explicit dependencies represent the former ranked roadmap and point at the concrete implementation tasks.
<!-- SECTION:DESCRIPTION:END -->

## Problem Scenario

Given ranked-platform work was previously spread across roadmap prose and mixed
implementation status, when contributors try to understand delivery order, then
they need one canonical coordinator task that maps the roadmap to concrete,
owned backlog items.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All actionable items from the archived ranked roadmap are represented by backlog tasks or documented mappings.
- [ ] #2 Task ordering and dependencies for ranked platform work are captured in Backlog.
- [ ] #3 The old RANKED_ROADMAP.md file can be removed once migration is complete.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Canonical ranked-platform order:
1. TASK-1 PHX-PASS-001 (completed pass-rule enforcement)
2. TASK-34.1 PHX-AUDIT-001 umbrella via TASK-2, TASK-3, TASK-24
3. TASK-34.2 PHX-DB-001 (completed DB baseline)
4. TASK-18 PHX-AUTH-001
5. TASK-19 PHX-STATS-001
6. TASK-20 PHX-ELO-001
7. TASK-21 PHX-MATCH-001
8. TASK-22 PHX-LEADER-001
9. TASK-34.3 PHX-REPLAY-003
10. TASK-23 PHX-SEASON-001

Use dependencies on the concrete tasks to capture local ordering; use this parent task as the single roadmap entry point.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Represented the archived ranked roadmap as an epic-like parent task plus explicit task dependencies.
- Added TASK-34.2 for the completed DB baseline and TASK-34.3 for the replay viewer roadmap item.
- Removed `docs/system/RANKED_ROADMAP.md` after moving the live roadmap entry point into Backlog and updating the remaining live backlink.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [ ] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [ ] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [ ] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [ ] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [ ] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [ ] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->
