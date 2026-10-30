---
id: TASK-265
title: PHX-GL-007 - Eliminate Client-Side Time Dependency
status: Done
assignee: []
created_date: '2026-05-02 20:44'
updated_date: '2026-05-02 20:58'
labels: []
milestone: m-10
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Identify and eliminate potential time-bomb logic that relies on client-side time, ensuring all game-critical decisions use server-authoritative timestamps to prevent clock skew issues.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Audit codebase for use of client-side 'Date.now()' or 'new Date()'.
- [x] #2 Refactor identified logic to use server-authoritative timestamps where applicable.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Audit complete. Client uses `new Date().toISOString()` in action payloads (game.tsx) and `Date.now()` for heartbeat tracking (connection.ts), countdown display (lobby.tsx), anon ID generation (experiments.ts), and animation metadata (pizzazz.ts). None are game-critical: `match-actor.ts:433` shows `prepareValidatedAction` always overwrites client timestamps with a fresh server-side `new Date().toISOString()` before any engine operation. No refactoring needed — server is already authoritative.
<!-- SECTION:FINAL_SUMMARY:END -->
