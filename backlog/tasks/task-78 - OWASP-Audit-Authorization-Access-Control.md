---
id: TASK-78
title: 'OWASP Audit: Authorization & Access Control'
status: Human Review
assignee: []
created_date: '2026-03-20 13:44'
updated_date: '2026-03-20 13:51'
labels:
  - security
  - hardening
milestone: m-0
dependencies: []
priority: high
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evaluate the system against the [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) and [Access Control Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html). Focus on player-to-match ownership and admin privilege boundaries.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Audit MatchManager and route handlers against OWASP Access Control/Authorization Cheat Sheets.
- [x] #2 Verify that playerIndex and playerId cannot be used to manipulate opponent state (IDOR).
- [x] #3 Ensure admin dashboard routes are strictly isolated and authorized.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Audited `MatchManager` and `turns.ts`: Found that `validateAction` correctly enforces `activePlayerIndex` authority, preventing horizontal privilege escalation (controlling opponent).
- Audited `app.ts` WebSocket handling: Confirmed that `socketMap` binds sockets to specific `playerId`s at handshake, providing strong identity-to-connection mapping.
- Audited Admin routes: `checkBasicAuth` uses `timingSafeEqual` and environment-gated credentials, preventing unauthorized access to the operations panel.
- Audited Log API: Identity-based redaction (implemented in TASK-29) prevents IDOR access to hidden card data.
- Recommendation: Centralize auth logic using a Fastify decorator (e.g. `reply.authorizeMatchParticipant()`) to replace inline checks in route handlers.
- Recommendation: Implement a global "Deny by Default" hook for all `/admin/*` and `/api/internal/*` routes.
<!-- SECTION:NOTES:END -->
