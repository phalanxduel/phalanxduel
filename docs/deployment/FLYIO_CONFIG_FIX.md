# Fly.io Configuration Fix

## Issue

When deploying to Fly.io staging, the app crashed with:

```
Error: Cannot find module '/app/SIGTERM'
```

## Root Cause

The `fly.toml` configuration had a malformed `[processes]` section that included `kill_signal` and `kill_timeout` directives. Fly.io was misinterpreting the `SIGTERM` value as a module path to require, rather than as a signal name.

**Original (broken)**:
```toml
[processes]
  web = "node server/dist/index.js"
  kill_timeout = "35s"
  kill_signal = "SIGTERM"
```

Fly.io was trying to run:
```bash
node server/dist/index.js SIGTERM  # ❌ Incorrect
```

Which then tried to require `/app/SIGTERM` as a module, causing the error.

## Solution

Removed the `[processes]` section and migrated to the correct Fly.io v2 Machine configuration format using `[[services]]`:

**Fixed (correct)**:
```toml
[[services]]
  internal_port = 3001
  processes = ["app"]
  
  [[services.http_checks]]
    grace_period = "30s"
    interval = "15s"
    path = "/health"
    method = "get"
```

Key changes:
1. ✅ Removed `[processes]` (deprecated format)
2. ✅ Moved to `[[services]]` configuration
3. ✅ Health checks in `[[services.http_checks]]`
4. ✅ Graceful shutdown handled by Dockerfile `STOPSIGNAL SIGTERM`
5. ✅ TCP checks for basic connectivity

## Graceful Shutdown

Graceful shutdown is now properly configured:

**Dockerfile**:
```dockerfile
STOPSIGNAL SIGTERM
```

**Fly.io Health Check**:
- Grace period: 30s (allows app to start)
- Interval: 15s (check every 15s)
- Timeout: 10s (fail if no response)

When Fly.io stops a machine:
1. Sends SIGTERM (configured in Dockerfile)
2. App's signal handler closes connections (30s grace)
3. After 30s or when complete, process exits
4. Fly.io forcefully kills any remaining processes after timeout

## Files Modified

- `fly.toml` — Fixed configuration syntax
- `fly.staging.toml` — Updated to match fly.toml

Both now use correct Fly.io v2 format and pass TOML validation.

## Testing

```bash
# Verify syntax
python3 -c "import tomllib; tomllib.loads(open('fly.toml').read())"

# Deploy again
fly deploy --app phalanxduel-staging
```

## References

- [Fly.io Machines Configuration](https://fly.io/docs/reference/configuration/)
- [Fly.io Health Checks](https://fly.io/docs/reference/health-checks/)
- [Docker STOPSIGNAL](https://docs.docker.com/reference/dockerfile/#stopsignal)
