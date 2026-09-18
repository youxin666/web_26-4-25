import assert from 'node:assert/strict';
import { aggregateAssetHistory, selectMarkets } from '../trading-coinalyze.js';

const selected = selectMarkets([
  { symbol: 'BTCUSDT_PERP.A', base_asset: 'BTC', exchange: 'A', is_perpetual: true, margined: 'STABLE', has_buy_sell_data: true, has_long_short_ratio_data: true },
  { symbol: 'BTCUSDT.6', base_asset: 'BTC', exchange: '6', is_perpetual: true, margined: 'STABLE', has_buy_sell_data: true, has_long_short_ratio_data: true },
  { symbol: 'BTCUSDT_PERP.3', base_asset: 'BTC', exchange: '3', is_perpetual: true, margined: 'STABLE', has_buy_sell_data: true, has_long_short_ratio_data: false },
]);

assert.deepEqual(selected.BTC.map(item => item.symbol), ['BTCUSDT_PERP.A', 'BTCUSDT.6', 'BTCUSDT_PERP.3']);

const aggregate = aggregateAssetHistory({
  markets: [{ symbol: 'BTCUSDT_PERP.A' }],
  oi: [{ symbol: 'BTCUSDT_PERP.A', history: [{ t: 0, c: 100 }, { t: 300, c: 120 }] }],
  ohlcv: [{ symbol: 'BTCUSDT_PERP.A', history: [{ t: 0, c: 10, v: 8, bv: 5 }, { t: 300, c: 10, v: 12, bv: 9 }] }],
  liquidations: [{ symbol: 'BTCUSDT_PERP.A', history: [{ t: 300, l: 40, s: 10 }] }],
  ratios: [{ symbol: 'BTCUSDT_PERP.A', history: [{ t: 300, r: 2, l: 0.66, s: 0.34 }] }],
});
assert.equal(aggregate.rows.at(-1).oiUsd, 120);
assert.equal(aggregate.rows.at(-1).netFlowUsd, 60);
assert.equal(aggregate.liquidations.longUsd, 40);
assert.ok(Math.abs(aggregate.longShortRatio - 0.66 / 0.34) < 1e-12);
console.log('coinalyze data tests passed');
