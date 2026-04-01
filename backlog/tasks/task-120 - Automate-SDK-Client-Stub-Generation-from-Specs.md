---
id: TASK-120
title: Automate SDK/Client Stub Generation from Specs
status: Human Review
assignee:
  - '@codex'
created_date: '2026-03-29 22:15'
updated_date: '2026-04-01 12:26'
labels:
  - api
  - automation
  - sdk
milestone: m-1
dependencies:
  - TASK-113
  - TASK-119
references:
  - /Users/mike/github.com/just3ws/lawnstarter-engineer-assessment
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
With the REST API fully documented (OpenAPI) and the WebSocket protocol formalized (AsyncAPI), the final step in API Completeness is to prove the decoupling by automatically generating a usable SDK or client stub. This proves that an external language or platform can ingest our documentation and build a complete game-playing interface.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 Set up a workflow to generate strongly typed client stubs for TypeScript and Go from OpenAPI/AsyncAPI specs.
- [x] #2 #2 The generated SDK must include models for the new View Model and all updated REST/WebSocket payloads.
- [x] #3 #3 Provide a 'Client Hello' example in Go that connects to a match and prints the validActions from the ViewModel.
- [x] #4 #4 Publish the generated SDKs as distinct artifacts.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Partial implementation is already present in the repo as of 2026-03-31, but the
task is not complete against its current acceptance criteria:

- `package.json` includes `sdk:gen`, and `scripts/gen-sdk.ts` generates Go and
  TypeScript SDKs from `docs/api/openapi.json`.
- Generated artifacts exist under `sdk/go/` and `sdk/ts/client/`, including
  `GameViewModel` and `validActions` models derived from the current OpenAPI
  surface.
- `scripts/gen-sdk.ts` now also generates WebSocket request and response models
  under `sdk/go/ws/` and `sdk/ts/ws/` from the canonical message schemas in
  `shared/schemas/`.
- The generator now normalizes the generated Go module path to
  `github.com/phalanxduel/game/sdk/go`, writes SDK README surfaces for the new
  TypeScript and Go WebSocket outputs, and keeps the generation entrypoint at
  `pnpm sdk:gen`.
- `clients/go/duel-cli/main.go` now performs a real WebSocket create/join flow
  against `/ws`, waits for the first `gameState`, and prints the `validActions`
  exposed by the ViewModel.
- The Go duel CLI has since been expanded into an interactive text client that
  can create human-vs-human duels, join from a match code or invite link, and
  start bot matches against the currently supported bot opponents.
- `.github/workflows/pipeline.yml` now generates SDKs in CI and uploads `sdk-go`
  and `sdk-ts` as distinct artifacts.
- `docs/api/asyncapi.yaml` has been restored as the tracked WebSocket contract,
  and `scripts/gen-sdk.ts` now resolves WebSocket message models from that
  AsyncAPI document instead of reading the shared message schemas directly.
- The native WebSocket transport now includes explicit `ack`, `ping`, and
  `pong` protocol messages in the shared schema and AsyncAPI surfaces so the
  generated SDKs expose the resilient transport envelope alongside gameplay
  messages.
- `client/src/connection.ts` now maintains a pending outbound queue keyed by
  `msgId`, uses exponential backoff with jitter, proactively reconnects on
  missed heartbeats, replays pending messages after reconnect, and automatically
  issues `rejoinMatch` when a saved player session exists.
- `server/src/app.ts` now acknowledges reliable client messages, replays cached
  responses for duplicate `msgId` deliveries, and adds application-level
  heartbeat handling so reconnect/replay has an idempotent server path.
- The canonical client guidance now treats runnable clients under `clients/` as
  first-class architecture surfaces rather than disposable examples, with an
  explicit reliability contract for `/ws` clients and a repo-level Go client
  verification hook.
- The canonical shared WebSocket client schema now requires `msgId` on all
  reliable gameplay/session messages (`createMatch`, `joinMatch`,
  `rejoinMatch`, `watchMatch`, `action`, and `authenticate`) so the machine
  contract matches the ACK/replay transport semantics already implemented by
  the browser client and server.
- The Go duel CLI now emits `msgId` on its current reliable WebSocket messages,
  and the WebSocket integration/security tests now automatically send `msgId`
  on reliable test traffic so the stricter public protocol is exercised in CI.
- `clients/go/duel-cli/ws_client.go` now gives the Go duel CLI a resilient
  native WebSocket transport with heartbeat watchdogs, exponential reconnect
  backoff with jitter, ACK-tracked pending replay, and automatic
  `rejoinMatch` before queued gameplay messages flush after reconnect.
- `clients/go/duel-cli/ws_client_test.go` now proves the critical Go client
  recovery scenarios: replaying an un-ACKed action after reconnect and not
  replaying an action once the server has ACKed it.
- Known remaining gap: the Go duel CLI now matches the browser client on core
  reconnect/ACK/replay semantics, but it still does not persist gameplay
  session identity across a full process restart and it does not yet attach
  the browser's richer WebSocket telemetry envelope.
<!-- SECTION:NOTES:END -->

## Verification

- `rtk pnpm sdk:gen`
- `rtk node --input-type=module -e "import { readFile } from 'node:fs/promises'; import { Parser } from '@asyncapi/parser'; const text = await readFile('docs/api/asyncapi.yaml', 'utf8'); const parser = new Parser(); const { document, diagnostics } = await parser.parse(text, { source: 'docs/api/asyncapi.yaml' }); console.log(JSON.stringify({ diagnostics: diagnostics.length, hasDocument: Boolean(document), messages: document?.components().messages().all().length ?? 0 }));"`
- `rtk pnpm go:clients:check`
- `rtk pnpm --filter @phalanxduel/server test -- tests/ws.test.ts`
- `rtk pnpm --filter @phalanxduel/client test -- tests/connection.test.ts tests/state.test.ts`
- `rtk pnpm exec eslint --no-ignore scripts/gen-sdk.ts`
- `rtk pnpm exec prettier --check scripts/gen-sdk.ts docs/api/asyncapi.yaml package.json .github/workflows/pipeline.yml sdk/ts/README.md sdk/go/README.md sdk/ts/ws/README.md sdk/go/ws/README.md`
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
