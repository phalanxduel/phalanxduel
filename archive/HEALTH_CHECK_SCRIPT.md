# Health Check Script - TASK-57 Implementation

**Status**: ✅ Complete  
**Script**: `scripts/health-check.ts`  
**pnpm command**: `pnpm health:check`  
**Date**: 2026-03-18

---

## Overview

Health check script that validates both **liveness** (`/health`) and **readiness** (`/ready`) endpoints for any environment. Provides a formatted report showing:

- Endpoint status (✅ success or ❌ error)
- HTTP status codes
- Response times
- Uptime and memory usage (for health endpoint)
- Overall application health status

---

## Usage

### Basic Commands

```bash
# Check local app (default)
pnpm health:check

# Check specific environment
pnpm health:check local
pnpm health:check 127.0.0.1
pnpm health:check staging
pnpm health:check production

# Check custom host/port
pnpm health:check 127.0.0.1:8080
pnpm health:check 127.0.0.1:3001
pnpm health:check https://custom-domain.com
```

### Exit Codes

- **0** - All endpoints healthy
- **1** - Any endpoint failed or unhealthy

---

## Example Output

### Healthy Application

```yaml
╔════════════════════════════════════════════════════════════════╗
║ Health Check Report: Local                                  ║
╠════════════════════════════════════════════════════════════════╣
║ URL: http://127.0.0.1:3001                                    ║
║ Checked at: 2026-03-18T21:57:48.599Z                           ║
╠════════════════════════════════════════════════════════════════╣
║ LIVENESS (/health)                                             ║
║   ✅ Status: OK         | HTTP 200 | Uptime: 7m 16s | Memory: 55MB║
║   Version: 0.3.0-rev.8                                      ║
║   Response Time: 10ms                                          ║
╠════════════════════════════════════════════════════════════════╣
║ READINESS (/ready)                                             ║
║   ✅ Status: READY      | HTTP 200                               ║
║   Response Time: 7ms                                          ║
╠════════════════════════════════════════════════════════════════╣
║ Overall Status: ✅ HEALTHY                                      ║
╚════════════════════════════════════════════════════════════════╝
```

### Unhealthy Application

```bash
╔════════════════════════════════════════════════════════════════╗
║ Health Check Report: Staging                                 ║
╠════════════════════════════════════════════════════════════════╣
║ URL: https://phalanxduel-staging.fly.dev                       ║
║ Checked at: 2026-03-18T21:58:12.442Z                           ║
╠════════════════════════════════════════════════════════════════╣
║ LIVENESS (/health)                                             ║
║   ✅ Status: OK         | HTTP 200 | Uptime: 2h 34m | Memory: 120MB║
║   Version: 0.3.0-rev.8                                      ║
║   Response Time: 156ms                                         ║
╠════════════════════════════════════════════════════════════════╣
║ READINESS (/ready)                                             ║
║   ❌ Status: NOT READY  | HTTP 503                              ║
║   Response Time: 45ms                                          ║
╠════════════════════════════════════════════════════════════════╣
║ Overall Status: ❌ UNHEALTHY                                    ║
╚════════════════════════════════════════════════════════════════╝
```

### Connection Error

```bash
╔════════════════════════════════════════════════════════════════╗
║ Health Check Report: Local                                  ║
╠════════════════════════════════════════════════════════════════╣
║ URL: http://127.0.0.1:3001                                    ║
║ Checked at: 2026-03-18T21:59:00.123Z                           ║
╠════════════════════════════════════════════════════════════════╣
║ LIVENESS (/health)                                             ║
║   ❌ ERROR: connect ECONNREFUSED 127.0.0.1:3001                ║
║   Response Time: 15ms                                          ║
╠════════════════════════════════════════════════════════════════╣
║ READINESS (/ready)                                             ║
║   ❌ ERROR: connect ECONNREFUSED 127.0.0.1:3001                ║
║   Response Time: 2ms                                           ║
╠════════════════════════════════════════════════════════════════╣
║ Overall Status: ❌ UNHEALTHY                                    ║
╚════════════════════════════════════════════════════════════════╝
```

---

## Features

### ✅ Comprehensive Endpoint Testing

Fetches and validates both endpoints in parallel:
- **Liveness** (`/health`) - Is the app alive?
- **Readiness** (`/ready`) - Is the app ready for traffic?

### ✅ Multiple Environment Support

Pre-configured environments with one-word shortcuts:
- `local` → `http://127.0.0.1:3001`
- `127.0.0.1` → `http://127.0.0.1:3001`
- `staging` → `https://phalanxduel-staging.fly.dev`
- `production` → `https://phalanxduel-production.fly.dev`

### ✅ Custom Host/Port

Pass any custom URL:
- `127.0.0.1:8080` → `http://127.0.0.1:8080`
- `127.0.0.1:4000` → `http://127.0.0.1:4000`
- `https://custom-domain.com` → `https://custom-domain.com`

### ✅ Formatted Report

Clean ASCII table with:
- Environment name and URL
- Timestamp of check
- Status indicators (✅ / ❌ / ⚠️)
- HTTP status codes
- Response times
- Uptime and memory usage
- Version information
- Overall health summary

### ✅ Error Handling

Graceful handling of:
- Connection refused (app not running)
- Timeouts (app slow or unreachable)
- Invalid JSON responses
- Network errors
- HTTP errors (4xx, 5xx)

### ✅ Exit Codes for CI/CD

- Returns exit code 0 if healthy
- Returns exit code 1 if any check fails
- Suitable for use in CI pipelines and monitoring

---

## Integration with TASK-57

This script fulfills TASK-57 requirements:

- [x] Health check script created as pnpm command
- [x] Supports multiple environments (local, staging, production)
- [x] Displays formatted report with status
- [x] Shows response times for each endpoint
- [x] Reports uptime and memory usage
- [x] Tests both `/health` and `/ready` endpoints
- [x] Works with custom hosts/ports
- [x] Graceful error handling

---

## CI/CD Usage

### GitHub Actions Example

```yaml
- name: Check application health
  run: pnpm health:check staging
  continue-on-error: true  # Optional: don't fail pipeline
```

### Monitoring/Alerting

```bash
#!/bin/bash
# Alert if app is unhealthy
if ! pnpm health:check production > /dev/null 2>&1; then
  echo "ALERT: Production app is unhealthy" | mail -s "App Alert" ops@example.com
fi
```

### Deploy Verification

```bash
# Deploy to staging
fly deploy -a phalanxduel-staging

# Wait for deployment
sleep 10

# Verify health
pnpm health:check staging
```

---

## Script Details

### Implementation

- **Language**: TypeScript (using `tsx` runner)
- **Dependencies**: Node.js built-ins only (`https`, `http`)
- **No external libraries**: Pure Node, zero dependencies
- **Timeout**: 10 seconds per endpoint (configurable)
- **Parallel fetching**: Both endpoints checked simultaneously for speed

### Error Handling

- Connection refused → Clear error message
- Timeouts → Detects and reports
- Invalid JSON → Shows parsing error
- HTTP errors → Reports status code
- Network errors → Captures error message

### Response Formatting

- Memory: `55MB` or `1.2GB` (auto-formatted)
- Uptime: `7m 16s` or `2h 34m` (human readable)
- Response time: `10ms` (milliseconds)
- Status codes: HTTP 200, 503, etc.

---

## Troubleshooting

### "Unknown environment: xxx"

**Problem**: Invalid environment name  
**Solution**: Use `local`, `staging`, `production`, or a custom URL

```bash
# ❌ Wrong
pnpm health:check staging-app

# ✅ Correct
pnpm health:check staging
pnpm health:check https://phalanxduel-staging.fly.dev
```

### "Timeout after 10000ms"

**Problem**: App took too long to respond  
**Solution**: Check if app is running, network issues, or high load

```bash
# Verify app is running
docker ps | grep phalanx

# Check logs
fly logs -a phalanxduel-staging
```

### "connect ECONNREFUSED"

**Problem**: App not responding on that port  
**Solution**: Start the app or use correct environment

```bash
# Start app locally
pnpm dev:server

# Then check
pnpm health:check local
```

---

## Future Enhancements (Optional)

1. **Repeated checks**: `pnpm health:check local --repeat 5 --interval 10s`
2. **Alerts**: `--alert-webhook https://hooks.slack.com/...`
3. **Metrics export**: `--prometheus` to export metrics
4. **Detailed debug**: `--verbose` for full response bodies
5. **Config file**: Read environments from file

---

**Status**: ✅ Complete and production-ready  
**Tested**: Yes (local environment)  
**Documentation**: Complete  
**Next Step**: Can be used in CI/CD pipelines immediately
