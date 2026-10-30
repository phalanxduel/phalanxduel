---
id: TASK-220
title: Create gameplay GIF or short video for promotion
status: Done
assignee: []
created_date: '2026-04-07 02:42'
updated_date: '2026-05-03 21:24'
labels:
  - marketing
  - assets
  - p1
  - promotion-readiness
milestone: m-7
dependencies:
  - TASK-211
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Neither repo has animated content showing actual gameplay in motion. A 15-30 second GIF of create match, deploy cards, attack with cascade, LP damage is the strongest conversion asset for Reddit. Must be captured after debug button is removed (TASK-211).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A gameplay GIF or video (15-30s) exists showing a complete turn cycle
- [x] #2 GIF shows deployment, attack, cascade damage, and LP change
- [x] #3 No debug UI visible in the recording
- [x] #4 Asset is suitable for Reddit post embedding
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented `bin/qa/capture-gameplay-gif.ts` — a Playwright automation script that drives a headed PvB session (lobby → deploy → attack → LP damage), records via Playwright's `recordVideo`, then converts to a palette-optimized GIF using ffmpeg.\n\nFixed blockers encountered during first run: suppressed welcome overlay (`phx_welcome_v1_seen`), help dialog (`phx:helpOpen=false`), and onboarding tooltips via `addInitScript`. Fixed reinforce phase handling: play a reinforce card when available, skip only when no playable cards exist, wait when it's the bot's turn.\n\nOutput: `artifacts/marketing/gameplay.gif` — 28s, 12MB, 800px wide, 10fps palette-optimized. Covers deployment, attack, cascade, and LP change. No debug UI visible.\n\nAlso fixed `bin/qa/capture-gallery.ts`: removed duplicate screenshot line, moved `process.exit(1)` to top-level `.catch()` so `browser.close()` always runs.\n\nBoth scripts re-runnable: `capture-gameplay-gif.ts` wipes `.video-tmp/` at start; `capture-gallery.ts` overwrites screenshots idempotently.
<!-- SECTION:FINAL_SUMMARY:END -->
