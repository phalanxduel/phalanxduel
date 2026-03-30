---
id: TASK-120
title: Automate SDK/Client Stub Generation from Specs
status: To Do
assignee:
  - '@generalist'
created_date: '2026-03-29 22:15'
updated_date: '2026-03-30 22:46'
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

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
