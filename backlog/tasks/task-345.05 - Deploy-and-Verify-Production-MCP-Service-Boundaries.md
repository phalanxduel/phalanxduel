---
id: TASK-345.05
title: Deploy and Verify Production MCP Service Boundaries
status: To Do
assignee: []
created_date: '2026-07-14 00:17'
updated_date: '2026-07-14 00:17'
labels:
  - production
  - mcp
  - security
dependencies:
  - TASK-345.04
documentation:
  - mcp/README.md
  - mcp/fly.public.toml
  - mcp/fly.admin.toml
  - docs/deployment.md
parent_task_id: TASK-345
priority: high
ordinal: 204800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Deliver the documented agentic production surface or formally retire it from the support contract. The preferred target is a public read-only MCP service and a private bearer-authenticated MCP-admin service, deployed independently with structural separation of tool inventories.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Public MCP has a production health endpoint and documented URL
- [ ] #2 Public MCP tool inventory contains no admin mutation tools
- [ ] #3 Private MCP-admin is not publicly routed and rejects missing or invalid bearer tokens
- [ ] #4 A controlled verification proves supported MCP read and gameplay paths
- [ ] #5 MCP deployment/version evidence is incorporated into operational verification
- [ ] #6 If either MCP tier is retired instead, all promises, configuration, and documentation for that tier are removed
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
