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
const DETAIL_SYMBOLS = ['BTC', 'ETH', 'SOL'];
const DETAIL_PERIODS = ['15m', '30m', '1h', '4h', '8h', '12h', '24h'];

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

const detailObject = env => env.MARKET_SNAPSHOT.getByName('global-market-snapshot');

async function detailSnapshot(request, env, url) {
  const symbol = String(url.searchParams.get('symbol') || '').toUpperCase();
  if (!DETAIL_SYMBOLS.includes(symbol)) return json({ error: 'Unsupported symbol' }, 400);
  return detailObject(env).fetch(new Request(`https://snapshot.internal/detail/${symbol}`, request));
}

async function liquidationData(request, env, url) {
  const symbol = String(url.searchParams.get('symbol') || 'ALL').toUpperCase();
  if (symbol !== 'ALL' && !DETAIL_SYMBOLS.includes(symbol)) return json({ error: 'Unsupported symbol' }, 400);
  return detailObject(env).fetch(new Request(`https://snapshot.internal/liquidations/${symbol}`, request));
}

function parseMoney(value) {
  const cleaned = value.replace(/[$,\s]/g, '');
  const negative = cleaned.startsWith('(') && cleaned.endsWith(')');
  const amount = Number(cleaned.replace(/[()]/g, ''));
  return Number.isFinite(amount) ? (negative ? -amount : amount) * 1_000_000 : null;
}

function parseLatestEtfFlow(html) {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map(match => match[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
    if (!cells.length || !/\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/.test(cells[0])) continue;
    const candidates = cells.slice(1).map(parseMoney).filter(value => value !== null);
    if (candidates.length) return { date: cells[0], flowUsd: candidates.at(-1) };
  }
  throw new Error('ETF table format unavailable');
}

async function etfData(request, env, url) {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  const symbol = String(url.searchParams.get('symbol') || '').toUpperCase();
  if (!DETAIL_SYMBOLS.includes(symbol)) return json({ error: 'Unsupported symbol' }, 400);
  const object = detailObject(env);
  const cachedResponse = await object.fetch(`https://snapshot.internal/etf/${symbol}`);
  const cached = await cachedResponse.json();
  if (cached.available && Date.now() - cached.updatedAt < 21_600_000) return json(cached);
  if (symbol === 'SOL') return json({ symbol, available: false, reason: 'No reliable free source' });
  const sourceUrl = symbol === 'BTC' ? 'https://farside.co.uk/btc/' : 'https://farside.co.uk/eth/';
  try {
    const response = await fetch(sourceUrl, { headers: { 'user-agent': 'market-oi-observatory/1.0' } });
    if (!response.ok) throw new Error(`ETF source ${response.status}`);
    const parsed = parseLatestEtfFlow(await response.text());
    const payload = { symbol, available: true, ...parsed, sourceUrl, updatedAt: Date.now() };
    return object.fetch(new Request(`https://snapshot.internal/etf/${symbol}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
    }));
  } catch {
    return json(cached.available ? { ...cached, stale: true } : { symbol, available: false });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/market') return marketData(request, env, url);
    if (url.pathname === '/api/detail') return detailSnapshot(request, env, url);
    if (url.pathname === '/api/liquidations') return liquidationData(request, env, url);
    if (url.pathname === '/api/etf') return etfData(request, env, url);
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
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'detail') return this.detail(request, parts[1]);
    if (parts[0] === 'liquidations') return this.liquidations(request, parts[1]);
    if (parts[0] === 'etf') return this.etf(request, parts[1]);
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

  async detail(request, symbol) {
    if (!DETAIL_SYMBOLS.includes(symbol)) return json({ error: 'Unsupported symbol' }, 400);
    const key = `detail:${symbol}`;
    const existing = await this.state.storage.get(key);
    if (request.method === 'GET') {
      if (!existing) return json({ needsSeed: true, symbol });
      return json({ ...existing, stale: Date.now() - existing.updatedAt > 60_000 });
    }
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (existing && Date.now() - existing.updatedAt < 45_000) return json({ ...existing, stale: false });
    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const current = body?.current || {};
    const fresh = Number.isFinite(Number(body?.updatedAt)) && Math.abs(Date.now() - Number(body.updatedAt)) <= 120_000;
    const validCurrent = ['price', 'oiNotional', 'longShortRatio', 'fundingRate'].every(field => Number.isFinite(Number(current[field])));
    const periods = body?.periods || {};
    const validPeriods = DETAIL_PERIODS.every(period => {
      const metric = periods[period];
      return metric && ['pricePercent', 'oiPercent', 'netFlowUsd'].every(field => Number.isFinite(Number(metric[field])));
    });
    if (body?.symbol !== symbol || !fresh || !validCurrent || !validPeriods) return json({ error: 'Invalid detail snapshot' }, 400);
    const snapshot = {
      symbol, updatedAt: Number(body.updatedAt),
      current: Object.fromEntries(Object.entries(current).map(([keyName, value]) => [keyName, Number(value)])),
      periods: Object.fromEntries(DETAIL_PERIODS.map(period => [period, {
        pricePercent: Number(periods[period].pricePercent), oiPercent: Number(periods[period].oiPercent),
        netFlowUsd: Number(periods[period].netFlowUsd), direction: periods[period].direction,
      }])),
    };
    await this.state.storage.put(key, snapshot);
    return json({ ...snapshot, stale: false });
  }

  async liquidations(request, symbol = 'ALL') {
    const key = 'liquidation:events';
    const now = Date.now();
    let events = (await this.state.storage.get(key)) || [];
    events = events.filter(event => now - event.timestamp <= 86_400_000);
    if (request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
      const known = new Set(events.map(event => event.id));
      for (const event of Array.isArray(body.events) ? body.events : []) {
        if (known.has(event.id) || !DETAIL_SYMBOLS.includes(event.symbol) || !['BUY', 'SELL'].includes(event.side)) continue;
        if (!Number.isFinite(Number(event.usd)) || event.usd < 0 || event.usd > 1_000_000_000) continue;
        if (!Number.isFinite(Number(event.timestamp)) || Math.abs(now - event.timestamp) > 300_000) continue;
        events.push({ id: String(event.id).slice(0, 180), symbol: event.symbol, side: event.side, timestamp: Number(event.timestamp), usd: Number(event.usd) });
        known.add(event.id);
      }
      events = events.slice(-5_000);
      await this.state.storage.put(key, events);
    } else if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
    const selected = symbol === 'ALL' ? events : events.filter(event => event.symbol === symbol);
    const startedAt = selected.length ? Math.min(...selected.map(event => event.timestamp)) : now;
    return json({
      symbol, updatedAt: now, startedAt,
      longLiquidationUsd: selected.filter(event => event.side === 'SELL').reduce((sum, event) => sum + event.usd, 0),
      shortLiquidationUsd: selected.filter(event => event.side === 'BUY').reduce((sum, event) => sum + event.usd, 0),
      complete24h: now - startedAt >= 86_400_000,
    });
  }

  async etf(request, symbol) {
    if (!DETAIL_SYMBOLS.includes(symbol)) return json({ error: 'Unsupported symbol' }, 400);
    const key = `etf:${symbol}`;
    if (request.method === 'GET') return json((await this.state.storage.get(key)) || { symbol, available: false });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    if (!body.available || body.symbol !== symbol || !Number.isFinite(Number(body.flowUsd))) return json({ error: 'Invalid ETF snapshot' }, 400);
    const value = { symbol, available: true, flowUsd: Number(body.flowUsd), date: String(body.date), sourceUrl: String(body.sourceUrl), updatedAt: Date.now() };
    await this.state.storage.put(key, value);
    return json(value);
  }
}
