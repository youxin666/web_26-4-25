export const DETAIL_SYMBOLS = ['BTC', 'ETH', 'SOL'];
export const DETAIL_PERIODS = ['15m', '30m', '1h', '4h', '8h', '12h', '24h'];
export const PERIOD_WINDOWS = {
  '15m': 3, '30m': 6, '1h': 12, '4h': 48,
  '8h': 96, '12h': 144, '24h': 288,
};

const BINANCE_FUTURES = 'https://fapi.binance.com';
const finite = value => Number.isFinite(Number(value));
const percent = (current, previous) => previous ? (current / previous - 1) * 100 : 0;

export function classifyDirection(pricePercent, oiPercent) {
  if (pricePercent >= 0 && oiPercent >= 0) return { key: 'long-build', label: '多头增仓', tone: 'positive' };
  if (pricePercent < 0 && oiPercent >= 0) return { key: 'short-build', label: '空头增仓', tone: 'negative' };
  if (pricePercent >= 0 && oiPercent < 0) return { key: 'short-cover', label: '空头止损', tone: 'positive' };
  return { key: 'long-exit', label: '多头止损', tone: 'negative' };
}

export function calculateWindow(rows, windowSamples) {
  if (!Array.isArray(rows) || rows.length <= windowSamples) throw new Error('Insufficient rolling samples');
  const current = rows.at(-1);
  const baseline = rows.at(-(windowSamples + 1));
  const slice = rows.slice(-(windowSamples + 1));
  const pricePercent = percent(current.price, baseline.price);
  const oiPercent = percent(current.oiQuantity, baseline.oiQuantity);
  const netFlowUsd = slice.slice(1).reduce((sum, row) => sum + row.buyUsd - row.sellUsd, 0);
  return { pricePercent, oiPercent, netFlowUsd, direction: classifyDirection(pricePercent, oiPercent) };
}

export function normalizeDetailSnapshot(input) {
  if (!DETAIL_SYMBOLS.includes(input?.symbol)) throw new Error('Unsupported symbol');
  if (!finite(input.updatedAt)) throw new Error('Invalid timestamp');
  const current = input.current || {};
  for (const key of ['price', 'oiNotional', 'longShortRatio', 'fundingRate']) {
    if (!finite(current[key])) throw new Error(`Invalid current.${key}`);
  }
  const periods = {};
  for (const [period, value] of Object.entries(input.periods || {})) {
    if (!DETAIL_PERIODS.includes(period)) continue;
    if (!['pricePercent', 'oiPercent', 'netFlowUsd'].every(key => finite(value[key]))) continue;
    periods[period] = {
      pricePercent: Number(value.pricePercent), oiPercent: Number(value.oiPercent),
      netFlowUsd: Number(value.netFlowUsd),
      direction: classifyDirection(Number(value.pricePercent), Number(value.oiPercent)),
    };
  }
  const periodCount = Object.keys(periods).length;
  if (periodCount !== DETAIL_PERIODS.length && periodCount !== 1) throw new Error('Incomplete period metrics');
  return {
    symbol: input.symbol, updatedAt: Number(input.updatedAt),
    current: Object.fromEntries(Object.entries(current).map(([key, value]) => [key, Number(value)])),
    periods,
  };
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Binance ${response.status}`);
  return response.json();
}

export async function collectDetailSnapshot(symbol) {
  if (!DETAIL_SYMBOLS.includes(symbol)) throw new Error('Unsupported symbol');
  const pair = `${symbol}USDT`;
  // Binance's taker-volume series can trail klines/OI by one or two buckets.
  // Fetch extra history so the 24h baseline remains complete after timestamp joins.
  const query = new URLSearchParams({ symbol: pair, period: '5m', limit: '300' });
  const [klines, oiRows, takerRows, premium, currentOi, ratios] = await Promise.all([
    getJson(`${BINANCE_FUTURES}/fapi/v1/klines?symbol=${pair}&interval=5m&limit=300`),
    getJson(`${BINANCE_FUTURES}/futures/data/openInterestHist?${query}`),
    getJson(`${BINANCE_FUTURES}/futures/data/takerlongshortRatio?${query}`),
    getJson(`${BINANCE_FUTURES}/fapi/v1/premiumIndex?symbol=${pair}`),
    getJson(`${BINANCE_FUTURES}/fapi/v1/openInterest?symbol=${pair}`),
    getJson(`${BINANCE_FUTURES}/futures/data/globalLongShortAccountRatio?symbol=${pair}&period=5m&limit=2`),
  ]);

  const oiByTime = new Map(oiRows.map(row => [Number(row.timestamp), row]));
  const takerByTime = new Map(takerRows.map(row => [Number(row.timestamp), row]));
  const rows = klines.map(kline => {
    const timestamp = Number(kline[0]);
    const oi = oiByTime.get(timestamp);
    const taker = takerByTime.get(timestamp);
    if (!oi || !taker) return null;
    const price = Number(kline[4]);
    return {
      timestamp, price,
      oiQuantity: Number(oi.sumOpenInterest),
      oiNotional: Number(oi.sumOpenInterestValue),
      buyUsd: Number(taker.buyVol) * price,
      sellUsd: Number(taker.sellVol) * price,
    };
  }).filter(Boolean);
  if (rows.length < 289) throw new Error(`Insufficient aligned rows: ${rows.length}`);

  const price = Number(premium.markPrice);
  const oiQuantity = Number(currentOi.openInterest);
  rows.push({ timestamp: Date.now(), price, oiQuantity, oiNotional: price * oiQuantity, buyUsd: 0, sellUsd: 0 });
  const periods = Object.fromEntries(DETAIL_PERIODS.map(period => [period, calculateWindow(rows, PERIOD_WINDOWS[period])]));
  return normalizeDetailSnapshot({
    symbol, updatedAt: Date.now(),
    current: {
      price, oiNotional: price * oiQuantity,
      longShortRatio: Number(ratios.at(-1)?.longShortRatio ?? 0),
      fundingRate: Number(premium.lastFundingRate),
    },
    periods,
  });
}
