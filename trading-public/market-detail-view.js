import { DETAIL_PERIODS, collectDetailSnapshot } from './market-detail-data.js';

const state = { symbol: 'BTC', snapshot: null, liquidation: null, etf: null, visible: false, refreshTimer: 0, socket: null, reconnectAttempt: 0, eventBuffer: [] };
const detailView = document.querySelector('#detail-view');
const summary = document.querySelector('#detail-summary');
const quadrant = document.querySelector('#quadrant-card');
const directionStrip = document.querySelector('#direction-strip');
const charts = document.querySelector('#evidence-charts');
const source = document.querySelector('#detail-source');

const usd = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: value >= 1_000 ? 0 : 2 }).format(value);
const compactUsd = value => `$${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value)}`;
const signed = (value, suffix = '%') => `${value >= 0 ? '+' : ''}${value.toFixed(2)}${suffix}`;
const signedUsd = value => `${value >= 0 ? '+' : '-'}${compactUsd(Math.abs(value))}`;
const tone = value => value >= 0 ? 'positive' : 'negative';
const time = value => new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function summaryTile(label, value, meta = '') {
  return `<div class="summary-tile"><span>${label}</span><strong>${value}</strong><small>${meta}</small></div>`;
}

function render() {
  if (!state.snapshot) return;
  const { current, periods, updatedAt } = state.snapshot;
  const liq = state.liquidation;
  const etf = state.etf;
  document.querySelector('#detail-title').textContent = `${state.symbol} 数据详情`;
  summary.innerHTML = [
    summaryTile('当前价格', usd(current.price), `快照 ${time(updatedAt)}`),
    summaryTile('当前 OI', compactUsd(current.oiNotional), '估算名义价值'),
    summaryTile('账户多空比', current.longShortRatio.toFixed(3), 'Binance 全账户'),
    summaryTile('ETF 净流入', etf?.available ? signedUsd(etf.flowUsd) : '—', etf?.available ? `${etf.date} · 日度` : '暂无可靠免费数据'),
    summaryTile('资金费率', `${(current.fundingRate * 100).toFixed(4)}%`, '当前永续费率'),
    summaryTile('24H 爆仓', liq ? `${compactUsd(liq.longLiquidationUsd)} / ${compactUsd(liq.shortLiquidationUsd)}` : '—', liq ? (liq.complete24h ? '多 / 空 · 完整24H' : `多 / 空 · 自 ${time(liq.startedAt)} 起`) : '正在累计'),
  ].join('');

  const focus = periods['24h'];
  const scale = Math.max(Math.abs(focus.pricePercent), Math.abs(focus.oiPercent), 1);
  const x = Math.max(10, Math.min(90, 50 + focus.pricePercent / scale * 38));
  const y = Math.max(10, Math.min(90, 50 - focus.oiPercent / scale * 38));
  quadrant.innerHTML = `<div class="quadrant-title"><h3>24H 价格 × OI 方向</h3><span class="${focus.direction.tone}">${focus.direction.label}</span></div>
    <div class="quadrant-plot">
      <span class="quadrant-label tl">空头增仓<br>价格↓ OI↑</span><span class="quadrant-label tr">多头增仓<br>价格↑ OI↑</span>
      <span class="quadrant-label bl">多头止损<br>价格↓ OI↓</span><span class="quadrant-label br">空头止损<br>价格↑ OI↓</span>
      <div class="quadrant-marker" style="--x:${x}%;--y:${y}%"><b>● ${state.symbol}</b>价格 <span class="${tone(focus.pricePercent)}">${signed(focus.pricePercent)}</span><br>OI　 <span class="${tone(focus.oiPercent)}">${signed(focus.oiPercent)}</span></div>
    </div>`;

  directionStrip.innerHTML = DETAIL_PERIODS.map(period => {
    const metric = periods[period];
    return `<div class="direction-cell"><b>${period.toUpperCase()}</b><span class="${metric.direction.tone}">${metric.direction.label}</span></div>`;
  }).join('');
  charts.innerHTML = [
    renderPanel('价格变化', '%', periods, 'pricePercent', value => signed(value)),
    renderPanel('OI 变化', '%', periods, 'oiPercent', value => signed(value)),
    renderPanel('主动资金流', 'USD', periods, 'netFlowUsd', signedUsd),
  ].join('');
  source.innerHTML = `<span>Binance USDⓈ-M 单交易所 · 统一快照 ${time(updatedAt)}</span><span>${etf?.available ? `<a href="${etf.sourceUrl}" target="_blank" rel="noreferrer">ETF 来源：Farside Investors</a>` : 'ETF：无可靠免费数据'}</span>`;
}

function renderPanel(title, unit, periods, field, formatter) {
  const values = DETAIL_PERIODS.map(period => periods[period][field]);
  const max = Math.max(...values.map(Math.abs), 0.000001);
  return `<article class="evidence-panel"><div class="evidence-title"><h3>${title}</h3><span>${unit}</span></div><div class="evidence-scale"><span>减少 / 流出</span><span>0</span><span>增加 / 流入</span></div><div class="metric-bars">${DETAIL_PERIODS.map(period => {
    const value = periods[period][field];
    return `<div class="metric-bar-row"><b>${period.toUpperCase()}</b><div class="metric-bar-track"><i class="metric-bar-fill ${tone(value)}" style="--size:${Math.max(1.5, Math.abs(value) / max * 50)}%"></i></div><span class="metric-bar-value ${tone(value)}">${formatter(value)}</span></div>`;
  }).join('')}</div></article>`;
}

async function getJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function loadDetail(symbol, { force = false } = {}) {
  state.symbol = symbol;
  document.querySelectorAll('[data-symbol]').forEach(button => button.setAttribute('aria-selected', String(button.dataset.symbol === symbol)));
  let shared;
  try {
    shared = await getJson(`/api/detail?symbol=${symbol}`);
    if (!force && shared?.current && !shared.stale) state.snapshot = shared;
  } catch {}
  if (!state.snapshot || state.snapshot.symbol !== symbol || force || shared?.stale) {
    try {
      const candidate = await collectDetailSnapshot(symbol);
      state.snapshot = await getJson(`/api/detail?symbol=${symbol}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(candidate) });
    } catch {
      if (shared?.current) state.snapshot = shared;
    }
  }
  [state.liquidation, state.etf] = await Promise.all([
    getJson(`/api/liquidations?symbol=${symbol}`).catch(() => null),
    getJson(`/api/etf?symbol=${symbol}`).catch(() => null),
  ]);
  if (!state.snapshot || state.snapshot.symbol !== symbol) {
    summary.innerHTML = '<div class="detail-error">当前网络无法生成统一看盘快照，请稍后刷新。</div>';
    return;
  }
  render();
}

function startRefresh() {
  clearInterval(state.refreshTimer);
  state.refreshTimer = setInterval(() => {
    if (state.visible && document.visibilityState === 'visible') loadDetail(state.symbol, { force: true });
  }, 60_000);
}

function startLiquidationSocket() {
  if (!state.visible || document.visibilityState !== 'visible' || state.socket) return;
  const socket = new WebSocket('wss://fstream.binance.com/ws/!forceOrder@arr');
  state.socket = socket;
  socket.onopen = () => { state.reconnectAttempt = 0; };
  socket.onmessage = event => {
    const payload = JSON.parse(event.data);
    const order = payload.o || payload.data?.o;
    if (!order || !['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].includes(order.s)) return;
    const symbol = order.s.replace('USDT', '');
    const timestamp = Number(order.T || payload.E || Date.now());
    const price = Number(order.ap || order.p);
    const quantity = Number(order.z || order.q);
    state.eventBuffer.push({ id: `${order.s}:${timestamp}:${order.S}:${price}:${quantity}`, symbol, side: order.S, timestamp, usd: price * quantity });
  };
  socket.onclose = () => {
    state.socket = null;
    if (!state.visible) return;
    const delays = [2_000, 5_000, 15_000, 30_000];
    setTimeout(startLiquidationSocket, delays[Math.min(state.reconnectAttempt++, delays.length - 1)]);
  };
}

function stopLiquidationSocket() {
  if (state.socket) { state.socket.onclose = null; state.socket.close(); state.socket = null; }
}

setInterval(async () => {
  if (!state.eventBuffer.length) return;
  const events = state.eventBuffer.splice(0);
  await getJson('/api/liquidations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ events }) }).catch(() => state.eventBuffer.unshift(...events));
}, 5_000);

document.querySelectorAll('[data-symbol]').forEach(button => button.addEventListener('click', () => loadDetail(button.dataset.symbol)));
window.addEventListener('market-detail:visible', event => {
  state.visible = event.detail.visible;
  if (state.visible) { loadDetail(state.symbol); startRefresh(); startLiquidationSocket(); }
  else { clearInterval(state.refreshTimer); stopLiquidationSocket(); }
});
document.addEventListener('visibilitychange', () => {
  if (!state.visible) return;
  if (document.visibilityState === 'visible') { loadDetail(state.symbol, { force: true }); startLiquidationSocket(); }
  else stopLiquidationSocket();
});

