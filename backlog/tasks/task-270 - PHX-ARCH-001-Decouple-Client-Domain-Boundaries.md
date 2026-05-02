---
id: TASK-270
title: PHX-ARCH-001 - Decouple Client Domain Boundaries
status: Done
assignee: []
created_date: '2026-05-02 20:46'
updated_date: '2026-05-02 21:08'
labels: []
milestone: m-11
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
De-tangle the 'Big Ball of Mud' in the client architecture by breaking circular dependencies between Lobby and Renderer using a mediator/event-bus pattern.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Refactor client/src components (Lobby, Renderer) to communicate via a centralized EventHub or StateStore.
- [x] #2 Eliminate direct imports between Lobby and Renderer.
- [x] #3 Verify circular dependency violations are cleared in dependency-cruiser.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Broke the lobby↔renderer circular dependency by extracting two new modules: `app-connection.ts` (owns the `connection` singleton, exports `getConnection`/`setConnection`) and `error-ui.ts` (owns `renderError`, depends only on `state.ts`). Updated lobby.tsx, game.tsx, and AuthPanel.tsx to import from the new modules directly. renderer.ts now re-exports both for backward compat but no longer defines them. Dependency graph updated — no circular edges between lobby and renderer.
<!-- SECTION:FINAL_SUMMARY:END -->
