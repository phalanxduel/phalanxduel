---
id: TASK-345.05
title: Deploy and Verify Production MCP Service Boundaries
status: To Do
assignee: []
created_date: 2026-07-14 00:17
updated_date: '2026-10-30T21:15:00Z'
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

## Comments

<!-- COMMENTS:BEGIN -->
author: Codex
created: 2026-10-30T13:43:00Z

---

2026-10-30 operations audit: the public MCP health hostname failed DNS resolution (`curl` exit 6). Read-only Fly app status inspection could not proceed because the Fly CLI session has expired. This task remains To Do; resolve the deployment/access blocker through the approved Fly account path, then verify public tool inventory and private admin boundary against docs/ops/production-support-contract.md. No credentials were accessed or changed.

---

created: 2026-10-30T21:15:00Z

---

2026-10-30 recheck: the support contract's canonical public MCP Fly hostname phalanxduel-mcp-public.fly.dev failed DNS resolution for /health and /mcp probes (curl exit 6). The unrelated mcp.phalanxduel.com alias is not present in active repo configuration. Fly CLI/account access and deployment remain unavailable due the billing block; no credentials were accessed and no service configuration was mutated.

---
<!-- COMMENTS:END -->
