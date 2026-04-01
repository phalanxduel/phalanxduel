---
id: TASK-120
title: Automate SDK/Client Stub Generation from Specs
status: In Progress
assignee:
  - '@codex'
created_date: '2026-03-29 22:15'
updated_date: '2026-04-01 04:50'
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
- [ ] #1 #1 Set up a workflow to generate strongly typed client stubs for TypeScript and Go from OpenAPI/AsyncAPI specs.
- [ ] #2 #2 The generated SDK must include models for the new View Model and all updated REST/WebSocket payloads.
- [ ] #3 #3 Provide a 'Client Hello' example in Go that connects to a match and prints the validActions from the ViewModel.
- [ ] #4 #4 Publish the generated SDKs as distinct artifacts.
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
- `clients/go/reference-cli/main.go` now performs a real WebSocket create/join
  flow against `/ws`, waits for the first `gameState`, and prints the
  `validActions` exposed by the ViewModel.
- `.github/workflows/pipeline.yml` now generates SDKs in CI and uploads `sdk-go`
  and `sdk-ts` as distinct artifacts.
- A remaining repo gap is that `docs/api/asyncapi.yaml` is still absent even
  though the server publishes `/docs/asyncapi.yaml` and older tasks refer to the
  artifact. The current SDK generation flow therefore uses the canonical shared
  WebSocket JSON Schemas directly rather than an AsyncAPI wrapper document.
<!-- SECTION:NOTES:END -->

## Verification

- `rtk pnpm sdk:gen`
- `rtk go mod tidy` (from `clients/go/reference-cli`, escalated for Go build cache access)
- `rtk go build ./...` (from `clients/go/reference-cli`, escalated for Go build cache access)
- `rtk pnpm --filter @phalanxduel/server test -- tests/ws.test.ts`
- `rtk pnpm exec eslint --no-ignore scripts/gen-sdk.ts`
- `rtk pnpm exec prettier --check scripts/gen-sdk.ts package.json .github/workflows/pipeline.yml sdk/ts/README.md sdk/go/README.md sdk/ts/ws/README.md sdk/go/ws/README.md`

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
