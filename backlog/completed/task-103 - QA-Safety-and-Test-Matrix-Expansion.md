---
id: TASK-103
title: QA Safety and Test Matrix Expansion
status: Done
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
- [x] #1 QA runner detects port 5173 conflict and fails fast with a clear error
      message before starting tests (TASK-35). Both `simulate-ui.ts` and
      `simulate-headless.ts` check port reachability before launching browsers.
- [x] #2 `simulate-ui.ts` defaults to `http://127.0.0.1:5173` instead of
      production URL (TASK-36).
- [x] #3 QA test matrix supports all 7 player-vs-opponent combinations via
      `--p1` and `--p2` flags on `simulate-headless.ts`:

| Player 1 | Player 2 | Mode | Implementation |
|----------|----------|------|----------------|
| Human | Human | PvP | Two Playwright browsers |
| Human | Bot (random) | SP | Single browser + server bot |
| Human | Bot (heuristic) | SP | Single browser + server bot |
| Bot (random) | Bot (random) | Auto | Engine-only loop (~3ms) |
| Bot (random) | Bot (heuristic) | Auto | Engine-only loop (~3ms) |
| Bot (heuristic) | Bot (random) | Auto | Engine-only loop (~3ms) |
| Bot (heuristic) | Bot (heuristic) | Auto | Engine-only loop (~3ms) |

- [x] #4 Each Auto mode runs complete games to `gameOver` without error.
      SP and PvP modes require a running dev server.
- [x] #5 CI can run the full matrix via `pnpm qa:matrix` (all 7 combinations)
      or `pnpm qa:matrix:auto` (4 engine-only modes, no server required).
<!-- AC:END -->

## Verification

```bash
# Auto modes (no server needed) — all 4 bot-vs-bot combos
pnpm qa:matrix:auto
# Expected: 8 PASS lines (4 combos × 2 runs each), exit 0

# Port conflict detection (no server running)
pnpm tsx bin/qa/simulate-headless.ts --p1 human --p2 human --batch 1 2>&1 | head -3
# Expected: "Port 5173 on 127.0.0.1 is not listening (ECONNREFUSED)"

# Default URL check
grep 'BASE_URL.*production\|play.phalanxduel.com' bin/qa/simulate-ui.ts
# Expected: no output (production URL removed)

# Full matrix (requires running dev server + client)
pnpm qa:matrix
# Expected: all 7 combinations complete with exit 0
```
