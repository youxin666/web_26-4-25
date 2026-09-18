import assert from 'node:assert/strict';

const base = process.env.TRADING_BASE_URL || 'https://trading.858846.xyz';
const getDetail = symbol => fetch(`${base}/api/detail?symbol=${symbol}`, { headers: { 'cache-control': 'no-cache' } }).then(async response => {
  assert.equal(response.status, 200, `${symbol} detail HTTP status`);
  return response.json();
});

for (const symbol of ['BTC', 'ETH', 'SOL']) {
  const [first, second] = await Promise.all([getDetail(symbol), getDetail(symbol)]);
  assert.equal(first.symbol, symbol);
  assert.equal(Object.keys(first.periods || {}).length, 7, `${symbol} period count`);
  assert.ok(first.coverage && first.coverage.oiMarkets >= 1, `${symbol} Coinalyze OI coverage`);
  assert.ok(first.sources?.coinalyze?.updatedAt, `${symbol} Coinalyze timestamp`);
  assert.deepEqual(first, second, `${symbol} canonical snapshot parity`);
}

console.log('coinalyze production snapshots passed');
