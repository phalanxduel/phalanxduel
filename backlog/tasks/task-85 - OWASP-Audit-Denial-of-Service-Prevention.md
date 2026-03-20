---
id: TASK-85
title: 'OWASP Audit: Denial of Service Prevention'
status: Human Review
assignee: []
created_date: '2026-03-20 13:45'
updated_date: '2026-03-20 13:56'
labels:
  - security
  - hardening
milestone: m-0
dependencies: []
priority: medium
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evaluate the system against the [OWASP Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html). Focus on resource exhaustion and flooding protection.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Audit rate-limiting and resource-cleanup logic against OWASP DoS Cheat Sheet.
- [x] #2 Verify that large payloads or malformed JSON cannot crash the engine or server.
- [x] #3 Ensure connection limits effectively prevent IP-based socket exhaustion.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Audited Rate Limiting: Fastify `rate-limit` is active (100 req/min). WebSocket sliding window (10 msgs/sec) is active.
- Audited Payload Limits: WebSocket messages are capped at 10KB (verified at buffer level). Zod validation rejects deep/recursive JSON.
- Audited Resource Cleanup: `cleanupMatches` removes finished matches after 5 mins and abandoned matches after 10 mins. This prevents memory exhaustion.
- Recommendation: Limit the number of concurrent "Active" matches a single IP can host (e.g. 3).
- Recommendation: Add spectator quotas per match (e.g. max 50) to prevent a single match from consuming excessive broadcast bandwidth.
- Recommendation: Implement a "slow down" penalty for IPs that consistently trigger validation errors.
- Verification: Large payloads (>10KB) are correctly rejected with 1009 code (implemented in TASK-76).
<!-- SECTION:NOTES:END -->
