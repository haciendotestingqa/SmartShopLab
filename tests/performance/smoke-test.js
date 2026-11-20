/**
 * Minimal capacity smoke (not model quality).
 * Full load + thresholds: `npm run test:load`
 */
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/health`, { timeout: '3s' });
  check(res, { 'API healthy': (r) => r.status === 200 });
}
