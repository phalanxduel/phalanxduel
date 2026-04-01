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
- `clients/go/reference-cli/main.go` proves the generated Go client can talk to
  the API, but it currently fetches defaults and the card manifest only. It
  does not join a match or print `validActions` from a ViewModel.
- No repo-local evidence was found that SDK artifacts are published outside the
  repository, so AC #4 remains open.

Status stays `To Do` because the repo contains meaningful partial progress but
does not yet satisfy AC #3 or AC #4.
<!-- SECTION:NOTES:END -->

## Verification

- `package.json` contains `sdk:gen` pointing at `scripts/gen-sdk.ts`.
- `scripts/gen-sdk.ts` generates both `sdk/go` and `sdk/ts/client`.
- Generated SDK artifacts are present under `sdk/go/` and `sdk/ts/client/`.
- `clients/go/reference-cli/main.go` exists, but currently demonstrates
  defaults and manifest discovery rather than match join plus ViewModel
  `validActions`.

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
