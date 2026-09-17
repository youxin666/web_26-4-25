import assert from 'node:assert/strict';
import { PERIOD_WINDOWS, classifyDirection, calculateWindow, normalizeDetailSnapshot } from '../trading-public/market-detail-data.js';

assert.deepEqual(PERIOD_WINDOWS, { '15m': 3, '30m': 6, '1h': 12, '4h': 48, '8h': 96, '12h': 144, '24h': 288 });
assert.equal(classifyDirection(1, 1).key, 'long-build');
assert.equal(classifyDirection(-1, 1).key, 'short-build');
assert.equal(classifyDirection(1, -1).key, 'short-cover');
assert.equal(classifyDirection(-1, -1).key, 'long-exit');

const rows = Array.from({ length: 49 }, (_, index) => ({
  timestamp: 1_000 + index * 300_000, price: 100 + index,
  oiQuantity: 1_000 + index * 5, oiNotional: (1_000 + index * 5) * (100 + index),
  buyUsd: 20_000 + index * 100, sellUsd: 18_000 + index * 50,
}));
const metric = calculateWindow(rows, 48);
assert.equal(metric.pricePercent.toFixed(2), '48.00');
assert.equal(metric.oiPercent.toFixed(2), '24.00');
assert.equal(metric.netFlowUsd, 154_800);
assert.equal(metric.direction.key, 'long-build');

const snapshot = normalizeDetailSnapshot({
  symbol: 'BTC', updatedAt: 1_800_000_000_000,
  current: { price: 76_000, oiNotional: 44_000_000_000, longShortRatio: 1.2, fundingRate: 0.0001 },
  periods: { '4h': metric },
});
assert.equal(snapshot.symbol, 'BTC');
assert.equal(snapshot.periods['4h'].direction.key, 'long-build');
assert.throws(() => normalizeDetailSnapshot({ symbol: 'XRP' }), /Unsupported symbol/);
console.log('trading detail data tests passed');
