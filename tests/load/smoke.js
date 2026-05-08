import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '5s',
  thresholds: {
    http_req_duration: ['p(99)<10'], // Threshold: p99 must be under 10ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  const res = http.get(`${BASE_URL}/health`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'status is ok': (r) => r.json('status') === 'ok',
  });
  sleep(0.1);
}
