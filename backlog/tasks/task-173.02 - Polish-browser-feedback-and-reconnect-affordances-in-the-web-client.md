---
id: TASK-173.02
title: Polish browser feedback and reconnect affordances in the web client
status: In Progress
assignee:
  - '@codex'
created_date: '2026-04-03 04:44'
updated_date: '2026-04-03 04:52'
labels: []
dependencies: []
documentation:
  - client/src/components/CopyButton.tsx
  - client/src/components/ErrorBanner.tsx
  - client/src/components/HealthBadge.tsx
  - client/src/renderer.ts
  - client/src/style.css
parent_task_id: TASK-173
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve small but high-frequency browser-client feedback surfaces so players get clearer confidence signals when the app is reconnecting, copying links, or processing lobby and game actions. Focus on live status messaging, action feedback, reduced-motion support, and accessible status semantics.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Connection, reconnect, copy, and transient action feedback feel more deliberate and readable than the current baseline across the browser client.
- [x] #2 Accessible status semantics exist for the key live-feedback surfaces so screen-reader users receive important game-session updates.
- [x] #3 Animation and motion-heavy feedback paths respect reduced-motion expectations without removing essential state cues.
- [x] #4 Targeted client verification covers the touched feedback components and documents the result.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit copy, error, health, and lobby status surfaces on the active Preact client path.
2. Improve live-feedback components for clearer reconnect/copy/action states with accessible status semantics.
3. Add reduced-motion-safe styling behavior for transient feedback surfaces.
4. Add targeted client tests for the touched components and run focused verification.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Picked as the highest-value first UI/UX polish slice because it improves every browser session without changing game rules. Discovery shows the Preact lobby/waiting path already relies on HealthBadge, CopyButton, and lobby status text, making TASK-173.02 the best leverage point.

Implemented a focused feedback polish pass on the client: structured Preact lobby session status card for ready/reconnecting/offline states, richer copy button success/error/pending feedback, stronger health badge accessibility metadata, and atomic alert semantics for transient error banners.

Verified the touched client surface with `rtk pnpm vitest run tests/copy-button.test.ts tests/lobby-preact.test.ts tests/renderer-helpers.test.ts` and `rtk pnpm typecheck` from `client/`.
<!-- SECTION:NOTES:END -->
