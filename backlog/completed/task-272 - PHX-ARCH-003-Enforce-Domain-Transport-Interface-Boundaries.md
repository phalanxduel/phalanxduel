---
id: TASK-272
title: PHX-ARCH-003 - Enforce Domain-Transport Interface Boundaries
status: Done
assignee: []
created_date: '2026-05-02 20:46'
updated_date: '2026-05-03 16:13'
labels: []
milestone: m-11
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Strictly define the interface between infrastructure (transport) and domain (MatchManager) to ensure that protocol-agnostic validation can be reliably executed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Define 'MatchTransport' interface for protocol-agnostic communication.
- [x] #2 Ensure both REST and WebSocket handlers adhere strictly to the 'MatchTransport' interface.
- [x] #3 Flag and refactor any infrastructure-specific logic leaking into MatchManager.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed `matches: Map` and `socketMap: Map` from IMatchManager. Added `listInMemoryMatches()` and `getSocketInfo()` methods. Updated all callsites in app.ts, spectator.ts, stats.ts, matches.ts, and matchmaking.ts. Route handlers no longer access transport internals directly. Full gate passes.
<!-- SECTION:FINAL_SUMMARY:END -->
