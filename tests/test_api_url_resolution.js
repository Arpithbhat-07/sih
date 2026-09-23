/**
 * Unit Test Suite for Frontend API URL Resolution (Section 13)
 * Tests resolveApiBaseUrl logic against all required edge cases, trailing slashes,
 * single '/api' guarantee, and environment variable precedence.
 */

const assert = require('assert');

// Pure implementation mirroring frontend/src/services/api.js resolveApiBaseUrl
function resolveApiBaseUrl(env = {}) {
  const raw =
    env.REACT_APP_API_BASE_URL ||
    env.REACT_APP_BACKEND_URL ||
    env.REACT_APP_API_URL ||
    'http://127.0.0.1:8000/api';

  let clean = raw.trim().replace(/\/+$/, '');
  if (!clean.endsWith('/api')) {
    clean = `${clean}/api`;
  }
  return clean;
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
    name: 'Fallback to default localhost when no env vars defined',
    env: {},
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

// 1. REACT_APP_API_BASE_URL beats REACT_APP_BACKEND_URL and REACT_APP_API_URL
const prec1 = resolveApiBaseUrl({
  REACT_APP_API_BASE_URL: 'https://priority1.onrender.com',
  REACT_APP_BACKEND_URL: 'https://priority2.onrender.com',
  REACT_APP_API_URL: 'https://priority3.onrender.com',
});
assert.strictEqual(prec1, 'https://priority1.onrender.com/api');
console.log('✓ PASS: REACT_APP_API_BASE_URL takes highest precedence');
passed++;

// 2. REACT_APP_BACKEND_URL beats REACT_APP_API_URL
const prec2 = resolveApiBaseUrl({
  REACT_APP_BACKEND_URL: 'https://priority2.onrender.com',
  REACT_APP_API_URL: 'https://priority3.onrender.com',
});
assert.strictEqual(prec2, 'https://priority2.onrender.com/api');
console.log('✓ PASS: REACT_APP_BACKEND_URL takes precedence over REACT_APP_API_URL');
passed++;

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
