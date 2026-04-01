---
id: TASK-130
title: Implement RESTful Game Action Endpoint
status: Human Review
assignee:
  - '@codex'
created_date: '2026-03-30 21:02'
updated_date: '2026-04-01 14:51'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
To support clients that cannot maintain long-lived WebSocket connections (e.g., simple CLI tools, low-power mobile apps), we need a standard RESTful way to submit game turns. This provides a symmetric experience to the WebSocket protocol.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 Implement 'POST /api/matches/:id/action' that accepts a standard Game Action.
- [x] #2 #2 Ensure the endpoint performs the same identity verification as the WebSocket handler (playerIndex vs socket/identity).
- [x] #3 #3 Return the 'TurnViewModel' (redacted pre/post state and events) in the response.
- [x] #4 #4 Document this endpoint in OpenAPI with full schema support for all action types.
<!-- AC:END -->

## Implementation Plan

- Reuse `matchManager.handleAction()` as the single authoritative action
  application path rather than duplicating engine mutation logic in the route.
- Add `POST /api/matches/:id/action` alongside the existing match routes with
  the shared `ActionSchema` and `TurnViewModelSchema`.
- Cover participant auth, playerIndex spoofing, and OpenAPI drift with targeted
  server tests before broadening to the repo gate.

## Implementation Notes

- `server/src/match.ts` now returns the canonical `PhalanxTurnResult` from
  `handleAction()` so non-WebSocket transports can project the same outcome the
  socket path uses.
- `server/src/routes/matches.ts` now serves `POST /api/matches/:id/action`,
  resolves the acting participant from JWT or `x-phalanx-player-id`, and
  returns a redacted `TurnViewModel`.
- `getViewerIndex()` in `server/src/routes/matches.ts` now refuses anonymous
  `undefined === undefined` matches, closing a route-auth bug that could have
  treated unauthenticated requests as player 0.
- `server/tests/action-endpoint.test.ts` covers successful action submission,
  non-participant rejection, spoofed `playerIndex` rejection, and unknown-match
  handling.
- `server/tests/__snapshots__/openapi.test.ts.snap` now includes the REST
  action endpoint.
- `docs/system/SITE_FLOW.md` and `docs/system/site-flow-2.mmd` now document
  REST action submission as part of the degraded-connectivity external-client
  flow.

## Verification

- `rtk pnpm --filter @phalanxduel/server exec vitest run tests/action-endpoint.test.ts tests/simulate.test.ts`
- `rtk pnpm --filter @phalanxduel/server exec vitest run tests/openapi.test.ts --update`
- `rtk pnpm --filter @phalanxduel/server typecheck`
- `rtk pnpm docs:site-flow`
- `rtk ./bin/check`

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
