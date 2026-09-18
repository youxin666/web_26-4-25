export const COINALYZE_ASSETS = ['BTC', 'ETH', 'SOL'];
export const COINALYZE_EXCHANGES = ['A', '6', '3'];
export const COINALYZE_PERIODS = ['15m', '30m', '1h', '4h', '8h', '12h', '24h'];
export const PERIOD_WINDOWS = { '15m': 3, '30m': 6, '1h': 12, '4h': 48, '8h': 96, '12h': 144, '24h': 288 };
const API_BASE = 'https://api.coinalyze.net/v1';

export function selectMarkets(markets) {
  return Object.fromEntries(COINALYZE_ASSETS.map(asset => [asset,
    COINALYZE_EXCHANGES.map(exchange => markets.find(market =>
      market.base_asset === asset &&
      market.exchange === exchange &&
      market.is_perpetual === true &&
      market.margined === 'STABLE' &&
      /USDT/.test(market.symbol)
    )).filter(Boolean)
  ]));
}

const finite = value => Number.isFinite(Number(value));
const percent = (current, previous) => previous ? (current / previous - 1) * 100 : 0;

function historyBySymbol(series) {
  return new Map((series || []).map(item => [item.symbol, item.history || []]));
}

function buildRows(markets, oiSeries, ohlcvSeries) {
  const oiBySymbol = historyBySymbol(oiSeries);
  const ohlcvBySymbol = historyBySymbol(ohlcvSeries);
  const buckets = new Map();
  for (const market of markets) {
    const oiByTime = new Map((oiBySymbol.get(market.symbol) || []).map(row => [Number(row.t), Number(row.c)]));
    for (const candle of ohlcvBySymbol.get(market.symbol) || []) {
      const timestamp = Number(candle.t);
      const oiUsd = oiByTime.get(timestamp);
      if (!finite(oiUsd) || !finite(candle.c) || !finite(candle.v) || !finite(candle.bv)) continue;
      const bucket = buckets.get(timestamp) || { timestamp, oiUsd: 0, netFlowUsd: 0, oiMarkets: 0, cvdMarkets: 0 };
      bucket.oiUsd += oiUsd;
      bucket.netFlowUsd += (2 * Number(candle.bv) - Number(candle.v)) * Number(candle.c);
      bucket.oiMarkets += 1;
      bucket.cvdMarkets += 1;
      buckets.set(timestamp, bucket);
    }
  }
  return [...buckets.values()].sort((a, b) => a.timestamp - b.timestamp);
}

export function aggregateAssetHistory({ markets, oi, ohlcv, liquidations, ratios }) {
  const rows = buildRows(markets || [], oi, ohlcv);
  const currentOiBySymbol = new Map((oi || []).map(item => [item.symbol, Number(item.history?.at(-1)?.c)]));
  const liquidationsBySymbol = historyBySymbol(liquidations);
  const ratiosBySymbol = historyBySymbol(ratios);
  let longUsd = 0;
  let shortUsd = 0;
  let liquidationMarkets = 0;
  let longWeight = 0;
  let shortWeight = 0;
  let ratioMarkets = 0;
  for (const market of markets || []) {
    const liquidationRows = liquidationsBySymbol.get(market.symbol) || [];
    if (liquidationRows.length) liquidationMarkets += 1;
    for (const row of liquidationRows) {
      if (finite(row.l)) longUsd += Number(row.l);
      if (finite(row.s)) shortUsd += Number(row.s);
    }
    const ratio = ratiosBySymbol.get(market.symbol)?.at(-1);
    const weight = currentOiBySymbol.get(market.symbol);
    if (ratio && finite(ratio.l) && finite(ratio.s) && finite(weight) && weight > 0) {
      longWeight += Number(ratio.l) * weight;
      shortWeight += Number(ratio.s) * weight;
      ratioMarkets += 1;
    }
  }
  const longShortRatio = shortWeight > 0 ? longWeight / shortWeight : null;
  const coverage = {
    oiMarkets: rows.at(-1)?.oiMarkets || 0,
    cvdMarkets: rows.at(-1)?.cvdMarkets || 0,
    ratioMarkets,
    liquidationMarkets,
  };
  return { rows, liquidations: { longUsd, shortUsd }, longShortRatio, coverage };
}

export function calculatePeriods(rows) {
  if (!Array.isArray(rows) || rows.length < PERIOD_WINDOWS['24h'] + 1) throw new Error('Insufficient Coinalyze rows');
  const current = rows.at(-1);
  return Object.fromEntries(COINALYZE_PERIODS.map(period => {
    const samples = PERIOD_WINDOWS[period];
    const baseline = rows.at(-(samples + 1));
    const slice = rows.slice(-(samples + 1));
    return [period, {
      oiPercent: percent(current.oiUsd, baseline.oiUsd),
      netFlowUsd: slice.slice(1).reduce((sum, row) => sum + row.netFlowUsd, 0),
    }];
  }));
}

async function apiJson(path, apiKey) {
  const response = await fetch(`${API_BASE}${path}`, { headers: { api_key: apiKey } });
  if (!response.ok) {
    const error = new Error(`Coinalyze ${response.status}`);
    error.status = response.status;
    error.retryAfter = response.headers.get('retry-after');
    throw error;
  }
  return response.json();
}

export async function fetchCoinalyzeMetrics({ apiKey, marketsByAsset, now = Date.now() }) {
  if (!apiKey) throw new Error('COINALYZE_API_KEY is missing');
  const markets = COINALYZE_ASSETS.flatMap(asset => marketsByAsset[asset] || []);
  if (markets.length !== 9) throw new Error(`Expected exactly nine Coinalyze markets, received ${markets.length}`);
  const symbols = markets.map(market => market.symbol).join(',');
  const to = Math.floor(now / 1000);
  const from = to - 25 * 60 * 60;
  const query = `symbols=${encodeURIComponent(symbols)}&interval=5min&from=${from}&to=${to}`;
  const [oi, ohlcv, liquidations, ratios] = await Promise.all([
    apiJson(`/open-interest-history?${query}&convert_to_usd=true`, apiKey),
    apiJson(`/ohlcv-history?${query}`, apiKey),
    apiJson(`/liquidation-history?${query}&convert_to_usd=true`, apiKey),
    apiJson(`/long-short-ratio-history?${query}`, apiKey),
  ]);
  const assets = Object.fromEntries(COINALYZE_ASSETS.map(asset => {
    const selected = marketsByAsset[asset] || [];
    const aggregated = aggregateAssetHistory({ markets: selected, oi, ohlcv, liquidations, ratios });
    return [asset, {
      currentOiNotional: aggregated.rows.at(-1)?.oiUsd ?? null,
      longShortRatio: aggregated.longShortRatio,
      liquidations: aggregated.liquidations,
      periods: calculatePeriods(aggregated.rows),
      coverage: aggregated.coverage,
    }];
  }));
  return { assets, fetchedAt: now };
}
