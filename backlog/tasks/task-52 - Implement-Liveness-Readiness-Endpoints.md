---
id: TASK-52
title: Implement Liveness & Readiness Endpoints
status: Done
assignee:
  - '@gordon'
created_date: ''
updated_date: '2026-03-18 00:58'
labels:
  - reliability
  - observability
  - server
dependencies: []
priority: high
ordinal: 26000
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
- [ ] #1 `GET /health` returns 200 with `{ status: "ok", timestamp: ISO8601 }`
- [ ] #2 `GET /ready` returns 200 with `{ ready: true, database: "ok" }` when healthy
- [ ] #3 `GET /ready` returns 503 Service Unavailable if database unhealthy
- [ ] #4 Both endpoints execute SELECT 1 health check on database
- [ ] #5 Response time <100ms for both endpoints
- [ ] #6 Endpoints documented in Swagger/OpenAPI UI
- [ ] #7 Endpoints work with docker-compose health checks
- [ ] #8 Fly.io health check updated to use `/health`
- [ ] #9 No changes to gameplay/engine logic

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
