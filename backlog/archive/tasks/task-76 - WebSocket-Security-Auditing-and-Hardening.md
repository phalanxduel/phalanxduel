---
id: TASK-76
title: WebSocket Security Auditing and Hardening
status: Done
assignee: []
created_date: '2026-03-20 13:39'
updated_date: '2026-03-20 18:31'
labels:
  - security
  - infrastructure
dependencies: []
priority: high
ordinal: 61000
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
- Documented all mitigations in `docs/architecture/security-strategy.md`.
- Updated `server/tests/ws.test.ts` to verify origin rejection.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [x] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [x] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [x] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [x] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [x] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [x] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->
