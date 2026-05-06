---
title: "Client Compatibility"
description: "Supported browser, Go, and generated SDK client surfaces and their shared compatibility expectations."
status: active
updated: "2026-04-02"
audience: contributor
related:
  - docs/architecture/principles.md
  - docs/architecture/site-flow.md
  - docs/development.md
  - clients/README.md
  - clients/go/duel-cli/README.md
  - docs/api/asyncapi.yaml
  - docs/api/openapi.json
---

# Client Compatibility

Phalanx Duel supports three distinct client surfaces:

- The browser app in `client/` is the canonical first-party client.
- The Go duel CLI in `clients/go/duel-cli/` is a first-class runnable reference client.
- The generated SDKs in `sdk/go` and `sdk/ts/client` are contract artifacts for REST consumers, not full gameplay runtimes.

The server remains authoritative for gameplay state, validation, reconnect identity, and fog-of-war visibility on every surface.

## Compatibility Matrix

| Flow | Browser app | Go duel CLI | Generated REST SDKs |
| --- | --- | --- | --- |
| Discover defaults | `GET /api/defaults` | `GET /api/defaults` via `sdk/go` | Supported in `sdk/go` and `sdk/ts/client` |
| List joinable matches | Supported through public API contract | Supported through generated REST SDK after `sdk:gen` refresh | Supported in `sdk/go` and `sdk/ts/client` |
| Claim a player seat with REST | Supported through public API contract | Supported through generated REST SDK after `sdk:gen` refresh | Supported in `sdk/go` and `sdk/ts/client` |
| Create and join over WebSocket | Canonical path using `createMatch` and `joinMatch` | Supported through local WS transport code | Not provided by the REST SDKs |
| Rejoin after reconnect | Canonical path using `rejoinMatch`, `msgId`, `ack`, and replay | Supported through local WS transport code with pending replay | Not provided by the REST SDKs |
| Watch as spectator | Supported through `watchMatch` | Not currently implemented in the Go CLI UI | WS message models exist under `sdk/go/ws` and `sdk/ts/ws`, but no generated runtime transport is provided |
| Submit gameplay action over REST | Public server surface | Available to external consumers through generated REST SDKs | Supported in `sdk/go` and `sdk/ts/client` |
| Live gameplay over WebSocket | Canonical | Supported | Message models only; runtime transport is client-owned |

## Shared Contract Expectations

All supported client surfaces are expected to align on these rules:

- Matchmaking and REST bootstrap come from `docs/api/openapi.json`.
- Live gameplay, join, rejoin, watch, ACK, and heartbeat semantics come from `docs/api/asyncapi.yaml` plus the shared WebSocket schemas.
- `playerId` is a secret session identifier for rejoin and participant-bound REST actions. It is not public identity.
- Clients must treat `validActions` as server-derived hints, not local rules authority.
- Reconnect-capable clients must preserve `matchId` and `playerId`, send `rejoinMatch`, and replay only unacked reliable messages.

## Supported Architecture Boundary

Use the generated SDKs when you need typed REST access to the server contract.
Do not treat them as a replacement for the browser or Go runtime transport code.

- `sdk/go` and `sdk/ts/client` cover the HTTP contract.
- `sdk/go/ws` and `sdk/ts/ws` provide generated WebSocket message models.
- Runtime behaviors such as socket lifecycle, heartbeat timers, ACK tracking, reconnect backoff, and pending-message replay remain the responsibility of the runnable client implementation.

## Known Residual Gaps

- The browser client is still WebSocket-first for create, join, and watch flows even though the REST bootstrap endpoints are public and SDK-backed.
- The Go duel CLI does not currently expose spectator/watch UX.
- The generated SDKs do not include a full WebSocket runtime stack; they only provide typed message models for clients that implement their own transport.
- Compatibility verification today proves artifact parity and transport semantics, but not a single end-to-end matrix that drives browser, Go, and SDK consumers through the same live server scenario in one automated run.

## Verification

When the public client contract changes, validate the compatibility chain with:

```bash
rtk pnpm sdk:gen
rtk pnpm vitest run server/tests/openapi.test.ts server/tests/client-compatibility.test.ts
rtk pnpm go:clients:check
```
