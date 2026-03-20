---
id: TASK-76
title: WebSocket Security Auditing and Hardening
status: Done
assignee: []
created_date: '2026-03-20 13:39'
updated_date: '2026-03-20 13:39'
labels:
  - security
  - infrastructure
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit the Phalanx WebSocket implementation against industry standards (OWASP) and implement defensive hardening to prevent Cross-Site WebSocket Hijacking (CSWSH), socket-exhaustion DoS, and zombie connection leaks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WebSocket implementation audited against OWASP WebSocket Security Cheat Sheet.
- [x] #2 Strict Origin validation enforced for handshakes.
- [x] #3 IP-based connection limiting (10 max) implemented to prevent DoS.
- [x] #4 Heartbeat (Ping/Pong) loop implemented to prune zombie connections.
- [x] #5 Security Strategy (SECURITY_STRATEGY.md) updated with WebSocket defenses.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Performed audit based on https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html
- Implemented `allowedOrigins` check in `server/src/app.ts` requiring strict Origin header.
- Implemented `wsConnectionsByIp` map to enforce limit of 10 connections per IP.
- Added 30s `pingInterval` with `isAlive` tracking to terminate non-responsive sockets.
- Documented all mitigations in `docs/system/SECURITY_STRATEGY.md`.
- Updated `server/tests/ws.test.ts` to verify origin rejection.
<!-- SECTION:NOTES:END -->
