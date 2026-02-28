/**
 * API smoke test - verifies backend routes respond correctly.
 * Run: node scripts/test-api.js
 * Ensure server is running: npm start
 */

const BASE = 'http://localhost:3000';

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, { ...opts, credentials: 'include' });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

async function run() {
  console.log('=== Advisor API Smoke Test ===\n');

  // 1. Status
  try {
    const { status, data } = await fetchJson(`${BASE}/status`);
    console.log('1. GET /status:', status === 200 ? 'OK' : 'FAIL', data);
  } catch (e) {
    console.log('1. GET /status: ERROR -', e.message);
    console.log('   Make sure the server is running: npm start');
  }

  // 2. Landing
  try {
    const res = await fetch(`${BASE}/`);
    console.log('2. GET /:', res.status === 200 ? 'OK' : 'FAIL');
  } catch (e) {
    console.log('2. GET /: ERROR -', e.message);
  }

  // 3. Login page
  try {
    const res = await fetch(`${BASE}/login`);
    console.log('3. GET /login:', res.status === 200 ? 'OK' : 'FAIL');
  } catch (e) {
    console.log('3. GET /login: ERROR -', e.message);
  }

  // 4. Protected API (expect 401 without session)
  try {
    const { status } = await fetchJson(`${BASE}/api/portfolio`);
    console.log('4. GET /api/portfolio (no auth):', status === 401 ? '401 (expected)' : status === 200 ? '200 (has session)' : `status ${status}`);
  } catch (e) {
    console.log('4. GET /api/portfolio: ERROR -', e.message);
  }

  // 5. Create order (expect 401)
  try {
    const { status } = await fetchJson(`${BASE}/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 10 }),
    });
    console.log('5. POST /create-order (no auth):', status === 401 ? '401 (expected)' : status);
  } catch (e) {
    console.log('5. POST /create-order: ERROR -', e.message);
  }

  // 6. Transactions API (expect 401)
  try {
    const { status } = await fetchJson(`${BASE}/api/transactions`);
    console.log('6. GET /api/transactions (no auth):', status === 401 ? '401 (expected)' : status);
  } catch (e) {
    console.log('6. GET /api/transactions: ERROR -', e.message);
  }

  console.log('\n=== Done ===');
  console.log('To fully test: log in via browser, then try deposit/withdrawal from Manage Funds.');
}

run().catch(console.error);
