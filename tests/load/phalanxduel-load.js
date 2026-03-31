// eslint-disable-next-line no-undef
const BASE_URL = typeof __ENV !== 'undefined' ? __ENV.BASE_URL : 'http://127.0.0.1:3001';
// eslint-disable-next-line no-undef
const VUS_COUNT = typeof __ENV !== 'undefined' ? __ENV.VUS : '10';

import http from 'k6/http';
import ws from 'k6/ws';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Gauge } from 'k6/metrics';

// Custom metrics
const healthCheckDuration = new Trend('health_check_duration');
const matchCreationDuration = new Trend('match_creation_duration');
const websocketConnectDuration = new Trend('websocket_connect_duration');
const websocketMessageDuration = new Trend('websocket_message_duration');
const errorRate = new Rate('errors');
const successRate = new Rate('success');
const activeWebsockets = new Gauge('active_websockets');

// Test configuration
export const options = {
  stages: [
    { duration: '10s', target: parseInt(VUS_COUNT) }, // Ramp up
    { duration: '60s', target: parseInt(VUS_COUNT) }, // Sustain
    { duration: '10s', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // Match PERFORMANCE_SLOS.md
    http_req_failed: ['rate<0.01'], // < 1% error rate
    websocket_connect_duration: ['p(95)<1000'], // Sub-second handshake
    errors: ['rate<0.01'],
  },
};

// Test 1: Health Check Endpoint
export function testHealthCheck() {
  group('Health Checks', function () {
    const startTime = new Date();
    const res = http.get(`${BASE_URL}/health`);
    const duration = new Date() - startTime;

    healthCheckDuration.add(duration);

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response contains status ok': (r) => r.json('status') === 'ok',
      'response has timestamp': (r) => r.json('timestamp') !== undefined,
      'response has uptime_seconds': (r) => r.json('uptime_seconds') !== undefined,
    });

    if (success) {
      successRate.add(true);
    } else {
      errorRate.add(true);
    }

    sleep(1);
  });
}

// Test 2: Readiness Endpoint
export function testReadiness() {
  group('Readiness Checks', function () {
    const res = http.get(`${BASE_URL}/ready`);

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response contains ready true': (r) => r.json('ready') === true,
      'response has timestamp': (r) => r.json('timestamp') !== undefined,
    });

    if (success) {
      successRate.add(true);
    } else {
      errorRate.add(true);
    }

    sleep(1);
  });
}

// Test 3: Match Creation
export function testMatchCreation() {
  group('Match Creation', function () {
    const payload = JSON.stringify({
      params: {
        maxTurns: 50,
        damageMode: 'CLASSIC',
      },
    });

    const startTime = new Date();
    const res = http.post(`${BASE_URL}/matches`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    const duration = new Date() - startTime;

    matchCreationDuration.add(duration);

    const success = check(res, {
      'status is 201': (r) => r.status === 201,
      'response has matchId': (r) => r.json('matchId') !== undefined,
      'matchId is valid uuid': (r) => {
        const matchId = r.json('matchId');
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matchId);
      },
    });

    if (success) {
      successRate.add(true);
    } else {
      errorRate.add(true);
    }

    sleep(1);
  });
}

// Test 4: Get Completed Matches (List endpoint)
export function testCompletedMatches() {
  group('Completed Matches List', function () {
    const res = http.get(`${BASE_URL}/matches/completed?page=1&limit=10`);

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response is array': (r) => Array.isArray(r.json()),
    });

    if (success) {
      successRate.add(true);
    } else {
      errorRate.add(true);
    }

    sleep(1);
  });
}

// Test 5: WebSocket Connection (hardened)
export function testWebSocketConnection() {
  group('WebSocket Connection', function () {
    const url = `${BASE_URL.replace('http', 'ws')}/ws`;
    let wsConnected = false;
    let messageCount = 0;

    const startTime = new Date();

    // Harden handshake with required Origin header (TASK-76)
    const params = { headers: { Origin: BASE_URL } };

    ws.connect(url, params, function (socket) {
      const connectDuration = new Date() - startTime;
      websocketConnectDuration.add(connectDuration);
      wsConnected = true;
      activeWebsockets.add(1);

      socket.on('open', function () {
        check(socket.readyState, {
          'WebSocket is open': (state) => state === ws.OPEN,
        });

        // Send a ping message to keep connection alive
        // (Note: server will heartbeat, but client can also probe)
        socket.send(JSON.stringify({ type: 'ping' }));
      });

      socket.on('message', function (data) {
        messageCount += 1;
        const msgDuration = new Date() - startTime;
        websocketMessageDuration.add(msgDuration);

        check(data, {
          'message is not empty': (msg) => msg && msg.length > 0,
        });

        // Close after receiving one message for load test efficiency
        if (messageCount >= 1) {
          socket.close();
        }
      });

      socket.on('close', function () {
        activeWebsockets.add(-1);
      });

      socket.on('error', function (_err) {
        errorRate.add(true);
        check(false, {
          'WebSocket error': () => false,
        });
      });

      // Connection timeout
      sleep(5);
    });

    if (wsConnected) {
      successRate.add(true);
    } else {
      errorRate.add(true);
    }
  });
}

// Test 6: Defaults Endpoint
export function testDefaults() {
  group('Defaults Endpoint', function () {
    const res = http.get(`${BASE_URL}/api/defaults`);

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response has maxTurns': (r) => r.json('maxTurns') !== undefined,
      'response has minTurns': (r) => r.json('minTurns') !== undefined,
    });

    if (success) {
      successRate.add(true);
    } else {
      errorRate.add(true);
    }

    sleep(1);
  });
}

// Default export: Run all tests
export default function () {
  const testChoice = Math.random();

  if (testChoice < 0.3) {
    testHealthCheck();
  } else if (testChoice < 0.5) {
    testReadiness();
  } else if (testChoice < 0.7) {
    testMatchCreation();
  } else if (testChoice < 0.85) {
    testCompletedMatches();
  } else if (testChoice < 0.95) {
    testDefaults();
  } else {
    testWebSocketConnection();
  }
}

// Helper: text summary
function textSummary(data, options) {
  const indent = options.indent || '';
  let summary = '\n';

  summary += `${indent}load test summary\n`;
  summary += `${indent}================\n`;

  if (data.metrics) {
    const metrics = data.metrics;

    // HTTP metrics
    if (metrics.http_req_duration) {
      const duration = metrics.http_req_duration.values;
      summary += `${indent}\nHTTP Performance:\n`;
      summary += `${indent}  avg: ${duration.avg?.toFixed(2)}ms\n`;
      summary += `${indent}  p50: ${duration.p50?.toFixed(2)}ms\n`;
      summary += `${indent}  p95: ${duration.p95?.toFixed(2)}ms\n`;
      summary += `${indent}  p99: ${duration.p99?.toFixed(2)}ms\n`;
      summary += `${indent}  max: ${duration.max?.toFixed(2)}ms\n`;
    }

    if (metrics.http_req_failed) {
      summary += `${indent}\nErrors:\n`;
      summary += `${indent}  failure rate: ${(metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
    }

    if (metrics.http_reqs) {
      summary += `${indent}\nThroughput:\n`;
      summary += `${indent}  total requests: ${metrics.http_reqs.values.count}\n`;
      summary += `${indent}  requests/sec: ${metrics.http_reqs.values.rate?.toFixed(2)}\n`;
    }
  }

  return summary;
}

// Summary function
export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
