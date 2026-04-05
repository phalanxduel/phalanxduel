---
id: TASK-165
title: 'Verify first-class client compatibility across browser, Go, and generated SDKs'
status: Done
assignee: []
created_date: '2026-04-01 20:28'
updated_date: '2026-04-02 21:32'
labels: []
dependencies:
  - TASK-162
priority: high
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The browser UI is the first citizen, but the Go client and generated SDKs are
part of the supported architecture now. Production readiness requires explicit
compatibility verification across those client surfaces against the same server
contracts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 Browser, Go, and generated SDK client flows are mapped to the same
  server contract expectations.
- [x] #2 #2 Compatibility checks exist for matchmaking, join, reconnect, and
  action submission across supported client surfaces.
- [x] #3 #3 Known parity gaps are documented as backlog follow-ups or explicit
  release limitations.
- [x] #4 #4 The reference-client story is documented as part of the supported
  production architecture.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-02: Verified first-class client compatibility across browser, Go, and generated SDK surfaces. Fixed the SDK generator entrypoint import so `pnpm sdk:gen` runs again, regenerated the OpenAPI/SDK artifact chain, added a compatibility regression test covering REST bootstrap and WebSocket contract surfaces, and documented the supported-client matrix plus residual gaps in docs/system/CLIENT_COMPATIBILITY.md.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored the regenerable OpenAPI/SDK artifact chain, verified browser/Go/generated-SDK compatibility across REST bootstrap and WebSocket contract surfaces, added a regression test for those shared client surfaces, and documented the supported client matrix with explicit residual gaps.
<!-- SECTION:FINAL_SUMMARY:END -->
