---
id: TASK-257
title: Browser history navigation — back/forward button support
status: In Progress
assignee: []
created_date: '2026-05-02 08:05'
updated_date: '2026-05-02 08:06'
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
- [ ] #1 setScreen() calls window.history.pushState({ screen }, '', urlForScreen(screen)) on every transition
- [ ] #2 A popstate listener calls setScreen() with event.state.screen when the user presses back/forward
- [ ] #3 Direct URL navigation (e.g. /?screen=lobby) lands on the correct screen
- [ ] #4 Existing ?screen= query-param links remain functional
- [ ] #5 pnpm check passes after the change
<!-- AC:END -->
