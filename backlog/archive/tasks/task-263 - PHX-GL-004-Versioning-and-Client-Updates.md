---
id: TASK-263
title: PHX-GL-004 - Versioning and Client Updates
status: Done
assignee: []
created_date: '2026-05-02 20:39'
updated_date: '2026-05-03 16:46'
labels: []
milestone: m-10
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enable client version identification and server-triggered refresh to ensure players are on compatible versions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Client footer displays the current build identifier and version.
- [x] #2 Server-side force-reload trigger implemented and tested.
- [x] #3 Build version is automatically injected during deployment.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Footer updated to show v{__APP_VERSION__} ({__BUILD_ID__}) — schema version + git commit hash. Added forceReload to ServerMessageSchema, broadcastToAll() to IMatchManager/LocalMatchManager, POST /internal/broadcast/reload endpoint, and window.location.reload() client handler. Build ID was already injected via vite.config.ts git rev-parse.
<!-- SECTION:FINAL_SUMMARY:END -->
