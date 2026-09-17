const SYMBOLS = [
  'BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT','BNBUSDT','DOGEUSDT','ADAUSDT','LINKUSDT','AVAXUSDT','LTCUSDT',
  'BCHUSDT','SUIUSDT','TRXUSDT','DOTUSDT','UNIUSDT','AAVEUSDT','NEARUSDT','APTUSDT','ETCUSDT','ICPUSDT',
  'FILUSDT','ATOMUSDT','ARBUSDT','OPUSDT','INJUSDT','TIAUSDT','SEIUSDT','WLDUSDT','ENAUSDT','PENDLEUSDT',
  'RENDERUSDT','TAOUSDT','FETUSDT','RUNEUSDT','JUPUSDT','GALAUSDT','SANDUSDT','MANAUSDT','AXSUSDT','APEUSDT',
  '1000PEPEUSDT','1000SHIBUSDT','WIFUSDT','BONKUSDT','FLOKIUSDT','ORDIUSDT','LDOUSDT','CRVUSDT','DYDXUSDT','STXUSDT',
  'IMXUSDT','MKRUSDT','COMPUSDT','SUSHIUSDT','ZECUSDT','DASHUSDT','KSMUSDT','EGLDUSDT','THETAUSDT','CHZUSDT'
];

const PERIODS = {
  '5m': { api: '5m', limit: 2 }, '15m': { api: '15m', limit: 2 }, '30m': { api: '30m', limit: 2 },
  '1h': { api: '1h', limit: 2 }, '4h': { api: '4h', limit: 2 }, '8h': { api: '4h', limit: 3 },
  '12h': { api: '4h', limit: 4 }, '24h': { api: '4h', limit: 7 }
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=45, s-maxage=45' }
});

async function fetchHistory(symbol, period) {
  const spec = PERIODS[period] || PERIODS['4h'];
  const url = `https://www.binance.com/futures/data/openInterestHist?symbol=${symbol}&period=${spec.api}&limit=${spec.limit}`;
  const response = await fetch(url, { cf: { cacheTtl: 45, cacheEverything: true } });
  if (!response.ok) throw new Error(`Binance ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length < 2) throw new Error('Insufficient OI history');
  const notionalValues = rows.map(row => Number(row.sumOpenInterestValue));
  const quantityValues = rows.map(row => Number(row.sumOpenInterest));
  const current = notionalValues.at(-1);
  const delta = current - notionalValues[0];
  const quantityDelta = quantityValues.at(-1) - quantityValues[0];
  const streak = quantityValues.slice(1).reduce((count, value, index) => value > quantityValues[index] ? count + 1 : 0, 0);
  return { symbol: symbol.replace('USDT', ''), current, delta, percent: quantityValues[0] ? quantityDelta / quantityValues[0] * 100 : 0, streak };
}

async function marketData(request, env, url) {
  const period = url.searchParams.get('period') || '4h';
  if (!PERIODS[period]) return json({ error: 'Unsupported period' }, 400);
  const object = env.MARKET_SNAPSHOT.getByName('global-market-snapshot');
  return object.fetch(new Request(`https://snapshot.internal/${period}`, request));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/market') return marketData(request, env, url);
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('x-content-type-options', 'nosniff');
    headers.set('referrer-policy', 'strict-origin-when-cross-origin');
    if (/\.(?:css|js)$/.test(url.pathname)) headers.set('cache-control', 'public, max-age=86400, stale-while-revalidate=604800');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
};

export class MarketSnapshot {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const period = url.pathname.slice(1);
    if (!PERIODS[period]) return json({ error: 'Unsupported period' }, 400);
    const key = `snapshot:${period}`;
    const existing = await this.state.storage.get(key);

    if (request.method === 'GET') {
      if (!existing) return json({ needsSeed: true, period });
      return json({ ...existing, stale: Date.now() - existing.updatedAt > 60_000 });
    }

    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (existing && Date.now() - existing.updatedAt < 45_000) return json({ ...existing, stale: false });

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    if (!Array.isArray(body.assets) || body.assets.length < 20 || body.assets.length > 100) return json({ error: 'Invalid asset count' }, 400);
    const assets = body.assets.filter(asset =>
      typeof asset.symbol === 'string' && /^[A-Z0-9]{2,16}$/.test(asset.symbol) &&
      ['current','delta','percent','streak'].every(field => Number.isFinite(Number(asset[field])))
    ).map(asset => ({
      symbol: asset.symbol,
      current: Number(asset.current), delta: Number(asset.delta), percent: Number(asset.percent), streak: Number(asset.streak)
    })).sort((a, b) => b.current - a.current);
    if (assets.length < 20) return json({ error: 'Insufficient valid assets' }, 400);
    const snapshot = { source: 'Binance USDⓈ-M Futures', period, updatedAt: Date.now(), assets };
    await this.state.storage.put(key, snapshot);
    return json({ ...snapshot, stale: false });
  }
}
