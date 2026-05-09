import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const connectErrors = new Counter('ws_connect_errors');
const messageErrors = new Counter('ws_message_errors');
const errorRate = new Rate('ws_error_rate');
const connectDuration = new Trend('ws_connect_duration_ms', true);

export const options = {
  scenarios: {
    connect_disconnect: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      tags: { scenario: 'connect_disconnect' },
    },
  },
  thresholds: {
    ws_error_rate: ['rate<0.01'],
    ws_connect_duration_ms: ['p(95)<200'],
    ws_connect_errors: ['count<5'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'ws://localhost:3001';

export default function () {
  const start = Date.now();
  let connected = false;

  const res = ws.connect(`${BASE_URL}/ws`, {}, function (socket) {
    connected = true;
    connectDuration.add(Date.now() - start);

    socket.on('open', function () {
      errorRate.add(false);
    });

    socket.on('message', function (_data) {
      // Messages received during probe — not checked for content
    });

    socket.on('error', function (e) {
      messageErrors.add(1);
      errorRate.add(true);
      console.error('WebSocket error:', e.error());
    });

    socket.on('close', function () {
      // clean disconnect
    });

    // Hold the connection briefly then close cleanly
    socket.setTimeout(function () {
      socket.close();
    }, 500);
  });

  if (!connected) {
    connectErrors.add(1);
    errorRate.add(true);
  }

  check(res, {
    'WebSocket connected (status 101)': (r) => r && r.status === 101,
  });

  sleep(0.1);
}
