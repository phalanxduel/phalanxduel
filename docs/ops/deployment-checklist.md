# Production Deployment Checklist

This is the canonical operator-facing deployment checklist for Phalanx Duel.
Use it with:

- `docs/deployment.md` for the automation flow
- `docs/ops/runbook.md` for rollback and incident response
- `docs/ops/production-support-contract.md` for the required subsystem matrix
- `.github/workflows/pipeline.yml` and `fly.production.toml` as the executable
  configuration truth

Production is the only deployed game environment. Staging is retired. Older
staging/Fly notes under historical or archived documentation are not operator
instructions.

## Pre-Deployment

- [ ] `rtk ./bin/check` passes locally
- [ ] required env/secrets are present and audited:
  - `rtk pnpm env:audit:production`
- [ ] `phalanxduel-admin` has `DATABASE_URL`, the shared `JWT_SECRET`, and the
      shared `ADMIN_INTERNAL_TOKEN`; the game app has the same internal token
- [ ] schema/migration changes are understood and safe to promote
- [ ] the candidate GHCR image was built from the approved Git SHA
- [ ] test, adversarial-security, SDK, and image-build jobs are green
- [ ] rollback owner and procedure are clear before promotion
- [ ] active-match impact is understood: deploys and rollbacks may drop sockets,
      and reconnect continues under the original timeout window rather than a
      fresh one
- [ ] unsupported rollback assumptions are ruled out: no destructive migration,
      no schema-incompatible downgrade, and no expectation of automatic match
      rewind

## Production Promotion

Production releases are gated by manual approval in GitHub Actions.

1. Review the successful test, adversarial, SDK, and image-build jobs.
2. Confirm the image metadata matches the approved release SHA.
3. Approve the `production` environment in the pipeline.
4. Let the workflow promote the tested image:

   ```bash
   flyctl deploy --app phalanxduel-production --config fly.production.toml \
     --local-only --image phalanxduel-production:latest
   flyctl deploy --app phalanxduel-admin --config admin/fly.toml \
     --local-only --image phalanxduel-admin:latest
   ```

Manual repo-native path when needed:

```bash
rtk pnpm deploy:run:production
```

Verify production:

```bash
curl -s https://play.phalanxduel.com/health | jq .
curl -s https://play.phalanxduel.com/ready | jq .
curl -s https://phalanxduel-admin.fly.dev/health | jq .
curl -s https://phalanxduel-admin.fly.dev/ready | jq .
fly logs --app phalanxduel-production
fly logs --app phalanxduel-admin
```

Production checklist:

- [ ] `/health` returns `status: ok`
- [ ] `/ready` returns `ready: true`
- [ ] deployed version, build ID, and commit SHA match the approved release
- [ ] admin `/health` and `/ready` pass with the same commit SHA
- [ ] no immediate ERROR spike in logs; inspect telemetry only when the support
      contract says OTel is enabled
- [ ] `/health` reports `observability.otel_active: false` while the temporary
      OTel containment is active, and Fly has no `otel` process group
- [ ] anonymous `GET /admin-api/matches` on the admin host returns `401`
- [ ] a current administrator can log in and complete a harmless read
- [ ] any explicitly approved mutation produces a matching durable audit row
- [ ] legacy game-host `/admin` and `/admin/ab-tests` return `410`; `/api/admin/*`
      is absent
- [ ] every required subsystem in the Production Support Contract has current
      evidence; anything not tested is reported as `NOT_TESTED`
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

- `docs/deployment.md`
- `docs/ops/runbook.md`
- `docs/ops/production-support-contract.md`
- `docs/reference/environment-variables.md`
- `docs/configuration.md`
