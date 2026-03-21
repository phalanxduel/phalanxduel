# Phalanx Duel — Operations Runbook

This document is the canonical source for supporting the Phalanx Duel production system. It covers health monitoring, standard deployment procedures, and incident response.

---

## 1. Health Monitoring

### 1.1 Automated Checks
The system is monitored via Fly.io health checks and Sentry.
*   **Lobby/API**: `GET /health` (Connectivity) and `GET /ready` (Database availability).
*   **Performance**: Monitored via OpenTelemetry. Sub-20ms turn application is the p50 target.

### 1.2 Manual Diagnostics
Run the following to check the local/remote environment:
```bash
rtk pnpm verify:quick  # Fast build/lint/typecheck
rtk pnpm verify:all    # Full suite including tests
```

### 1.3 Docker-Based Verification (QA Mode)
To run the full playthrough testing suite in a clean, containerized environment:
```bash
bin/qa/docker-verify
```
This command builds the application using the `dev` stage, boots a local Postgres instance, and executes the 12-scenario playthrough matrix automatically.

---

## 2. Standard Deployment

### 2.1 Pre-Deployment
Ensure all local checks pass:
```bash
rtk pnpm verify:all
```

### 2.2 Staging Deployment
Automated via GitHub Actions on push to `main`. Manual trigger:
```bash
APP_ENV=staging bash scripts/release/deploy-fly.sh
```

### 2.3 Production Promotion
1.  Verify staging health via `https://phalanxduel-staging.fly.dev/health`.
2.  Trigger the "Promote: Production" workflow in GitHub Actions.

---

## 3. Incident Response (Triage & Resolution)

### 3.1 Severity Levels

| Level | Description | Action |
| :--- | :--- | :--- |
| **SEV-1** | Core gameplay broken / Database down. | Immediate rollback and scale count check. |
| **SEV-2** | Ranked play / Auth broken. | Rotate secrets or check migration status. |
| **SEV-3** | UI bugs / Spectator lag. | Triage in Sentry for next release. |

### 3.2 Common Procedures
Refer to [docs/operations/INCIDENT_RUNBOOKS.md](../operations/INCIDENT_RUNBOOKS.md) for step-by-step guides on:
*   **Stuck Match Recovery**
*   **Deployment Rollback**
*   **Database Migration Triage**
*   **Secret Exposure Response**

---

## 4. Secret & Environment Management

### 4.1 Syncing Secrets
Use the unified utility to push local secret overrides to Fly.io or GitHub:
```bash
# Push to Fly.io Production
tsx scripts/maint/sync-secrets.ts bootstrap production
```

### 4.2 Required Secrets
*   `DATABASE_URL`: Neon/Postgres connection string.
*   `JWT_SECRET`: HS256 signing key.
*   `FLY_API_TOKEN`: Deployment authorization.
*   `SENTRY_AUTH_TOKEN`: Artifact upload authorization.

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
