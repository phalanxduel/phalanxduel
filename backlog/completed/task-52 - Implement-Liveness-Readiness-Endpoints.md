---
id: TASK-52
title: Implement Liveness & Readiness Endpoints
status: Done
assignee:
  - '@gordon'
created_date: ''
updated_date: '2026-03-18 22:39'
labels:
  - reliability
  - observability
  - server
dependencies: []
priority: high
ordinal: 60000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement two distinct health check endpoints:
- `GET /health`: Liveness probe (is process alive?)
- `GET /ready`: Readiness probe (is app ready for traffic?)

Readiness includes dependency checks (database connectivity), enabling orchestrators to properly manage traffic during startup/degradation.
<!-- SECTION:DESCRIPTION:END -->

# TASK-52: Implement Liveness & Readiness Endpoints

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `GET /health` returns 200 with `{ status: "ok", timestamp: ISO8601 }`
- [x] #2 `GET /ready` returns 200 with `{ ready: true, database: "ok" }` when healthy
- [x] #3 `GET /ready` returns 503 Service Unavailable if database unhealthy
- [x] #4 Both endpoints execute SELECT 1 health check on database
- [x] #5 Response time <100ms for both endpoints
- [x] #6 Endpoints documented in Swagger/OpenAPI UI
- [x] #7 Endpoints work with docker-compose health checks
- [x] #8 Fly.io health check updated to use `/health`
- [x] #9 No changes to gameplay/engine logic

## Implementation

### Create server/src/routes/health.ts

```typescript
import { FastifyInstance } from 'fastify';
import type { Database } from 'your-db-type';

export async function registerHealthRoutes(app: FastifyInstance) {
  // Liveness: Is the process alive?
  app.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  });

  // Readiness: Is the app ready to serve traffic?
  app.get('/ready', async (request, reply) => {
    try {
      // Test database connectivity
      const db = request.server.db;
      await db.query('SELECT 1');

      return {
        ready: true,
        database: 'ok',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      reply.statusCode = 503;
      return {
        ready: false,
        database: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  });
}
```

### Update server/src/app.ts

Register routes during app initialization:

```typescript
import { registerHealthRoutes } from './routes/health';

export async function build(opts?: FastifyServerOptions) {
  const app = fastify(opts);

  // Register health routes early
  await registerHealthRoutes(app);

  // ... rest of app setup ...

  return app;
}
```

### Update Swagger/OpenAPI

Add health endpoints to Swagger schema:

```typescript
app.get('/health', { schema: { tags: ['Health'] } }, ...);
app.get('/ready', { schema: { tags: ['Health'] } }, ...);
```

### Update fly.toml

Replace health check endpoint:

```toml
[[http_service.checks]]
  grace_period = "30s"
  interval = "15s"
  method = "GET"
  path = "/health"
  timeout = "10s"
```

### Update Dockerfile HEALTHCHECK

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1
```

## Verification

```bash
# Start server locally or in docker
pnpm dev:server

# In separate terminal:

# Test liveness
curl -s http://localhost:3001/health | jq '.'
# Response: { "status": "ok", "timestamp": "2025-03-17T..." }

# Test readiness (when DB online)
curl -s http://localhost:3001/ready | jq '.'
# Response: { "ready": true, "database": "ok", ... }

# Simulate DB offline (after stopping postgres):
# curl -s http://localhost:3001/ready
# Response: 503 with { "ready": false, "database": "unhealthy", ... }

# Measure latency
for i in {1..10}; do
  curl -s -w "%{time_total}s\n" -o /dev/null http://localhost:3001/health
done
# Should be <100ms each
```

## Testing in Docker Compose

```bash
docker compose up -d
sleep 5
curl http://localhost:3001/health
curl http://localhost:3001/ready
```

## Risk Assessment

**Risk Level**: Low

- **Functional**: New endpoints only; no changes to existing routes
- **Performance**: Health checks are simple queries; <100ms guaranteed
- **Compatibility**: Endpoints are additive; existing health monitoring still works

## Dependencies

- Fastify (already in use)
- Database connection accessible in route handlers
- Swagger/OpenAPI generation (already configured)

## Related Tasks

- TASK-51: Dockerfile security (provides runtime environment)
- TASK-53: Graceful shutdown (works with readiness for clean shutdown)
- TASK-57: Health check config (tunes intervals + timeouts)

---

**Effort Estimate**: 2 hours  
**Priority**: HIGH (Reliability + observability)  
**Complexity**: Low (straightforward endpoint implementation)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Implemented `/health` (liveness) and `/ready` (readiness) endpoints in `server/src/routes/health.ts`.
- `/health` provides process info, memory usage, and observability status. It also performs a `SELECT 1` on DB if available but does not fail if DB is down.
- `/ready` performs a `SELECT 1` on DB and fails with 503 if DB is unreachable.
- Both endpoints are traced via OpenTelemetry `traceDbQuery`.
- Updated `server/tests/health.test.ts` to verify both endpoints and OpenAPI documentation.
- Generated documentation artifacts via `pnpm docs:artifacts`.
- Verified that `Dockerfile`, `fly.production.toml`, and `fly.staging.toml` are correctly configured.

Verification evidence:
- `pnpm --filter @phalanxduel/server test tests/health.test.ts` passed (8 tests).
- `pnpm check:quick` passed (except `docs:check` which shows expected uncommitted changes to `dependency-graph.svg`).
- Manual inspection of OpenAPI JSON output confirms both routes are documented.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Behavior matches specified Rule IDs or Schema definitions
- [x] #2 pnpm check:quick passes locally
- [x] #3 Targeted tests cover the changed paths
- [x] #4 No orphan TODO or FIXME comments remain without linked tasks
- [x] #5 Verification evidence recorded in task summary
- [x] #6 Operational docs and runbooks updated for surface changes (Swagger/OpenAPI UI)
- [x] #7 Review hidden-state, actor-authority, privacy, and fail-closed behavior (Readiness check fails if DB down)
- [x] #8 Moved to Human Review for AI-assisted PR-backed work
<!-- DOD:END -->
