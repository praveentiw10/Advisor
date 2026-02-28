/**
 * Test script: signup -> login -> buy stock -> check portfolio & orders
 * Run with: node scripts/test-buy-flow.js
 * Server must be running on http://localhost:3000
 */

const BASE = 'http://localhost:3000';

function getCookieHeader(setCookie) {
  if (!setCookie) return '';
  const parts = Array.isArray(setCookie) ? setCookie : [setCookie];
  return parts
    .map((s) => s.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

async function run() {
  const name = 'TestUser' + Date.now();
  const email = 'test' + Date.now() + '@test.com';
  const password = 'test1234';

  let cookie = '';

  console.log('1. Signup...');
  const signRes = await fetch(BASE + '/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
    redirect: 'manual',
  });
  cookie = getCookieHeader(signRes.headers.get('set-cookie')) || cookie;
  const signData = await signRes.json().catch(() => ({}));
  if (!signData.success && signData.message && !signData.message.includes('already exists')) {
    console.log('Signup response:', signData);
  }
  console.log('   Session cookie:', cookie ? 'OK' : 'none');

  if (!cookie) {
    console.log('2. Login (in case user existed)...');
    const loginRes = await fetch(BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password }),
      redirect: 'manual',
    });
    cookie = getCookieHeader(loginRes.headers.get('set-cookie')) || cookie;
    const loginData = await loginRes.json().catch(() => ({}));
    if (!loginData.success) {
      console.log('   Login response:', loginData);
    }
  }

  const headers = { Cookie: cookie };
  if (!cookie) {
    console.error('No session cookie. Cannot test portfolio/trade.');
    process.exit(1);
  }

  console.log('3. GET /api/portfolio (before buy)...');
  const port1 = await fetch(BASE + '/api/portfolio', { headers });
  const port1Data = await port1.json().catch(() => ({}));
  if (!port1Data.success) {
    console.log('   Portfolio response:', port1Data);
    process.exit(1);
  }
  const cashBefore = port1Data.portfolio?.cashBalance ?? 0;
  console.log('   Cash:', cashBefore, '| Holdings:', (port1Data.portfolio?.holdings || []).length);

  console.log('4. POST /api/trade (Buy 2 AAPL)...');
  const tradeRes = await fetch(BASE + '/api/trade', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol: 'AAPL', side: 'BUY', quantity: 2 }),
  });
  const tradeData = await tradeRes.json().catch(() => ({}));
  if (!tradeData.success) {
    console.log('   Trade response:', tradeData);
    process.exit(1);
  }
  console.log('   ', tradeData.message);

  console.log('5. GET /api/portfolio (after buy)...');
  const port2 = await fetch(BASE + '/api/portfolio', { headers });
  const port2Data = await port2.json().catch(() => ({}));
  if (!port2Data.success) {
    console.log('   Portfolio response:', port2Data);
    process.exit(1);
  }
  const p = port2Data.portfolio;
  console.log('   Cash:', p?.cashBalance, '| Total value:', p?.portfolioValue);
  console.log('   Holdings:', (p?.holdings || []).map((h) => `${h.symbol} x${h.quantity} @ ${h.ltp}`).join(', ') || 'none');

  console.log('6. GET /api/orders...');
  const ordersRes = await fetch(BASE + '/api/orders', { headers });
  const ordersData = await ordersRes.json().catch(() => ({}));
  if (!ordersData.success) {
    console.log('   Orders response:', ordersData);
    process.exit(1);
  }
  const orders = ordersData.orders || [];
  console.log('   Orders count:', orders.length);
  if (orders.length) {
    const last = orders[0];
    console.log('   Latest:', last.side, last.quantity, last.symbol, '@', last.price, '=', last.amount);
  }

  console.log('\nAll checks passed. Buy flow and details work.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
