---
id: TASK-53
title: Add Graceful Shutdown Handler
status: Done
assignee:
  - '@gordon'
created_date: ''
updated_date: '2026-03-18 01:00'
labels:
  - reliability
  - server
dependencies: []
priority: high
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement SIGTERM signal handler in Node.js app to ensure graceful shutdown. When container receives SIGTERM (during restart/update), the server closes connections cleanly, rejects new requests, and waits up to 30 seconds for existing requests to complete.
<!-- SECTION:DESCRIPTION:END -->

# TASK-53: Add Graceful Shutdown Handler

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Server catches SIGTERM signal
- [ ] #2 New requests rejected with 503 (shutting down) after SIGTERM received
- [ ] #3 Existing WebSocket connections have 30s grace period to complete
- [ ] #4 Fastify app.close() waits for in-flight requests
- [ ] #5 Process exits with code 0 on successful shutdown, 1 on timeout
- [ ] #6 Logs clearly indicate shutdown start + completion
- [ ] #7 Docker stop --time 35 completes cleanly (30s grace + 5s margin)
- [ ] #8 No regression: Normal app shutdown/restart still works

## Implementation

### Update server/src/index.ts

Add signal handlers before app starts:

```typescript
import fastify from 'fastify';

const app = fastify({ logger: true });

// Register routes + plugins
// ... existing app setup ...

// Graceful shutdown
const signals = ['SIGTERM', 'SIGINT'];
const gracefulShutdownTimeout = 30000; // 30 seconds

signals.forEach((signal) => {
  process.on(signal, async () => {
    app.log.info(`Received ${signal}, initiating graceful shutdown...`);

    try {
      // Stop accepting new connections
      await app.close();
      app.log.info('Server closed successfully');
      process.exit(0);
    } catch (err) {
      app.log.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  app.log.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  app.log.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: 3001, host: '0.0.0.0' });
    app.log.info('Server started on port 3001');
  } catch (err) {
    app.log.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
```

## Verification

```bash
# Test 1: Start app locally
pnpm dev:server &
SERVER_PID=$!
sleep 3

# Test 2: Send SIGTERM and verify clean shutdown
kill -TERM $SERVER_PID
sleep 2

# Should see log: "Received SIGTERM, initiating graceful shutdown..."
# Should see log: "Server closed successfully"
# Should see exit code 0

# Test 3: Restart test (simulates docker stop)
timeout 35 pnpm dev:server &
SERVER_PID=$!
sleep 3

kill -TERM $SERVER_PID
wait $SERVER_PID
EXIT_CODE=$?

# EXIT_CODE should be 0 or 143 (128 + 15 for SIGTERM)
echo "Exit code: $EXIT_CODE"

# Test 4: In Docker
docker build -t phalanxduel:shutdown .
docker run -d --name phalanx-shutdown phalanxduel:shutdown

sleep 3
docker stop --time 35 phalanx-shutdown  # 30s grace + 5s margin

docker logs phalanx-shutdown | grep -i "shutting down\|closed successfully"
# Should see both log messages

docker rm phalanx-shutdown
```

## Risk Assessment

**Risk Level**: Low

- **Defensive code**: Only adds shutdown logic; doesn't change request handling
- **Testing**: Thoroughly test with timeout to catch hanging connections
- **Compatibility**: Process signals are standard; no platform-specific issues

## Dependencies

- Fastify (already in use)
- Node.js built-in `process` module

## Related Tasks

- TASK-52: Health check endpoints (works with graceful shutdown)
- TASK-57: Health check config (documents shutdown timeout)
- TASK-61: Fly.io config (sets kill_timeout=30s)

---

**Effort Estimate**: 2 hours  
**Priority**: HIGH (Data integrity + reliability)  
**Complexity**: Low (standard Node.js patterns)
<!-- AC:END -->
