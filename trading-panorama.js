export const PANORAMA_PERIODS = ['15m','30m','1h','4h','8h','12h','24h'];

const finiteOrNull = value => Number.isFinite(Number(value)) ? Number(value) : null;

export function normalizePanoramaSymbol(pair) {
  const value = String(pair || '').toUpperCase();
  return /^[A-Z0-9]+USDT$/.test(value) ? value.slice(0, -4) : null;
}

export function buildPanoramaSnapshot({ snapshots, tickers = [], premiums = [], coinalyze = {} }) {
  const tickerBySymbol = new Map(tickers.map(item => [normalizePanoramaSymbol(item.symbol), item]));
  const premiumBySymbol = new Map(premiums.map(item => [normalizePanoramaSymbol(item.symbol), item]));
  const base = snapshots['4h']?.assets || Object.values(snapshots).find(item => item?.assets)?.assets || [];
  const updatedAt = Math.min(...PANORAMA_PERIODS.map(period => Number(snapshots[period]?.updatedAt)).filter(Number.isFinite));
  const assets = base.map((asset, index) => {
    const symbol = asset.symbol;
    const ticker = tickerBySymbol.get(symbol) || {};
    const premium = premiumBySymbol.get(symbol) || {};
    const enriched = coinalyze.assets?.[symbol] || null;
    const periods = Object.fromEntries(PANORAMA_PERIODS.map(period => {
      const item = snapshots[period]?.assets?.find(candidate => candidate.symbol === symbol);
      return [period, {
        oiPercent: finiteOrNull(item?.percent),
        oiDeltaUsd: finiteOrNull(item?.delta),
        netFlowUsd: finiteOrNull(enriched?.periods?.[period]?.netFlowUsd),
      }];
    }));
    return {
      symbol, oiRank: index + 1,
      price: finiteOrNull(ticker.lastPrice),
      price24hPercent: finiteOrNull(ticker.priceChangePercent),
      currentOi: finiteOrNull(enriched?.currentOiNotional) ?? finiteOrNull(asset.current),
      fundingRate: finiteOrNull(premium.lastFundingRate),
      volume24hUsd: finiteOrNull(ticker.quoteVolume),
      longShortRatio: finiteOrNull(enriched?.longShortRatio),
      liquidations: enriched?.liquidations || null,
      periods,
      coverage: enriched?.coverage || { oiMarkets: 0, cvdMarkets: 0, ratioMarkets: 0, liquidationMarkets: 0 },
      completeness: enriched ? 'complete' : 'partial',
    };
  }).sort((a, b) => b.currentOi - a.currentOi || a.symbol.localeCompare(b.symbol));
  assets.forEach((asset, index) => { asset.oiRank = index + 1; });
  return { updatedAt, assets, sources: { binance: true, coinalyzeUpdatedAt: coinalyze.fetchedAt || null } };
}
