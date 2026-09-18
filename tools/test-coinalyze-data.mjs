import assert from 'node:assert/strict';
import { selectMarkets } from '../trading-coinalyze.js';

const selected = selectMarkets([
  { symbol: 'BTCUSDT_PERP.A', base_asset: 'BTC', exchange: 'A', is_perpetual: true, margined: 'STABLE', has_buy_sell_data: true, has_long_short_ratio_data: true },
  { symbol: 'BTCUSDT.6', base_asset: 'BTC', exchange: '6', is_perpetual: true, margined: 'STABLE', has_buy_sell_data: true, has_long_short_ratio_data: true },
  { symbol: 'BTCUSDT_PERP.3', base_asset: 'BTC', exchange: '3', is_perpetual: true, margined: 'STABLE', has_buy_sell_data: true, has_long_short_ratio_data: false },
]);

assert.deepEqual(selected.BTC.map(item => item.symbol), ['BTCUSDT_PERP.A', 'BTCUSDT.6', 'BTCUSDT_PERP.3']);
console.log('coinalyze data tests passed');
