const GROUPS = [
  ['主流币', 'OI 排名前 12'], ['头部山寨币', 'OI 排名 13–24'], ['中段山寨币', 'OI 排名 25–36'],
  ['长尾山寨币', 'OI 排名 37–48'], ['小盘山寨币', 'OI 排名 49+']
];
const PERIODS = ['5m','15m','30m','1h','4h','8h','12h','24h'];
const SYMBOLS = ['BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT','BNBUSDT','DOGEUSDT','ADAUSDT','LINKUSDT','AVAXUSDT','LTCUSDT','BCHUSDT','SUIUSDT','TRXUSDT','DOTUSDT','UNIUSDT','AAVEUSDT','NEARUSDT','APTUSDT','ETCUSDT','ICPUSDT','FILUSDT','ATOMUSDT','ARBUSDT','OPUSDT','INJUSDT','TIAUSDT','SEIUSDT','WLDUSDT','ENAUSDT','PENDLEUSDT','RENDERUSDT','TAOUSDT','FETUSDT','RUNEUSDT','JUPUSDT','GALAUSDT','SANDUSDT','MANAUSDT','AXSUSDT','APEUSDT','1000PEPEUSDT','1000SHIBUSDT','WIFUSDT','ORDIUSDT','LDOUSDT','CRVUSDT','DYDXUSDT','STXUSDT','IMXUSDT','COMPUSDT','SUSHIUSDT','ZECUSDT','DASHUSDT','KSMUSDT','EGLDUSDT','THETAUSDT','CHZUSDT'];
const API_PERIODS = { '5m':['5m',2], '15m':['5m',4], '30m':['5m',7], '1h':['5m',13], '4h':['5m',49], '8h':['4h',3], '12h':['4h',4], '24h':['4h',7] };
const state = { rank: 5, groupPeriods: Array(5).fill('4h'), cache: new Map(), request: 0 };
const grid = document.querySelector('#market-grid');
const status = document.querySelector('#status');
const template = document.querySelector('#group-template');

const money = value => {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(abs / 1e9).toFixed(abs >= 10e9 ? 1 : 2)}B`;
  if (abs >= 1e6) return `$${(abs / 1e6).toFixed(abs >= 10e6 ? 1 : 2)}M`;
  return `$${(abs / 1e3).toFixed(1)}K`;
};
const signedMoney = value => `${value >= 0 ? '↑ +' : '↓ -'}${money(value)}`;
const signedPercent = value => `${value >= 0 ? '↑ +' : '↓ '}${value.toFixed(2)}%`;
const tone = value => value >= 0 ? 'positive' : 'negative';

function loading() {
  grid.innerHTML = Array.from({ length: 5 }, () => '<div class="skeleton" aria-hidden="true"></div>').join('');
  grid.setAttribute('aria-busy', 'true');
  status.className = 'status'; status.querySelector('span').textContent = '正在同步市场';
}

async function loadDirectMarket(period) {
  const [apiPeriod, limit] = API_PERIODS[period];
  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < SYMBOLS.length) {
      const symbol = SYMBOLS[cursor++];
      try {
    const url = `https://fapi.binance.com/futures/data/openInterestHist?symbol=${symbol}&period=${apiPeriod}&limit=${limit}`;
    const currentUrl = `https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`;
    const [response, currentResponse] = await Promise.all([fetch(url), fetch(currentUrl)]);
    if (!response.ok || !currentResponse.ok) throw new Error(`Binance ${response.status}/${currentResponse.status}`);
    const rows = await response.json();
    const currentPayload = await currentResponse.json();
    if (!Array.isArray(rows) || rows.length < 2) throw new Error('Insufficient history');
    const notionalValues = rows.map(row => Number(row.sumOpenInterestValue));
    const quantityValues = rows.map(row => Number(row.sumOpenInterest));
    const currentQuantity = Number(currentPayload.openInterest);
    const estimatedPrice = notionalValues.at(-1) / quantityValues.at(-1);
    const current = currentQuantity * estimatedPrice, delta = current - notionalValues[0];
    const quantityDelta = currentQuantity - quantityValues[0];
    const liveQuantities = [...quantityValues, currentQuantity];
    const streak = liveQuantities.slice(1).reduce((count, value, index) => value > liveQuantities[index] ? count + 1 : 0, 0);
        results.push({ symbol: symbol.replace('USDT',''), current, delta, percent: quantityValues[0] ? quantityDelta / quantityValues[0] * 100 : 0, streak });
      } catch {}
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  const assets = results.sort((a,b) => b.current - a.current);
  if (assets.length < 20) throw new Error('Direct market source unavailable');
  return assets;
}

function render() {
  grid.innerHTML = '';
  GROUPS.forEach(([name, range], groupIndex) => {
    const period = state.groupPeriods[groupIndex];
    const data = state.cache.get(period) || [];
    const start = groupIndex * 12;
    const bucket = data.slice(start, start + 12);
    const growth = [...bucket].sort((a,b) => b.percent - a.percent).slice(0, state.rank);
    const total = bucket.reduce((sum, item) => sum + item.current, 0);
    const delta = bucket.reduce((sum, item) => sum + item.delta, 0);
    const previous = total - delta;
    const percent = previous ? delta / previous * 100 : 0;
    const node = template.content.cloneNode(true);
    const card = node.querySelector('.market-card');
    card.dataset.group = groupIndex;
    card.querySelector('h2').textContent = name;
    card.querySelector('.card-head p').textContent = range;
    const select = card.querySelector('select');
    select.innerHTML = PERIODS.map(option => `<option value="${option}" ${option === period ? 'selected' : ''}>${option.toUpperCase()}</option>`).join('');
    select.addEventListener('change', e => changeGroupPeriod(groupIndex, e.target.value));
    card.querySelector('.metric strong').textContent = money(total);
    card.querySelectorAll('.period-label').forEach(el => el.textContent = period.toUpperCase());
    const deltaBlock = card.querySelector('.delta-row div');
    deltaBlock.querySelector('b').textContent = signedMoney(delta);
    deltaBlock.querySelector('b').className = tone(delta);
    deltaBlock.querySelector('small').textContent = signedPercent(percent);
    deltaBlock.querySelector('small').className = tone(percent);
    const flow = card.querySelector('.flow-row b');
    flow.textContent = signedMoney(delta); flow.className = tone(delta);
    card.querySelector('.rank-label').textContent = state.rank;
    const maxGrowth = Math.max(...growth.map(item => Math.max(item.percent, 0.01)), 0.01);
    card.querySelector('.asset-list').innerHTML = growth.map(item => `<li class="asset-row ${item.streak >= 2 ? 'hot' : ''}">
      <strong title="${item.symbol}">${item.symbol}</strong><span class="bar"><i style="--width:${Math.max(3, item.percent / maxGrowth * 100)}%"></i></span>
      <span class="${tone(item.percent)}">${signedPercent(item.percent)}</span>${item.streak >= 2 ? `<em class="streak">当前连续增长 ${item.streak} 个采样周期</em>` : ''}</li>`).join('');
    card.querySelector('.coverage').textContent = `${bucket.length} 个币种 · OI 覆盖 ${bucket.length}/${bucket.length} · 历史覆盖 ${bucket.length}/${bucket.length}`;
    grid.appendChild(node);
  });
  grid.setAttribute('aria-busy', 'false');
}

async function loadPeriod(period, showLoading = true) {
  if (state.cache.has(period)) return true;
  const request = ++state.request; if (showLoading) loading();
  let sharedSnapshot;
  try {
    const response = await fetch(`/api/market?period=${period}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (request !== state.request) return;
    if (Array.isArray(payload.assets) && payload.assets.length >= 20) {
      sharedSnapshot = payload;
      if (!payload.stale) {
        state.cache.set(period, payload.assets); render();
        showSnapshotStatus(payload, false);
        return true;
      }
    }
  } catch {}

  try {
    const assets = await loadDirectMarket(period);
    const response = await fetch(`/api/market?period=${period}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ assets }) });
    if (!response.ok) throw new Error(`Snapshot HTTP ${response.status}`);
    const snapshot = await response.json();
    if (!Array.isArray(snapshot.assets) || snapshot.assets.length < 20) throw new Error('Invalid shared snapshot');
    if (request !== state.request) return;
    state.cache.set(period, snapshot.assets); render();
    showSnapshotStatus(snapshot, false);
    return true;
  } catch (error) {
    if (request !== state.request) return;
    if (sharedSnapshot) {
      state.cache.set(period, sharedSnapshot.assets); render();
      showSnapshotStatus(sharedSnapshot, true);
      return true;
    }
    grid.innerHTML = '<div class="error-panel"><strong>暂无统一市场快照</strong><p>当前网络无法连接 Binance，请稍后刷新。</p></div>';
    status.className = 'status error'; status.querySelector('span').textContent = '数据暂不可用';
    return false;
  }
}

function showSnapshotStatus(snapshot, stale) {
  const time = new Date(snapshot.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  status.className = stale ? 'status error' : 'status live';
  status.querySelector('span').textContent = `${stale ? '延迟快照' : '统一快照'} · ${time}${stale ? '' : ' · 60秒刷新'}`;
}

async function changePeriod(period) {
  state.groupPeriods.fill(period);
  document.querySelectorAll('[data-period]').forEach(button => button.classList.toggle('active', button.dataset.period === period));
  await loadPeriod(period);
}

async function changeGroupPeriod(groupIndex, period) {
  state.groupPeriods[groupIndex] = period;
  document.querySelectorAll('[data-period]').forEach(button => button.classList.toggle('active', state.groupPeriods.every(value => value === button.dataset.period)));
  if (state.cache.has(period)) render(); else await loadPeriod(period, false);
}

document.querySelector('#period-controls').addEventListener('click', e => { if (e.target.dataset.period) changePeriod(e.target.dataset.period); });
document.querySelector('#rank-controls').addEventListener('click', e => {
  if (!e.target.dataset.rank) return;
  state.rank = Number(e.target.dataset.rank);
  document.querySelectorAll('[data-rank]').forEach(button => button.classList.toggle('active', Number(button.dataset.rank) === state.rank));
  render();
});
changePeriod('4h');
setInterval(() => {
  const period = state.groupPeriods[0];
  if (!state.groupPeriods.every(value => value === period)) return;
  state.cache.delete(period);
  loadPeriod(period, false);
}, 60_000);

const workspaceIds = { aggregate: 'aggregate-view', detail: 'detail-view', panorama: 'panorama-view' };
function activateWorkspace(view, { updateUrl = true } = {}) {
  const selected = workspaceIds[view] ? view : 'aggregate';
  Object.entries(workspaceIds).forEach(([key,id]) => { document.querySelector(`#${id}`).hidden = key !== selected; });
  document.querySelectorAll('.workspace-tab').forEach(tab => {
    const active = tab.dataset.view === selected;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  window.dispatchEvent(new CustomEvent('market-detail:visible', { detail: { visible: selected === 'detail' } }));
  window.dispatchEvent(new CustomEvent('market-panorama:visible', { detail: { visible: selected === 'panorama' } }));
  if (updateUrl) { const url=new URL(location.href); selected==='aggregate'?url.searchParams.delete('view'):url.searchParams.set('view',selected); if(selected!=='panorama')url.searchParams.delete('symbol'); history.pushState({},'',url); }
}

window.marketSnapshot = {
  loadPeriod: async (period, { force = false } = {}) => {
    if (force) state.cache.delete(period);
    return loadPeriod(period, false);
  }
};
document.querySelectorAll('.workspace-tab').forEach(button => button.addEventListener('click', () => activateWorkspace(button.dataset.view)));
activateWorkspace(new URLSearchParams(location.search).get('view') || 'aggregate', { updateUrl:false });
