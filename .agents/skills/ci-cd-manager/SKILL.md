---
name: ci-cd-manager
description: Management of the CI/CD pipeline, deployments, and verification cycles. Use when committing code, pushing to main, monitoring GitHub Actions runs, or coordinating staging/production deployments. Ensures high transparency by providing live links and status summaries.
---

# CI/CD Manager Skill

This skill governs how agents interact with the delivery pipeline, ensuring that every code change is properly gated, monitored, and reported.

## Core Responsibilities

1.  **Gated Commits**: Ensure `rtk pnpm check` or `rtk pnpm verify:full` passes locally before pushing.
2.  **Live Monitoring**: Track GitHub Actions runs in real-time and provide the USER with direct links.
3.  **Deployment Verification**: Confirm successful deployment to staging (`phalanxduel-staging.fly.dev`) or production.
4.  **Release Semantics**: Report the current source-based Fly deploy path accurately, including manual production approval and rollback limits.
5.  **Environment Integrity**: Maintain the split between local "heavyweight" verification (playthroughs) and remote "lightweight" CI.

## Operating Rules

- **Prefix all commands with `rtk`** (token compression).
- **Never use `--no-verify`**. Respect Husky and local pre-push hooks.
- **Always provide the GHA Link**: Immediately after pushing, find the run ID and provide the URL.
- **Sequential Testing**: Server tests share a single database; never enable parallelism in CI.
- **OTel Isolation**: OTel must be disabled in CI unless a collector is explicitly configured.
- **Current Runtime Deploy Path**: The pipeline builds and pushes GHCR images, but current Fly.io staging/production jobs deploy from source with `flyctl --remote-only`. Do not claim strict "same immutable image promoted from staging" behavior until the canonical docs say that has changed.
- **Active Match Semantics**: Treat deploys and rollbacks as rolling app restarts. Clients may need to reconnect; the original reconnect deadline remains authoritative.
- **Rollback Limit**: App rollback does not rewind schema, transaction history, match state, or destructive migrations. Use the runbook for schema/data incidents.
- **MCP Deployment Is Separate**: MCP public/admin apps deploy via `mcp/fly.*.toml`; they are not part of the main pipeline promotion flow.

## Common Workflows

### 1. The "Commit & Push" Loop
When the user says "commit" or you finish a task:
1.  Stage changes: `rtk git add .`
2.  Commit with a descriptive message: `rtk git commit -m "..."`
3.  Push to main: `rtk git push origin main`
4.  **Immediately** fetch the GHA run ID: `gh run list --limit 1`
5.  Report the Link to the user.

### 2. Monitoring a Run
If a run is in progress:
- Watch status: `gh run watch <ID>`
- View specific job logs if it fails: `gh run view <ID> --job "Test and Lint" --log`

### 3. Deploying to Staging/Production
Deployments are triggered automatically by the `pipeline.yml` on push to `main`.

- Staging: source deploy via `fly.staging.toml` after main-branch CI/build succeeds.
- Production: manual GitHub Environment approval, then source deploy via `fly.production.toml`.
- Verify staging:
  `rtk curl -sf https://phalanxduel-staging.fly.dev/health`
- Verify production:
  `rtk curl -sf https://play.phalanxduel.com/health`

When reporting a release, include whether staging deployed, whether production approval is pending or complete, and whether active-match reconnect implications matter for the change.

## Helper CLI Patterns

```bash
# Find the latest run for the current branch
gh run list --workflow pipeline.yml --branch main --limit 1 --json databaseId,url,status,conclusion

# View failures in a specific job
gh run view <ID> --job "Test and Lint" --log | grep "FAIL" -A 10

# Manually trigger a workflow (if needed)
gh workflow run pipeline.yml
```

## Relevant Documentation
- [`docs/system/delivery-pipeline.md`](../../../docs/system/delivery-pipeline.md): The canonical "One True Way" for this project's delivery.
- [`docs/deployment.md`](../../../docs/deployment.md): Current staging/production deployment semantics and MCP deployment notes.
- [`docs/ops/deployment-checklist.md`](../../../docs/ops/deployment-checklist.md): Operator checklist for pre-deploy, staging, production, and rollback.
- [`docs/ops/runbook.md`](../../../docs/ops/runbook.md): Incident, rollback, migration, and active-match recovery procedures.
- [`AGENTS.md`](../../../AGENTS.md): The global project guardrails.
