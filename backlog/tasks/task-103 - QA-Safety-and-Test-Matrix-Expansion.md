---
id: TASK-103
title: QA Safety and Test Matrix Expansion
status: To Do
assignee: []
created_date: '2026-03-21'
labels: []
milestone: v0.5.0 - Stability & Playability
dependencies:
  - TASK-101
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Address QA infrastructure hazards (TASK-35 stale port hijacking, TASK-36
production default) and expand the QA simulator to cover all gameplay mode
combinations. The simulator must be able to exercise every player-vs-opponent
permutation to ensure all game modes work end-to-end.

Subsumes TASK-35 and TASK-36.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 QA runner detects port 5173 conflict and fails fast with a clear error
      message before starting tests (TASK-35).
- [ ] #2 `simulate-ui.ts` defaults to `http://localhost:5173` instead of
      production URL (TASK-36).
- [ ] #3 QA test matrix supports all 7 player-vs-opponent combinations:

| Player 1 | Player 2 | Mode |
|----------|----------|------|
| Human | Human | PvP |
| Human | Bot (random) | SP |
| Human | Bot (heuristic) | SP |
| Bot (random) | Bot (random) | Auto |
| Bot (random) | Bot (heuristic) | Auto |
| Bot (heuristic) | Bot (random) | Auto |
| Bot (heuristic) | Bot (heuristic) | Auto |

- [ ] #4 Each mode runs a complete game to `gameOver` phase without error.
- [ ] #5 CI can run the full matrix via a single command (e.g.,
      `pnpm qa:matrix`).
<!-- AC:END -->

## Verification

```bash
# Port conflict detection
# Start a dummy server on 5173, then run QA — should fail fast
node -e "require('http').createServer().listen(5173)" &
pnpm qa:playthrough:ui 2>&1 | grep -i "port"
kill %1

# Default URL
grep -r 'BASE_URL' scripts/qa/ | grep -v localhost  # Should find nothing

# Full matrix
pnpm qa:matrix
# All 7 combinations should complete with exit 0
```
