# Production Deployment Checklist

This is the canonical operator-facing deployment checklist for Phalanx Duel.
Use it with:

- `docs/operations/CI_CD_PIPELINE.md` for the automation flow
- `docs/system/OPERATIONS_RUNBOOK.md` for rollback and incident response
- `.github/workflows/pipeline.yml`, `fly.staging.toml`, and
  `fly.production.toml` as the live configuration truth

The older staging/Fly notes in `docs/deployment/` remain only as compatibility
history; use the canonical docs above for current operator guidance.

## Pre-Deployment

- [ ] `rtk ./bin/check` passes locally
- [ ] required env/secrets are present and audited:
  - `rtk pnpm env:audit:staging`
  - `rtk pnpm env:audit:production`
- [ ] schema/migration changes are understood and safe to promote
- [ ] staging is the next target; do not skip directly to production
- [ ] rollback owner and procedure are clear before promotion
- [ ] active-match impact is understood: deploys and rollbacks may drop sockets,
      and reconnect continues under the original timeout window rather than a
      fresh one
- [ ] unsupported rollback assumptions are ruled out: no destructive migration,
      no schema-incompatible downgrade, and no expectation of automatic match
      rewind

## Staging Deployment

Preferred path:

1. Push the reviewed change to `main`.
2. Let `.github/workflows/pipeline.yml` run tests.
3. Let the workflow deploy staging with:

   ```bash
   flyctl deploy --app phalanxduel-staging --config fly.staging.toml --remote-only
   ```

Manual repo-native path when needed:

```bash
rtk pnpm deploy:run:staging
```

Verify staging:

```bash
curl -s https://phalanxduel-staging.fly.dev/health | jq .
curl -s https://phalanxduel-staging.fly.dev/ready | jq .
fly logs --app phalanxduel-staging
```

Staging checklist:

- [ ] `/health` returns `status: ok`
- [ ] `/ready` returns `ready: true`
- [ ] no obvious startup, migration, or auth errors in logs
- [ ] changed gameplay/admin/operator paths were smoke-tested

## Production Promotion

Production releases are gated by manual approval in GitHub Actions.

1. Review the successful staging deploy.
2. Approve the `production` environment in the pipeline.
3. Let the workflow run:

   ```bash
   flyctl deploy --app phalanxduel-production --config fly.production.toml --remote-only
   ```

Manual repo-native path when needed:

```bash
rtk pnpm deploy:run:production
```

Verify production:

```bash
curl -s https://play.phalanxduel.com/health | jq .
curl -s https://play.phalanxduel.com/ready | jq .
fly logs --app phalanxduel-production
```

Production checklist:

- [ ] `/health` returns `status: ok`
- [ ] `/ready` returns `ready: true`
- [ ] no immediate ERROR spike in logs or telemetry
- [ ] admin and support-critical paths still work if touched
- [ ] if live matches were active, reconnect/rejoin behavior was spot-checked
      and any forced forfeits were consistent with the pre-existing reconnect
      deadline

## Rollback Triggers

Rollback immediately if any of these appear after promotion:

- core gameplay or authentication is broken
- readiness fails repeatedly
- migration errors block startup
- error rate or latency spikes materially above baseline

Rollback commands:

```bash
fly releases --app phalanxduel-production
fly releases rollback --app phalanxduel-production
curl -s https://play.phalanxduel.com/health | jq .
```

Rollback and recovery checklist:

- [ ] confirm whether the incident is app-only or schema/data-related before
      relying on release rollback
- [ ] after rollback, re-check `/health`, `/ready`, and production logs
- [ ] if active matches were interrupted, instruct players to reconnect promptly
      using the existing session identity
- [ ] treat reconnect timeout expiry as expected behavior; rollback does not
      reset the reconnect window
- [ ] if schema compatibility is in doubt, stop writes and use the runbook's
      migration recovery procedure instead of repeated app rollbacks

## Canonical References

- `docs/operations/CI_CD_PIPELINE.md`
- `docs/system/OPERATIONS_RUNBOOK.md`
- `docs/system/ENVIRONMENT_VARIABLES.md`
- `docs/system/SECRETS_AND_ENV.md`
