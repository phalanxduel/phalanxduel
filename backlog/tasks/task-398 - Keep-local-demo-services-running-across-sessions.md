---
id: TASK-398
title: Keep local demo services running across sessions
status: Verification
assignee:
  - codex
created_date: '2026-11-10T04:03:00Z'
updated_date: '2026-11-10T04:29:00Z'
labels: []
dependencies: []
priority: medium
type: chore
ordinal: 272800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The pending local service changes are intended to preserve the demo stack when its launching terminal closes and make login startup reliable. Review and complete those changes using existing service controls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Daemonized services and the cockpit detach from terminal input and hangup signals.
- [x] #2 Demo start and restart honor the requested tmux mode with the existing daemon fallback.
- [x] #3 Login startup uses portable paths, bounded PostgreSQL readiness checks, and documented usage.
- [x] #4 Focused shell validation and the unified project check pass, or external blockers are recorded with evidence.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
L1 context brief: follow bin/phx-services daemon/tmux controls and bin/phx-demo-ctl readiness flow. Keep bin/autostart as the alias to phx-autostart. Main risks: minimal launchd PATH, tmux fallback, quoted arguments and working directories, terminal hangup behavior.
1. Use arrays and an explicit service working directory; launch detached processes with an ignored HUP trap, stdin /dev/null, and exec. Quote arrays for tmux.
2. Share demo startup between up/restart and document --tmux.
3. Use HOME/PNPM_HOME for login startup, validate prerequisites, retain the bounded PostgreSQL availability probe, and document use without modifying LaunchAgent registration.
4. Validate using isolated shell fixtures, shellcheck, and unified check; record environmental blockers. Commit locally; do not push while the required complete check remains blocked.

User pushed f57f2eac and 1dc34434 from a normal terminal. The pre-push quick gate passed; main Pipeline 42755082380 and Code Quality 42755082324 both succeeded. Treat earlier networking/PostgreSQL failures as limitations of this agent execution context, not confirmed host outages. Service implementation and behavior checks are complete and landed; remaining broad release/DB checks are separate evidence, not a reason to leave implemented service work To Do.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Validation: isolated fixtures outside the repository exercised server/client/admin/site daemon argument and working-directory handling (including spaces), actual SIGHUP survival, stdin EOF, tmux working-directory serialization, fallback without tmux, autostart dispatch, help without startup, 30-attempt database timeout, and demo up/restart with default, --tmux, and -t. Shell syntax passes. Focused shellcheck passes excluding pre-existing SC1091 (external sourced helper) and SC2086 (multi-PID kill sites); no new shellcheck findings. `pnpm verify:quick` passes after final code changes: workspace build, lint/actionlint, 24 database-isolation assertions, typecheck, committed docs, Markdown lint, formatting. `pnpm check` reached server tests after 163 shared and 422 engine tests passed, then the test wrapper reported PostgreSQL unavailable on localhost:5432. Separately client 267, admin 15, and MCP 8 tests pass (875 total non-server tests). Ambient DATABASE_URL was removed for all pnpm validation; server tests retained bin/maint/with-test-postgres.sh and never used a personal database. `zsvc start postgres` attempted normal service startup but launchctl returned 141 / Reentrancy avoided. Do not restart/reset the host database or modify platform configuration to bypass this. No login agent installed or changed. Remaining work: restore PostgreSQL reachability, rerun pnpm check, then push and record CI.

Cockpit fixture also passed actual SIGHUP survival and stdin EOF. The original nohup approach failed in the headless macOS execution context (`can't detach from console: Inappropriate ioctl for device`); the final ignored-HUP + exec implementation passed for all tested daemons and cockpit. Verification fixtures are local-only at /private/tmp/phx-service-check.py.

Main verification: https://github.com/phalanxduel/phalanxduel/actions/runs/42755082380 and https://github.com/phalanxduel/phalanxduel/actions/runs/42755082324 both passed on 1dc34434. Ready for review; no deployment triggered.
<!-- SECTION:NOTES:END -->
