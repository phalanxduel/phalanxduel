# Client Agent Guidance

Use this directory for runnable external clients and platform-specific reference
implementations. Keep generated code in `sdk/`; keep human-shaped client apps
in `clients/`.

## Start Here

Before generating or writing a client implementation, read these canonical
surfaces in order:

1. [`AGENTS.md`](../AGENTS.md) for repo-wide workflow and verification rules.
2. [`clients/README.md`](./README.md) for the `clients/` vs `sdk/` boundary.
3. [`docs/tutorials/developer-guide.md`](../docs/tutorials/developer-guide.md) for
   local commands, runtime URLs, and SDK regeneration guidance.
4. [`docs/architecture/principles.md`](../docs/architecture/principles.md) for the
   server-authoritative model and dependency boundaries.
5. [`docs/gameplay/rules.md`](../docs/gameplay/rules.md) for gameplay semantics and phase rules.
6. [`shared/src/schema.ts`](../shared/src/schema.ts) for the authoritative
   contract source.

If you need endpoint behavior details beyond the generated spec, inspect the
matching server route implementation under [`server/src/routes/`](../server/src/routes/).

## Stub Generation Workflow

The repo-native SDK generation path is:

```bash
pnpm openapi:gen
pnpm sdk:gen
```

What these commands do:

- `pnpm openapi:gen` refreshes the canonical OpenAPI artifact at
  `docs/api/openapi.json`.
- `pnpm sdk:gen` regenerates the machine-derived SDK outputs under `sdk/`.

Agents creating a client should treat these artifacts as inputs:

- REST source of truth: `docs/api/openapi.json`
- Shared JSON Schema snapshots: `shared/schemas/*.schema.json`
- Shared contract source: `shared/src/schema.ts`

Do not hand-edit generated files under `sdk/`. Regenerate them, then build the
client implementation in `clients/<platform>/...` on top of those outputs.

## Context Sources To Consult

When generating a new client, connect to these repo surfaces for context:

- `@phalanxduel/shared`
  Why: canonical Zod schemas, action unions, view models, event payloads,
  replay-visible types, and generated JSON Schemas live here.
- `@phalanxduel/server`
  Why: route shapes, response semantics, auth expectations, and current public
  transport surfaces are implemented here.
- `docs/gameplay/rules.md`
  Why: valid action timing is phase-dependent, and schema-valid actions can
  still be semantically illegal.
- `docs/architecture/principles.md`
  Why: explains the client/server split, fog-of-war boundaries, and why clients
  must treat the server as authoritative.

If a generated client needs gameplay examples, the nearest runnable analog is
[`clients/go/duel-cli/`](./go/duel-cli/).

## Schemas Client Generators Must Account For

At minimum, a generated or hand-written client implementation must account for
these schema families:

- REST API surface from `docs/api/openapi.json`
  Includes create/list/log/replay/simulate endpoints and their request/response
  bodies.
- `GameViewModelSchema` and `TurnViewModelSchema`
  These are the core read models a client presents to a player or spectator.
- `ActionSchema`
  This is a discriminated union. Treat it as phase-sensitive, not just
  shape-valid.
- `ErrorResponseSchema`
  REST and WebSocket flows both use structured error payloads; do not reduce
  errors to raw strings.
- `ClientMessageSchema` and `ServerMessageSchema`
  These define the WebSocket protocol envelopes for create/join/rejoin/watch,
  gameplay actions, match errors, and state/view-model pushes.
- `WsTelemetrySchema`
  Simulator-driven or observability-aware clients may need to propagate
  `traceparent`, `tracestate`, `baggage`, `qaRunId`, `sessionId`,
  `reconnectAttempt`, and `originService`.

## WebSocket Guidance

The WebSocket endpoint is `ws://127.0.0.1:3001/ws` locally.

Even if a client is primarily REST-generated, it must still model the current
WebSocket message contracts from `shared/src/schema.ts` and
`shared/schemas/{client-messages,server-messages}.schema.json` when the client
needs live gameplay, match join, reconnect, or spectator flows.

The repo-local AsyncAPI artifact is now tracked at `docs/api/asyncapi.yaml`.
Treat the AsyncAPI document, shared schema source, and WebSocket tests as a
single contract set:

- [`docs/api/asyncapi.yaml`](../docs/api/asyncapi.yaml)
- [`shared/src/schema.ts`](../shared/src/schema.ts)
- [`shared/schemas/client-messages.schema.json`](../shared/schemas/client-messages.schema.json)
- [`shared/schemas/server-messages.schema.json`](../shared/schemas/server-messages.schema.json)
- [`server/tests/ws.test.ts`](../server/tests/ws.test.ts)

## Reliability Contract For Live Clients

Clients that support live gameplay over `/ws` must account for the transport
reliability layer, not just the gameplay messages:

- Use `msgId` on reliable outbound gameplay/session messages and retain them
  until the peer responds with `ack`.
- Treat duplicate delivery as possible after reconnect. The server may replay a
  cached response for a previously processed `msgId`.
- Implement both native WebSocket liveness and application-level `ping`/`pong`
  handling.
- Preserve reconnect identity with `matchId` and secret `playerId`, and issue
  `rejoinMatch` before replaying pending gameplay actions after reconnect.
- Surface transport lifecycle state to the UI or application layer so inputs
  can be disabled while the connection is degraded.

The browser client in `client/` is the current canonical implementation of this
behavior. New or upgraded clients under `clients/` should match that contract
and add client-local tests for reconnect, ACK, and replay semantics.

## Implementation Guardrails

- Keep generated SDK code in `sdk/` and client-specific wrappers/apps in
  `clients/`.
- Prefer using the generated SDK for REST calls instead of re-implementing
  request/response types by hand.
- Do not assume undocumented fields are stable just because they exist in
  runtime traffic; derive contracts from canonical schemas.
- Preserve server authority and fog-of-war boundaries. A client may render
  `validActions`; it must not invent game logic locally.
- When a client needs a new public field or transport shape, update the
  canonical shared schema or server contract first instead of patching the
  client in isolation.

## Verification Expectations

For client-generation or client-implementation work under `clients/`, run the
smallest checks that prove the artifact chain still works:

```bash
pnpm openapi:gen
pnpm sdk:gen
pnpm check:quick
pnpm go:clients:check
```

If the change crosses package boundaries, modifies generated artifacts, or
changes runtime contract behavior, use the full repo gate:

```bash
./bin/check
```
