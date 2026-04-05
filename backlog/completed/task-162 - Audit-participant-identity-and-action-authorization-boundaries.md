---
id: TASK-162
title: Audit participant identity and action authorization boundaries
status: Done
assignee:
  - '@codex'
created_date: '2026-04-01 20:27'
updated_date: '2026-04-02 21:30'
labels: []
dependencies:
  - TASK-160
priority: high
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Recent REST gameplay work exposed a real boundary bug where anonymous requests
could be misidentified as a participant through shared route logic. Production
readiness needs a deliberate audit of participant identity, player ownership,
spectator boundaries, and action authorization.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 All match-related HTTP and WebSocket entrypoints are reviewed for
  participant identity resolution and player ownership checks.
- [x] #2 #2 Findings are captured as explicit fixes or accepted residual risks.
- [x] #3 #3 Automated tests cover the discovered trust-boundary edge cases.
- [x] #4 #4 The audit confirms the server remains authoritative for player
  identity across REST and WebSocket flows.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a canonical REST participant-resolution helper in server/src/routes/matches.ts that resolves the requester to a seat using either authenticated userId or the anonymous player secret header, with explicit precedence and no duplicated route-local auth logic.
2. Reuse that helper for completed-match log access, POST /api/matches/:id/action, and POST /matches/:id/simulate so participant, spectator, and opponent boundaries are enforced consistently.
3. Preserve the existing server-authoritative WebSocket action path and audit it in tests rather than changing its socket-based identity model.
4. Add targeted route tests for completed-match log authorization, mixed JWT/header identity cases, and participant-only REST action/simulation behavior.
5. Run targeted server tests for the touched routes and security surfaces, then update the task notes with findings and verification evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Rules audit evidence on 2026-04-02 found that completed-match log access in
  `server/src/routes/matches.ts` treats a raw `x-phalanx-player-id` header as
  participant proof for anonymous players. Keep that trust boundary in scope for
  this task instead of creating a duplicate auth finding.

2026-04-02: Started trust-boundary discovery for HTTP and WebSocket participant identity, spectator access, and action authorization. Auditing current route helpers, match manager checks, and coverage before proposing the implementation plan.

2026-04-02: Started trust-boundary discovery for HTTP and WebSocket participant identity, spectator access, and action authorization. Auditing current route helpers, match manager checks, and coverage before proposing the implementation plan.

2026-04-02: Implemented canonical REST participant-resolution in server/src/routes/matches.ts so authenticated requests bind only to their JWT userId and anonymous requests fall back to x-phalanx-player-id only when no authenticated user is present. Added regression coverage for mixed JWT/header spoofing on REST action, simulate, and completed-log access. Residual audit note: completed-match public log redaction remains intentionally shallow today, so authorization evidence is asserted by equivalence to the public response rather than by absence of game.completed.

2026-04-02: Implemented canonical REST participant resolution in server/src/routes/matches.ts so authenticated requests bind only to their JWT userId and anonymous requests fall back to x-phalanx-player-id only when no authenticated user is present. Added regression coverage for mixed JWT/header spoofing on REST action, simulate, and completed-log access.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Hardened REST participant identity and action authorization boundaries by centralizing participant resolution, making JWT-backed identity take precedence over anonymous player-id headers, and adding targeted regression coverage for action, simulation, and completed-log access.
<!-- SECTION:FINAL_SUMMARY:END -->
