---
id: TASK-341
title: Agent Integration and Operational Guardrail Hardening
status: Done
assignee:
  - '@codex'
created_date: '2026-07-04 14:22'
updated_date: '2026-07-05 00:29'
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
  - CODEX.md
modified_files:
  - AGENTS.md
  - CLAUDE.md
  - CODEX.md
  - KAIZEN_PARITY_PLAN.md
  - V3-DEVELOPMENT.md
  - V3-DIAGRAMS.md
  - archive/icebox-godot/KAIZEN_PARITY_PLAN.md
  - archive/icebox-godot/V3-DEVELOPMENT.md
  - archive/icebox-godot/V3-DIAGRAMS.md
  - docs/testing.md
  - scripts/agent-audit.ts
  - backlog/config.yml
  - backlog/tasks/task-12 - Face-Down-Card-Rules.md
  - backlog/tasks/task-14 - Heroical-Swap-Mechanics.md
  - backlog/tasks/task-17 - Per-Player-Card-Themes.md
  - .gitignore
  - docs/system/KNIP_REPORT.md
  - knip.json
  - package.json
  - pnpm-lock.yaml
  - bin/dock
  - bin/maint/docker-reset-stack.sh
  - bin/maint/postgres-bootstrap.sh
  - bin/maint/with-dev-postgres.sh
  - bin/maint/with-test-postgres.sh
  - admin/vitest.config.ts
  - bin/qa/cluster-verify.ts
  - scripts/ci/verify-integration-api.sh
  - scripts/dev-dashboard.ts
  - server/tests/failover.test.ts
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
1. Finish stabilization-only scope for TASK-341: agent instruction drift, backlog status alignment, generated artifact policy, and service-health classification.
2. Icebox active Backlog items that are feature/mechanics/theme work rather than v1.x platform stabilization.
3. Isolate stale Godot/V2/V3 migration context by marking non-active docs as historical/iceboxed or otherwise excluding them from future active agent context.
4. Run focused guardrail verification, then broader DoD verification where feasible: agent:audit, formatting/lint for changed guardrail files, test:run:all, build/lint/typecheck/schema/docs/rules checks as needed.
5. Update TASK-341 final notes and DoD checklist based on actual verification, then move it out of In Progress only if the stabilization baseline is clean.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented `pnpm agent:audit` via `scripts/agent-audit.ts`. The audit reports active Backlog state, instruction drift across relevant agent files including ignored local CLAUDE.md when present, Backlog status/config drift, generated QA artifact dirtiness, and service-health classification that distinguishes project-blocking, container-verification-blocking, and workstation-only failures. Added `Icebox`/`To Do` status support in backlog config, documented the command in `docs/testing.md`, added explicit AGENTS.md guidance that Godot/V2 is iceboxed and browser client remains active, and changed `playwright-report/` to ignored disposable output with the tracked HTML report removed from the index. Verification: `rtk pnpm agent:audit` passes with only non-blocking warnings while TASK-341 is in progress and workstation services are degraded; `rtk pnpm lint`, `rtk pnpm -r typecheck`, `rtk pnpm lint:md`, `rtk pnpm exec prettier --check .`, and `rtk pnpm check` all passed.

2026-07-04 follow-up audit found Codex-specific instruction drift: CODEX.md still described Godot 4.x as the primary UI even though CLAUDE.md/AGENTS.md and Backlog now icebox Godot/V2. Updated CODEX.md to name the React browser client as active and extended scripts/agent-audit.ts to include CODEX.md plus the stale Godot-primary wording in instruction drift checks. Verification: rtk pnpm agent:audit passed; rtk pnpm exec prettier --check CODEX.md scripts/agent-audit.ts passed; rtk pnpm exec eslint --no-ignore scripts/agent-audit.ts passed with existing security-plugin warnings only.

Completed stabilization/consolidation pass on 2026-07-04. Moved non-stabilization Backlog work TASK-12, TASK-14, and TASK-17 to Icebox using the Backlog CLI because the MCP schema can list Icebox but currently rejects editing status to Icebox. Isolated root Godot/V3 planning docs by moving historical content under archive/icebox-godot/ and leaving short root stubs that explicitly say the work is iceboxed. Reduced future context noise by ignoring deliberate docker-compose, godot, and undici findings in Knip. Verification evidence is captured in the final summary.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Stabilized the v1.x platform and agent integration baseline. Godot/V2/V3 migration context is now explicitly iceboxed across Codex/Claude guidance and root migration docs, with full historical material moved under archive/icebox-godot/ behind short root stubs. Non-stabilization backlog feature/design tasks TASK-12, TASK-14, and TASK-17 were moved to Icebox. The agent audit now checks CODEX.md for stale Godot-primary guidance, reports Backlog status/config drift, generated artifact status, and workstation service health without treating embed/o2 workstation warnings as project blockers.

Operational hardening includes guarded Postgres bootstrap consolidation, docker-compose command alignment, recursive test/typecheck wrapper fixes that exclude the root package, a failover test race fix, and Knip ignore cleanup so deliberate docker-compose/Godot/undici choices do not pollute future cleanup context. Generated docs/schema artifacts were refreshed.

Verification completed: rtk pnpm agent:audit passed; rtk pnpm exec prettier --check for changed guardrail/docs files passed; rtk pnpm exec eslint --no-ignore scripts/agent-audit.ts passed with existing security-plugin warnings only; rtk pnpm build passed; rtk pnpm lint passed; rtk pnpm run typecheck passed; rtk pnpm schema:check passed with sandbox escalation for tsx IPC; rtk pnpm docs:artifacts passed; rtk pnpm rules:check passed; rtk pnpm test:run:all passed with Docker/Colima escalation; rtk pnpm check passed through lint, DB isolation, typecheck, coverage, schema, rules, boundaries, contracts, property/perf/replay/playthrough/visual gates and failed only at the final docs freshness gate because generated docs artifacts were intentionally dirty before commit.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
