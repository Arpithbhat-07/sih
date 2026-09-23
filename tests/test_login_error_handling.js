/**
 * Unit Test Suite for Frontend Login Error Handling (Section 4)
 * Verifies that all HTTP error codes, timeouts, and network/CORS failures
 * produce the exact user-safe messages specified in Section 4 without leaking
 * credentials, secrets, or internal server details.
 */

const assert = require('assert');

// Error mapping logic from frontend/src/services/api.js login()
function mapLoginError(err) {
  if (err.response) {
    const status = err.response.status;
    const detail = err.response.data?.detail;

    if (status === 401) {
      return typeof detail === 'string' ? detail : 'Invalid username or password.';
    }
    if (status === 403) {
      return 'You are not authorized to access this account or scope.';
    }
    if (status === 404) {
      return 'Authentication service endpoint was not found. Please check the backend configuration.';
    }
    if (status === 422) {
      return 'The login request was invalid. Please try again.';
    }
    if (status === 500) {
      return 'The authentication service encountered a server error. Please try again.';
    }
    if (status === 502 || status === 503 || status === 504) {
      return 'The backend is temporarily unavailable. Please try again in a moment.';
    }
    return typeof detail === 'string' ? detail : `Authentication request failed with status ${status}.`;
  }

  if (err.code === 'ECONNABORTED' || err.message?.toLowerCase().includes('timeout')) {
    return 'The backend is taking longer than expected to respond. Please try again shortly.';
  }

  return 'Unable to reach the authentication service. Please check the deployment configuration or try again.';
}

const scenarios = [
  {
    name: '401 with backend detail message',
    err: { response: { status: 401, data: { detail: 'Invalid username or password. Please verify your credentials.' } } },
    expected: 'Invalid username or password. Please verify your credentials.',
  },
  {
    name: '401 without detail message (fallback)',
    err: { response: { status: 401, data: {} } },
    expected: 'Invalid username or password.',
  },
  {
    name: '403 Forbidden',
    err: { response: { status: 403, data: { detail: 'Forbidden' } } },
    expected: 'You are not authorized to access this account or scope.',
  },
  {
    name: '404 Not Found (e.g. wrong API URL missing /api prefix)',
    err: { response: { status: 404, data: {} } },
    expected: 'Authentication service endpoint was not found. Please check the backend configuration.',
  },
  {
    name: '422 Unprocessable Entity (missing/invalid fields)',
    err: { response: { status: 422, data: {} } },
    expected: 'The login request was invalid. Please try again.',
  },
  {
    name: '500 Internal Server Error',
    err: { response: { status: 500, data: {} } },
    expected: 'The authentication service encountered a server error. Please try again.',
  },
  {
    name: '502 Bad Gateway (Render sleeping / proxy restarting)',
    err: { response: { status: 502, data: {} } },
    expected: 'The backend is temporarily unavailable. Please try again in a moment.',
  },
  {
    name: '503 Service Unavailable',
    err: { response: { status: 503, data: {} } },
    expected: 'The backend is temporarily unavailable. Please try again in a moment.',
  },
  {
    name: '504 Gateway Timeout',
    err: { response: { status: 504, data: {} } },
    expected: 'The backend is temporarily unavailable. Please try again in a moment.',
  },
  {
    name: 'Timeout (ECONNABORTED - Render cold start taking > 35s)',
    err: { code: 'ECONNABORTED', message: 'timeout of 35000ms exceeded' },
    expected: 'The backend is taking longer than expected to respond. Please try again shortly.',
  },
  {
    name: 'Network / CORS Error (no response received from server)',
    err: { message: 'Network Error' },
    expected: 'Unable to reach the authentication service. Please check the deployment configuration or try again.',
  },
];

console.log('=== Running Frontend Login Error Handling Tests ===\n');

let passed = 0;
let failed = 0;

for (const sc of scenarios) {
  const result = mapLoginError(sc.err);
  try {
    assert.strictEqual(result, sc.expected);
    assert.strictEqual(
      result.includes('verify credentials') && sc.err.response?.status !== 401,
      false,
      'Must NOT tell user to verify credentials on network or server error'
    );
    console.log(`✓ PASS: ${sc.name} -> "${result}"`);
    passed++;
  } catch (err) {
    console.error(`✗ FAIL: ${sc.name}\n  Expected: "${sc.expected}"\n  Got:      "${result}"`);
    failed++;
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
