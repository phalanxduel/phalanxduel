---
id: TASK-176
title: Polish browser feedback and reconnect affordances in the web client
status: To Do
assignee: []
created_date: '2026-04-03 04:43'
labels: []
dependencies: []
documentation:
  - client/src/components/CopyButton.tsx
  - client/src/components/ErrorBanner.tsx
  - client/src/components/HealthBadge.tsx
  - client/src/renderer.ts
  - client/src/style.css
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve small but high-frequency browser-client feedback surfaces so players get clearer confidence signals when the app is reconnecting, copying links, or processing lobby/game actions. Focus on live status messaging, action feedback, reduced-motion support, and accessible status semantics.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Connection, reconnect, copy, and transient action feedback feel more deliberate and readable than the current baseline across the browser client.
- [ ] #2 Accessible status semantics exist for the key live-feedback surfaces so screen-reader users receive important game-session updates.
- [ ] #3 Animation and motion-heavy feedback paths respect reduced-motion expectations without removing essential state cues.
- [ ] #4 Targeted client verification covers the touched feedback components and documents the result.
<!-- AC:END -->
