# K6 Load Testing Suite

Load testing baseline for Phalanx Duel server performance validation.

## Setup

### Install K6

**macOS**:
```bash
brew install k6
```bash

**Linux**:
```bash
sudo apt-get install k6
```bash

**Windows**:
```bash
choco install k6
```bash

Or download from: https://k6.io/docs/getting-started/installation/

## Running Tests

### Local Development (Against Local Server)

```bash
# Start server locally (if not running)
pnpm dev

# In another terminal, run load test
k6 run tests/load/phalanxduel-load.js

# With custom parameters
k6 run tests/load/phalanxduel-load.js \
  --vus 25 \
  --duration 120s
```bash

### Staging Environment

```bash
k6 run tests/load/phalanxduel-load.js \
  -e BASE_URL=https://phalanxduel-staging.fly.dev \
  --vus 50 \
  --duration 300s
```bash

### Production Environment (Use with Caution)

```bash
k6 run tests/load/phalanxduel-load.js \
  -e BASE_URL=https://phalanxduel.fly.dev \
  --vus 10 \
  --duration 60s
```bash

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `BASE_URL` | `http://localhost:3001` | Target server URL |
| `DURATION` | `60s` | Test duration |
| `VUS` | `10` | Virtual Users |

## Test Coverage

### 1. Health Check Endpoint (30%)
- **Endpoint**: `GET /health`
- **Load**: 30% of traffic
- **Metrics**: Latency, availability
- **Expected**: <100ms, 100% success

### 2. Readiness Endpoint (20%)
- **Endpoint**: `GET /ready`
- **Load**: 20% of traffic
- **Metrics**: Response time
- **Expected**: <50ms, 100% success

### 3. Match Creation (20%)
- **Endpoint**: `POST /matches`
- **Load**: 20% of traffic
- **Payload**: Valid match parameters
- **Metrics**: Throughput, latency
- **Expected**: <500ms, >95% success

### 4. Completed Matches List (15%)
- **Endpoint**: `GET /matches/completed`
- **Load**: 15% of traffic
- **Metrics**: Pagination performance
- **Expected**: <200ms, 100% success

### 5. Defaults Endpoint (10%)
- **Endpoint**: `GET /api/defaults`
- **Load**: 10% of traffic
- **Metrics**: Config endpoint performance
- **Expected**: <100ms, 100% success

### 6. WebSocket Connection (5%)
- **Endpoint**: `WS /ws`
- **Load**: 5% of traffic
- **Metrics**: Connection time, message latency
- **Expected**: <500ms connect, <1s message latency

## Performance Baselines

### Local Development (Single Machine)

```bash
Expected at 10 VUs, 60s duration:

HTTP Performance:
  avg: 50-100ms
  p50: 40-80ms
  p95: 100-200ms
  p99: 200-500ms
  max: 500-1000ms

Throughput:
  requests/sec: 100-150

Error Rate: <0.1%
```bash

### Staging (Single 1GB Machine)

```bash
Expected at 50 VUs, 300s duration:

HTTP Performance:
  avg: 100-150ms
  p50: 80-120ms
  p95: 200-400ms
  p99: 400-800ms

Throughput:
  requests/sec: 150-250

Error Rate: <1%
```bash

### Production (Scaled Machines)

```bash
Expected at 100+ VUs:

HTTP Performance:
  avg: 50-100ms
  p50: 40-80ms
  p95: 150-250ms
  p99: 300-600ms

Throughput:
  requests/sec: 500+

Error Rate: <0.1%
```bash

## Interpreting Results

### Key Metrics

1. **Latency (ms)**
   - p50: Median response time (50% of requests faster)
   - p95: 95th percentile (95% of requests faster)
   - p99: 99th percentile (99% of requests faster)
   - **Good**: p95 < 500ms, p99 < 1000ms

2. **Throughput (req/s)**
   - Requests per second served
   - **Good**: > 100 req/s per VU

3. **Error Rate (%)**
   - Failed requests (5xx, timeouts, connection errors)
   - **Good**: < 1%

4. **Duration**
   - Time to complete test
   - **Good**: Matches configured duration

### Example Output

```bash
          /\      |‾‾| /‾‾/   /‾‾/   /‾‾/   /‾‾/   /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /   /  /   /  /   /  /   /  /
    /  \/    \    |     (   /  /   /  /   /  /   /  /   /  /
   /          \   |  |\  \ /  /___/  /___/  /___/  /___/  /___/
  / _________ \  |__| \__\/______ ______/_______ ______/______/
 /_/         \_\

  execution: local
     script: tests/load/phalanxduel-load.js
     output: -

  scenarios: (100.00%) 1 scenario, 10 max VUs, 1m30s max duration (incl. ramp-up/down):
           * default: Up to 10 looping VUs for 1m0s over 3 stages (20s ramp-up, 1m0s sustain, 20s ramp-down)


✓ status is 200
✓ response contains status ok
✓ response has timestamp
  warnings ...

    data_received..................: 450 kB/s
    data_sent........................: 180 kB/s
    http_req_blocked..................: avg=1.23ms    min=10µs     med=12µs     max=45.2ms   p(90)=17µs     p(95)=22µs     p(99)=35ms
    http_req_connecting...............: avg=234µs     min=0s       med=0s       max=10.2ms   p(90)=0s       p(95)=0s       p(99)=3ms
    http_req_duration.................: avg=45.23ms   min=12.1ms   med=38.4ms   max=523.1ms  p(90)=68.2ms   p(95)=95.3ms   p(99)=203.4ms ✓
    http_req_failed...................: 0.00% ✓
    http_req_receiving................: avg=2.1ms     min=123µs    med=1.5ms    max=45.3ms   p(90)=3.2ms    p(95)=4.1ms    p(99)=12.3ms
    http_req_sending..................: avg=234µs     min=45µs     med=123µs    max=5.3ms    p(90)=456µs    p(95)=789µs    p(99)=2.3ms
    http_req_tls_handshaking..........: avg=0s        min=0s       med=0s       max=0s       p(90)=0s       p(95)=0s       p(99)=0s
    http_req_waiting..................: avg=42.8ms    min=11.5ms   med=36.1ms   max=512.3ms  p(90)=65.1ms   p(95)=92.4ms   p(99)=198.7ms
    http_reqs..........................: 600         10.00/s
    http_test_aborted..................: 0
    iteration_duration.................: avg=1.05s     min=1.01s    med=1.04s    max=1.52s    p(90)=1.08s    p(95)=1.12s    p(99)=1.25s
    iterations.........................: 600         10.00/s
    vus...............................: 10          min=0       max=10
    vus_max............................: 10          min=10      max=10
```bash

## Common Issues & Troubleshooting

### Connection Refused
**Cause**: Server not running or wrong BASE_URL
**Fix**:
```bash
pnpm dev  # Start server
# Or verify BASE_URL is correct
```bash

### High Latency (>1s)
**Causes**:
- Server CPU/memory throttled
- Database queries slow
- Network latency

**Fix**:
- Check `fly status` (if on Fly.io)
- Check `fly logs | grep slow` for slow queries
- Reduce VUS and test again

### WebSocket Failures
**Cause**: WebSocket endpoint not working or requires authentication
**Fix**:
- Verify `/ws` endpoint is accessible
- Check if authentication is required
- Review server logs: `fly logs --app phalanxduel-staging`

### Out of Memory
**Cause**: K6 running too many concurrent connections
**Fix**:
```bash
# Reduce VUS
k6 run tests/load/phalanxduel-load.js --vus 5
```bash

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Load Test (Staging)

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0.3.0
        with:
          filename: tests/load/phalanxduel-load.js
          cloud: true  # Send results to K6 Cloud
        env:
          BASE_URL: https://phalanxduel-staging.fly.dev
          K6_CLOUD_TOKEN: ${{ secrets.K6_CLOUD_TOKEN }}
```bash

## Performance Optimization Tips

If you see high latency or errors:

1. **Profile the server**: `fly logs --app phalanxduel-staging | grep slow`
2. **Check database**: Query performance against Neon
3. **Scale machines**: `fly scale count 2` (add more instances)
4. **Optimize code**: Identify slow endpoints in profiling
5. **Add caching**: Cache responses at load balancer level

## References

- [K6 Documentation](https://k6.io/docs/)
- [K6 HTTP API](https://k6.io/docs/javascript-api/k6-http/)
- [K6 WebSocket API](https://k6.io/docs/javascript-api/k6-ws/)
- [K6 Metrics](https://k6.io/docs/javascript-api/k6-metrics/)
- [K6 Best Practices](https://k6.io/docs/testing-guides/running-load-tests/)
