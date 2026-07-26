---
id: TASK-378
title: >-
  Claude Code skill/agent package for building compliant new Phalanx Duel
  clients
status: To Do
assignee: []
created_date: '2026-07-26 19:55'
labels:
  - dx
  - agents
  - clients
dependencies: []
references:
  - clients/AGENTS.md
  - docs/reference/client-compatibility.md
  - server/tests/client-compatibility.test.ts
priority: medium
type: chore
ordinal: 245800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
clients/AGENTS.md already has thorough prose guidance for building a new client (schema families, WS reliability contract, verification commands, context sources) but it's not packaged as an invokable Claude Code skill or agent definition. Package it as one or more of: a `/new-client` skill that walks the sdk:gen → implement → verify loop, and/or a dedicated agent type for adversarially verifying a new client implementation against docs/reference/client-compatibility.md's compatibility matrix and server/tests/client-compatibility.test.ts's structural checks.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
