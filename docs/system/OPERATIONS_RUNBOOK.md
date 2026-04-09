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
rtk pnpm verify:quick
rtk pnpm verify:all
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

### 2.4 Active-Match Deployment Semantics

Current production promotions use Fly.io remote source deploys. Treat each
promotion or rollback as a rolling app restart with possible client reconnects,
not as a seamless no-disconnect hot swap.

Supported operator expectations:

- match state remains authoritative in persisted server storage during an app
  restart
- a player can rejoin an in-progress match after a server restart using the
  persisted player identity
- the original reconnect deadline survives the restart; restarting the app does
  not grant a fresh reconnect window
- rollback to the previous Fly release restores the previous application code
  when persisted state and schema remain compatible

Unsupported assumptions:

- browsers remaining continuously connected through deploys or rollbacks
- rollback automatically rewinding match state, transaction history, or schema
- safely returning to an older app version after destructive or incompatible
  schema changes without a separate database recovery step

## 3. Deployment Debugging

If a deployment succeeds but the application fails to load or behaves incorrectly, use the following techniques to identify the root cause.

### 3.1 Monitoring Logs

The first step is always to check the logs. Use the `--config` flag to ensure you are looking at the correct environment.

```bash
# Continuous tailing (best for watching startup)
fly logs --config fly.staging.toml

# View recent logs without tailing
fly logs --config fly.staging.toml --no-tail

# Watch logs for a specific machine ID
fly logs --machine <id> --app phalanxduel-staging
```

### 3.2 Common Startup Errors

| Error | Root Cause | Resolution |
| :--- | :--- | :--- |
| `ERR_MODULE_NOT_FOUND` | Missing dependency in the production image. | Move the package from `devDependencies` to `dependencies` in the root `package.json`. |
| `PostgresError: relation "..." does not exist` (42P01) | Pending database migrations. | Verify `release_command` in `fly.toml` or run migrations manually via SSH. |
| `Health check failed` | App crashed or didn't bind to `0.0.0.0:3001`. | Check logs for stack traces or port binding errors. |

### 3.3 Interactive Debugging (Fly SSH)

Use `fly ssh console` to inspect the live container environment.

```bash
# Open an interactive shell
fly ssh console --config fly.staging.toml

# Check if migration files exist in the container
ls -R /app/server/drizzle

# Run a one-off ESM script using Node.js
# Note: You must use --input-type=module and provide absolute paths to node_modules
fly ssh console --app phalanxduel-staging -C "node --input-type=module -e \"import postgres from './server/node_modules/postgres/src/index.js'; ...\""
```

### 3.4 Database Migration Triage

If migrations are failing or appear skipped:

1.  **Check applied migrations**:
    ```bash
    # Run the internal check script via SSH
    fly ssh console --app phalanxduel-staging -C "node server/dist/db/check-migrations.js"
    ```
2.  **Manually trigger migrations**:
    ```bash
    # Run the migration script directly
    fly ssh console --app phalanxduel-staging -C "node server/dist/db/migrate.js"
    ```
3.  **Verify table existence**:
    Use the `node -e` approach in section 3.3 to query `information_schema.tables`.

### 3.5 Build Context Issues

If files present locally are missing in the container:
1.  Check `.dockerignore` to ensure they aren't being excluded.
2.  Verify the `COPY` commands in the `Dockerfile`.
3.  Ensure the files are tracked by Git (Fly builds often use the Git context).

---

## 4. Incident Response (Triage & Resolution)

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
   scoped to that match. Prefer filters that combine:
   - `match.id="<match-id>"`
   - `qa.run_id="<playthrough-id>"` when the issue came from a simulator
   - `ws.session_id="<socket-session-id>"` to isolate one reconnect cycle
   - `ws.reconnect_attempt>0` to distinguish reconnect loops from healthy play
   - `name="game.match"` when you need the stable browser root span for one
     simulated game

   Query caveat:
   Tempo span search with the attributes above is the authoritative operator
   surface for one match. Grafana dashboards and service-structure views are
   useful supporting tools for topology and trend analysis, but they may omit
   or reshape edges based on sampling and therefore should not be treated as
   the sole source of truth for match-level investigation.

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

1. Confirm the blast radius with `/health`, `/ready`, logs, and telemetry. If
   live matches are affected, assume clients may need to reconnect and that the
   original reconnect deadline is still in force.
2. Roll back immediately to the previous release on Fly.io:

   ```bash
   fly deploy --rollback
   ```

3. Verify the rollback result:

   ```bash
   curl -s https://play.phalanxduel.com/health | jq .
   curl -s https://play.phalanxduel.com/ready | jq .
   fly logs --app phalanxduel-production
   ```

4. If rollback fails, locate the last known-good SHA in GitHub Actions and
   deploy the pinned image explicitly:

   ```bash
   fly deploy --image registry.fly.io/phalanx-duel:<stable-sha>
   ```

5. If the incident is schema-related, stop here and use the migration recovery
   procedure before attempting another app-level rollback.

#### Active Match Restart Recovery

**Symptom**: A deploy, restart, or instance replacement drops sockets while
players are in a live match.

Resolution:

1. Verify whether the match still exists and whether recent actions persisted.
2. Tell affected players to reconnect or refresh promptly. Rejoin is supported
   with the persisted player identity while the existing reconnect window has
   not expired.
3. Treat the original reconnect deadline as authoritative. A restart does not
   reset the two-minute forfeit timer.
4. If the reconnect deadline has already expired, treat the resulting forfeit as
   expected behavior rather than a separate recovery failure.
5. If reconnect fails despite healthy persistence, preserve the match ID,
   player ID, and telemetry identifiers and escalate as a product bug.

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
4. Do not rely on Fly release rollback alone when the incident involves an
   incompatible schema or destructive migration. App rollback does not restore
   the database.

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
