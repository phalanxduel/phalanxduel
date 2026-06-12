---
name: phalanx-production-ops
description: Production and staging operations workflow for Phalanx Duel. Use for deployments, rollbacks, health checks, readiness checks, incidents, stuck matches, active-match restart recovery, Fly.io triage, environment audits, production promotion, staging validation, MCP app deployment, admin operations, or when Codex is asked whether production is healthy.
---

# Phalanx Production Ops

Use this skill for operator work. Production actions should be observable,
reversible where possible, and grounded in the canonical runbooks.

## Start Here

Read the current operator docs before acting:

1. `docs/ops/runbook.md`
2. `docs/ops/deployment-checklist.md`
3. `docs/deployment.md`
4. `docs/reference/environment-variables.md`
5. `docs/reference/admin.md` when admin UI or flags are involved

## Health Triage

Start read-only:

```bash
rtk curl -s https://phalanxduel-staging.fly.dev/health
rtk curl -s https://phalanxduel-staging.fly.dev/ready
rtk curl -s https://play.phalanxduel.com/health
rtk curl -s https://play.phalanxduel.com/ready
```

Then inspect logs, workflow state, or telemetry based on the failing surface.
For local readiness, prefer:

```bash
rtk pnpm verify:quick
rtk ./bin/check
```

## Deployment Semantics

Remember the current release model:

- staging deploys automatically from `main`
- production promotion is manually approved in GitHub Actions
- Fly deploys behave like rolling app restarts
- active sockets may drop; rejoin should use persisted identity
- rollback does not rewind schema, transaction history, or match state
- destructive or incompatible schema changes require DB recovery planning

## Incident Rules

- SEV-1 core gameplay or DB outage: confirm blast radius, then rollback or
  scale-stop according to the runbook.
- Stuck match: verify admin state, transaction log, and telemetry before
  considering cleanup.
- Migration incident: stop writes before repeated app-level rollback attempts.
- Active-match restart: preserve match ID, player ID, and telemetry IDs.

## Safety

Do not run mutating production commands, deploys, rollbacks, purge operations,
or secret rotations without explicit user approval unless the user already gave
that instruction for the current task.

Report exact commands, environment, observed health/readiness, and any rollback
or reconnect implications.
