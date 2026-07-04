---
id: TASK-341
title: Agent Integration and Operational Guardrail Hardening
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-04 14:22'
updated_date: '2026-07-04 14:29'
labels:
  - agent-integration
  - ops
dependencies: []
documentation:
  - AGENTS.md
  - CLAUDE.md
  - docs/agents/backlog-best-practices.md
  - docs/tutorials/ai-agent-workflow.md
  - docs/testing.md
priority: medium
ordinal: 183800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve Codex/agent integration by making relevant instruction files auditable, aligning Backlog Icebox status with tooling/config, separating repo health from workstation service health, and reducing generated artifact noise. Godot/V2 remains iceboxed unless explicitly reactivated.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Relevant agent instruction files, including CLAUDE.md when present locally, are checked for stale active-task and architecture guidance.
- [x] #2 Backlog status configuration is validated so task statuses such as Icebox are recognized consistently by repo-local checks.
- [x] #3 A repo-local audit command reports active Backlog work, dirty generated artifacts, instruction drift, and distinguishes project-blocking health from workstation service noise.
- [x] #4 Generated Playwright report output is either ignored or explicitly documented as source-controlled evidence so normal verification does not leave ambiguous dirtiness.
- [x] #5 Verification commands for the new guardrails are documented and pass locally.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect existing package scripts, CI verification scripts, gitignore/report-output policy, and agent documentation surfaces.
2. Add a repo-local agent audit script that reports active Backlog state, instruction drift including local CLAUDE.md, Backlog status/config drift, generated Playwright report dirtiness, and service-health classification without treating workstation-only failures as project blockers.
3. Wire the audit into package scripts and documentation so agents have a canonical command.
4. Clean generated Playwright report policy so normal verification dirtiness is no longer ambiguous.
5. Run focused validation for the new script and broader project checks as needed; update acceptance criteria and notes as evidence lands.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented `pnpm agent:audit` via `scripts/agent-audit.ts`. The audit reports active Backlog state, instruction drift across relevant agent files including ignored local CLAUDE.md when present, Backlog status/config drift, generated QA artifact dirtiness, and service-health classification that distinguishes project-blocking, container-verification-blocking, and workstation-only failures. Added `Icebox`/`To Do` status support in backlog config, documented the command in `docs/testing.md`, added explicit AGENTS.md guidance that Godot/V2 is iceboxed and browser client remains active, and changed `playwright-report/` to ignored disposable output with the tracked HTML report removed from the index. Verification: `rtk pnpm agent:audit` passes with only non-blocking warnings while TASK-341 is in progress and workstation services are degraded; `rtk pnpm lint`, `rtk pnpm -r typecheck`, `rtk pnpm lint:md`, `rtk pnpm exec prettier --check .`, and `rtk pnpm check` all passed.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
