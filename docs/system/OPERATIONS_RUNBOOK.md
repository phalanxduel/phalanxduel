# Phalanx Duel — Operations Runbook

This document is the canonical source for supporting the Phalanx Duel
production system. It covers health monitoring, standard deployment
procedures, and incident response.

---

## 1. Health Monitoring

### 1.1 Automated Checks
The system is monitored via Fly.io health checks plus OpenTelemetry signals
forwarded through collector boundaries to the centralized LGTM stack.
*   **Lobby/API**: `GET /health` (Connectivity) and `GET /ready` (Database availability).
*   **Performance**: Monitored via OpenTelemetry. Sub-20ms turn application is the p50 target.

### 1.2 Manual Diagnostics
Run the following to check the local/remote environment:
```bash
rtk pnpm check:quick
rtk pnpm check:ci
rtk ./bin/check
```

---

## 2. Standard Deployment

### 2.1 Pre-Deployment

Ensure all local checks pass:
```bash
rtk ./bin/check
```

Use `docs/deployment/DEPLOYMENT_CHECKLIST.md` for the operator checklist and
`docs/operations/CI_CD_PIPELINE.md` for the exact GitHub Actions promotion path.

### 2.2 Staging Deployment

Automated via GitHub Actions on push to `main`. Manual trigger:
```bash
rtk pnpm deploy:run:staging
```

### 2.3 Production Promotion
1. Verify staging health via `https://phalanxduel-staging.fly.dev/health`.
2. Trigger or approve the `Promote: Production` workflow in GitHub Actions.
3. Verify production health via `https://play.phalanxduel.com/health`.

---

## 3. Incident Response (Triage & Resolution)

### 3.1 Severity Levels

| Level | Description | Action |
| :--- | :--- | :--- |
| **SEV-1** | Core gameplay broken / Database down. | Immediate rollback and scale count check. |
| **SEV-2** | Ranked play / Auth broken. | Rotate secrets or check migration status. |
| **SEV-3** | UI bugs / Spectator lag. | Triage in Grafana/Tempo/Loki for next release. |

### 3.2 Common Procedures
#### Stuck Match Recovery

**Symptom**: Players report they cannot make a move, or the match appears
frozen despite stable connections.

Triage:

1. Verify the current match state in the admin surface.
2. Check `transaction_logs` for the affected `match_id` to confirm the most
   recent action was recorded.
3. Check Grafana/Tempo/Loki for `ActionError`, replay, or engine-crash signals
   scoped to that match.

Resolution:

1. If the client is stale but the server state is correct, ask players to
   hard-refresh.
2. If the persisted state is corrupted, retrieve the action stream and replay
   it locally to find the divergence point.
3. Only as an emergency last resort, remove the bad match record so connected
   players can exit the broken room cleanly.

#### Deployment Rollback

**Symptom**: Post-deployment error rates spike or core gameplay loops break.

Resolution:

1. Roll back immediately to the previous release on Fly.io:

   ```bash
   fly deploy --rollback
   ```

2. If rollback fails, locate the last known-good SHA in GitHub Actions and
   deploy the pinned image explicitly:

   ```bash
   fly deploy --image registry.fly.io/phalanx-duel:<stable-sha>
   ```

#### Database Migration Triage

**Symptom**: The server fails to start with migration or missing-column errors.

Resolution:

1. Verify the current schema/migration state from the server package:

   ```bash
   pnpm --filter @phalanxduel/server db:migrate
   ```

2. If a migration damaged live data, scale the app down to stop writes:

   ```bash
   fly scale count 0
   ```

3. Restore from a point-in-time backup in Neon or Fly Postgres, then redeploy
   the previous schema-compatible version.

#### Secret Exposure Response

**Symptom**: `JWT_SECRET`, `FLY_API_TOKEN`, or another privileged secret is
found in logs or committed to the repo.

Resolution:

1. Revoke the exposed Fly token immediately in the Fly dashboard.
2. Rotate the JWT secret:

   ```bash
   fly secrets set JWT_SECRET=<new-random-string>
   ```

   This invalidates existing sessions and forces re-authentication.

3. Rotate any exposed DSN or related secret at the upstream provider, then
   confirm the application reads the new value cleanly after restart.

---

## 4. Secret & Environment Management

### 4.1 Syncing Secrets
Use the unified utility to push local secret overrides to Fly.io or GitHub:
```bash
rtk pnpm env:push:production
```

### 4.2 Required Secrets
*   `DATABASE_URL`: Neon/Postgres connection string.
*   `JWT_SECRET`: HS256 signing key.
*   `FLY_API_TOKEN`: Deployment authorization.
*   `OTEL_UPSTREAM_OTLP_ENDPOINT`: Upstream OTLP intake for the collector
    helper when local forwarding is required.

---

## 5. Scaling & Resource Management

### 5.1 Manual Scaling
Scale the API servers:
```bash
fly scale count 2 --app phalanxduel-production
```

### 5.2 Match Cleanup
Matches are automatically cleaned up after 10 minutes of inactivity. To trigger manual cleanup (developer only):
*   Restart the server instances: `fly apps restart phalanxduel-production`.
