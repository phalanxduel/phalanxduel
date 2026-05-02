---
id: TASK-257
title: Browser history navigation — back/forward button support
status: Done
assignee: []
created_date: '2026-05-02 08:05'
updated_date: '2026-05-02 08:11'
labels:
  - client
  - ux
  - navigation
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The client uses a `screen` state field and `setScreen()` calls but never touches the History API, so the browser back/forward buttons do nothing. Every screen transition must push a history entry so the user can navigate naturally.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 setScreen() calls window.history.pushState({ screen }, '', urlForScreen(screen)) on every transition
- [x] #2 A popstate listener calls setScreen() with event.state.screen when the user presses back/forward
- [x] #3 Direct URL navigation (e.g. /?screen=lobby) lands on the correct screen
- [x] #4 Existing ?screen= query-param links remain functional
- [x] #5 pnpm check passes after the change
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented browser back/forward navigation via the History API. `setScreen()`, `openRewatch()`, and `setProfileId()` now pass `{ screen }` in `pushState`. Added exported `syncStateFromUrl()` that re-reads URL params and restores screen + related state (profileId, rewatchMatchId, rewatchStep). Wired a `popstate` listener in `main.ts`. Fixed `resetToLobby()` to clear all screen-related URL params via `replaceState`. All 5 ACs satisfied; `pnpm check` passes.
<!-- SECTION:FINAL_SUMMARY:END -->
