# Phalanx Duel — Production Incident Runbooks

This document provides step-by-step procedures for resolving common production incidents.

---

## 1. Stuck Match Recovery

**Symptom**: Players report they cannot make a move, or the match is "frozen" despite stable connections.

### 1.1 Triage
1.  Verify the match state via the Admin Dashboard (`/admin`).
2.  Check the `transaction_logs` for that `match_id` to see if the last action was successfully recorded.
3.  Inspect Sentry for any `ActionError` or engine crashes for that match.

### 1.2 Resolution: Force Refresh
If the state is inconsistent in the client but correct in the server:
*   Ask players to hard-refresh (Cmd+Shift+R).

### 1.3 Resolution: State Reconstruction
If the match state is corrupted in the DB:
1.  Retrieve all actions from `transaction_logs` for the match.
2.  Use the `replayGame` utility locally to find where the engine diverged.
3.  (Emergency) Delete the match record from the `matches` table to force a clean room exit.

---

## 2. Deployment Rollback

**Symptom**: Post-deployment error rates spike or core gameplay loops break.

### 2.1 Resolution: Immediate Rollback
Roll back to the last stable release on Fly.io:
```bash
fly deploy --rollback
```

### 2.2 Resolution: Version Tag Pinning
If rollback fails, deploy the specific stable version:
1.  Locate the stable SHA in GitHub Actions.
2.  Deploy via CLI using the specific image tag:
    ```bash
    fly deploy --image registry.fly.io/phalanx-duel:<stable-sha>
    ```

---

## 3. Database Migration Triage

**Symptom**: Server fails to start with "Migration error" or "Column not found."

### 3.1 Resolution: Verify Schema
Check the current journal state in the database:
```bash
# Via Fly.io console
pnpm --filter @phalanxduel/server db:migrate
```

### 3.2 Resolution: Database Rollback (Extreme)
If a migration has corrupted data:
1.  Scale down the app to 0 to prevent further writes:
    ```bash
    fly scale count 0
    ```
2.  Restore the database to a point-in-time snapshot (via Neon Console or Fly PG).
3.  Redeploy the application with the previous schema version.

---

## 4. Secret Exposure Response

**Symptom**: `JWT_SECRET` or `FLY_API_TOKEN` is found in public logs or committed to the repo.

### 4.1 Resolution: Revocation
1.  **Fly.io Token**: Revoke the token immediately in the Fly dashboard.
2.  **JWT Secret**:
    *   Rotate the secret: `fly secrets set JWT_SECRET=<new-random-string>`.
    *   **Note**: This will invalidate all active player sessions and require re-login.
3.  **Sentry DSN**: Rotate the DSN in Sentry project settings.
