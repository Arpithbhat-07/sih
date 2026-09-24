/**
 * Unit Test Suite for Frontend API URL Resolution (Section 13)
 * Tests resolveApiBaseUrl logic against all required edge cases, trailing slashes,
 * single '/api' guarantee, environment variable precedence, and production domain detection.
 */

const assert = require('assert');

// Pure implementation mirroring frontend/src/services/api.js resolveApiBaseUrl
function resolveApiBaseUrl(customEnv, mockWindow) {
  // 1. Custom environment (for unit tests and programmatic overrides)
  if (customEnv && (customEnv.REACT_APP_API_BASE_URL || customEnv.REACT_APP_BACKEND_URL || customEnv.REACT_APP_API_URL)) {
    const raw = customEnv.REACT_APP_API_BASE_URL || customEnv.REACT_APP_BACKEND_URL || customEnv.REACT_APP_API_URL;
    let clean = String(raw).trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  // 2. Direct Webpack compile-time inlined environment variables
  const envUrl =
    (typeof process !== 'undefined' && process.env && (process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL)) ||
    null;

  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    let clean = envUrl.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  // 3. Runtime browser domain detection (fail-safe for production Vercel / custom domains)
  const win = mockWindow || (typeof window !== 'undefined' ? window : null);
  if (win && win.location) {
    const hostname = win.location.hostname || '';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname.endsWith('.local');
    if (!isLocalhost && hostname.length > 0) {
      return 'https://sih-63wt.onrender.com/api';
    }
  }

  // 4. Default for local development
  return 'http://127.0.0.1:8000/api';
}

const testCases = [
  {
    name: 'Base Render URL without trailing slash',
    env: { REACT_APP_BACKEND_URL: 'https://example.onrender.com' },
    expected: 'https://example.onrender.com/api',
  },
  {
    name: 'Base Render URL with trailing slash',
    env: { REACT_APP_BACKEND_URL: 'https://example.onrender.com/' },
    expected: 'https://example.onrender.com/api',
  },
  {
    name: 'Render URL already ending with /api',
    env: { REACT_APP_API_BASE_URL: 'https://example.onrender.com/api' },
    expected: 'https://example.onrender.com/api',
  },
  {
    name: 'Render URL ending with /api/',
    env: { REACT_APP_API_BASE_URL: 'https://example.onrender.com/api/' },
    expected: 'https://example.onrender.com/api',
  },
  {
    name: 'Localhost without /api',
    env: { REACT_APP_BACKEND_URL: 'http://127.0.0.1:8000' },
    expected: 'http://127.0.0.1:8000/api',
  },
  {
    name: 'Localhost with /api',
    env: { REACT_APP_API_BASE_URL: 'http://127.0.0.1:8000/api' },
    expected: 'http://127.0.0.1:8000/api',
  },
  {
    name: 'Fallback to default localhost when no env vars defined in Node',
    env: null,
    expected: 'http://127.0.0.1:8000/api',
  },
  {
    name: 'Never creates duplicate /api/api',
    env: { REACT_APP_BACKEND_URL: 'https://example.onrender.com/api' },
    expected: 'https://example.onrender.com/api',
  },
];

console.log('=== Running Frontend API URL Resolution Tests ===\n');

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = resolveApiBaseUrl(tc.env);
  try {
    assert.strictEqual(result, tc.expected);
    assert.strictEqual(result.includes('/api/api'), false, 'Result must not contain /api/api');
    console.log(`✓ PASS: ${tc.name} -> ${result}`);
    passed++;
  } catch (err) {
    console.error(`✗ FAIL: ${tc.name}\n  Expected: ${tc.expected}\n  Got:      ${result}`);
    failed++;
  }
}

// Precedence Tests
console.log('\n=== Running Environment Variable Precedence Tests ===\n');

const prec1 = resolveApiBaseUrl({
  REACT_APP_API_BASE_URL: 'https://priority1.onrender.com',
  REACT_APP_BACKEND_URL: 'https://priority2.onrender.com',
  REACT_APP_API_URL: 'https://priority3.onrender.com',
});
assert.strictEqual(prec1, 'https://priority1.onrender.com/api');
console.log('✓ PASS: REACT_APP_API_BASE_URL takes highest precedence');
passed++;

const prec2 = resolveApiBaseUrl({
  REACT_APP_BACKEND_URL: 'https://priority2.onrender.com',
  REACT_APP_API_URL: 'https://priority3.onrender.com',
});
assert.strictEqual(prec2, 'https://priority2.onrender.com/api');
console.log('✓ PASS: REACT_APP_BACKEND_URL takes precedence over REACT_APP_API_URL');
passed++;

// Production Hostname Fallback Tests
console.log('\n=== Running Production Hostname Fallback Tests ===\n');

const host1 = resolveApiBaseUrl(null, { location: { hostname: 'missionx.arpith.in' } });
assert.strictEqual(host1, 'https://sih-63wt.onrender.com/api');
console.log('✓ PASS: missionx.arpith.in routes to live Render backend');
passed++;

const host2 = resolveApiBaseUrl(null, { location: { hostname: 'missionx-jade.vercel.app' } });
assert.strictEqual(host2, 'https://sih-63wt.onrender.com/api');
console.log('✓ PASS: missionx-jade.vercel.app routes to live Render backend');
passed++;

const host3 = resolveApiBaseUrl(null, { location: { hostname: 'localhost' } });
assert.strictEqual(host3, 'http://127.0.0.1:8000/api');
console.log('✓ PASS: localhost routes to local development backend');
passed++;

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
