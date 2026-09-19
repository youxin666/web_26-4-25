import assert from 'node:assert/strict';
import { PANORAMA_PERIODS, buildPanoramaSnapshot, normalizePanoramaSymbol } from '../trading-panorama.js';

assert.equal(normalizePanoramaSymbol('1000PEPEUSDT'), '1000PEPE');
assert.equal(normalizePanoramaSymbol('BTCUSD'), null);
assert.deepEqual(PANORAMA_PERIODS, ['15m','30m','1h','4h','8h','12h','24h']);

const snapshots = Object.fromEntries(PANORAMA_PERIODS.map((period, index) => [period, {
  updatedAt: 1_000 + index,
  assets: [
    { symbol: 'BTC', current: 1000, percent: index + 1, delta: 10 },
    { symbol: 'ETH', current: 500, percent: -(index + 1), delta: -5 },
  ],
}]));
const snapshot = buildPanoramaSnapshot({
  snapshots,
  tickers: [{ symbol:'BTCUSDT', lastPrice:'100', priceChangePercent:'2', quoteVolume:'12345' }, { symbol:'ETHUSDT', lastPrice:'50', priceChangePercent:'-1', quoteVolume:'999' }],
  premiums: [{ symbol:'BTCUSDT', lastFundingRate:'0.0001' }, { symbol:'ETHUSDT', lastFundingRate:'-0.0002' }],
  coinalyze: { assets: { BTC: { currentOiNotional: 1200, longShortRatio: 1.2, liquidations:{ longUsd: 2, shortUsd: 3 }, periods:{ '4h':{ netFlowUsd: 8 } }, coverage:{ oiMarkets:3 } } } },
});
assert.deepEqual(snapshot.assets.map(asset => asset.symbol), ['BTC','ETH']);
assert.equal(snapshot.assets[0].periods['4h'].oiPercent, 4);
assert.equal(snapshot.assets[0].periods['4h'].netFlowUsd, 8);
assert.equal(snapshot.assets[1].periods['4h'].netFlowUsd, null);
assert.equal(snapshot.assets[1].longShortRatio, null);
assert.equal(snapshot.assets[1].completeness, 'partial');
console.log('trading panorama data tests passed');
