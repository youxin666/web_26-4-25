# BTC / ETH / SOL Market Watch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reference-image-style BTC/ETH/SOL market-watch view to `trading.858846.xyz`, backed by free Binance public data, shared Cloudflare snapshots, self-collected liquidations, and dated public ETF flows.

**Architecture:** Keep the existing aggregate dashboard intact and add an isolated detail-data module plus detail-view controller. Browsers that can reach Binance build candidate snapshots; the Worker validates them and a Durable Object selects the canonical snapshot for every visitor. Liquidation events are deduplicated and accumulated in the same Durable Object, while ETF daily values are fetched server-side on a best-effort basis and always carry a source date.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Binance USDⓈ-M public REST/WebSocket APIs, Cloudflare Workers Static Assets, Durable Objects SQLite storage, Wrangler, Playwright CLI, Node.js contract tests.

---

## File Map

- Create `trading-public/market-detail-data.js`: Binance collection, rolling-window calculations, direction classification, snapshot normalization, and visibility-aware refresh helpers.
- Create `trading-public/market-detail-view.js`: BTC/ETH/SOL view state and DOM rendering only.
- Create `tools/test-trading-detail-data.mjs`: pure calculation and schema tests.
- Create `tools/test-trading-detail-contract.mjs`: HTML, CSS, Worker route, and cache-version contract tests.
- Create `tools/test-trading-detail-browser.mjs`: production browser checks for switching, geometry, consistency, and refresh.
- Modify `trading-public/index.html`: navigation, detail-view markup, templates, and module script tags.
- Modify `trading-public/styles.css`: terminal-style detail layout and mobile stacking.
- Modify `trading-public/app.js`: aggregate-dashboard bootstrap and cross-view navigation only.
- Modify `trading-worker.js`: detail snapshots, liquidation deduplication/rolling totals, ETF proxy, and validation.
- Modify `wrangler.trading.toml`: retain the existing Durable Object migration and bindings; no new secret or paid binding.

### Task 1: Pure Market-Detail Calculations

**Files:**
- Create: `trading-public/market-detail-data.js`
- Create: `tools/test-trading-detail-data.mjs`

- [ ] **Step 1: Write the failing calculation tests**

Create `tools/test-trading-detail-data.mjs`:

```js
import assert from 'node:assert/strict';
import {
  PERIOD_WINDOWS,
  classifyDirection,
  calculateWindow,
  normalizeDetailSnapshot,
} from '../trading-public/market-detail-data.js';

assert.deepEqual(PERIOD_WINDOWS, {
  '15m': 3, '30m': 6, '1h': 12, '4h': 48,
  '8h': 96, '12h': 144, '24h': 288,
});

assert.equal(classifyDirection(1, 1).key, 'long-build');
assert.equal(classifyDirection(-1, 1).key, 'short-build');
assert.equal(classifyDirection(1, -1).key, 'short-cover');
assert.equal(classifyDirection(-1, -1).key, 'long-exit');

const rows = Array.from({ length: 49 }, (_, index) => ({
  timestamp: 1_000 + index * 300_000,
  price: 100 + index,
  oiQuantity: 1_000 + index * 5,
  oiNotional: (1_000 + index * 5) * (100 + index),
  buyUsd: 20_000 + index * 100,
  sellUsd: 18_000 + index * 50,
}));
const metric = calculateWindow(rows, 48);
assert.equal(metric.pricePercent.toFixed(2), '48.00');
assert.equal(metric.oiPercent.toFixed(2), '24.00');
assert.equal(metric.netFlowUsd, 156_400);
assert.equal(metric.direction.key, 'long-build');

const snapshot = normalizeDetailSnapshot({
  symbol: 'BTC', updatedAt: 1_800_000_000_000,
  current: { price: 76000, oiNotional: 44_000_000_000, longShortRatio: 1.2, fundingRate: 0.0001 },
  periods: { '4h': metric },
});
assert.equal(snapshot.symbol, 'BTC');
assert.equal(snapshot.periods['4h'].direction.key, 'long-build');
assert.throws(() => normalizeDetailSnapshot({ symbol: 'XRP' }), /Unsupported symbol/);
console.log('trading detail data tests passed');
```

- [ ] **Step 2: Run the test and verify failure**

Run:

```powershell
node tools/test-trading-detail-data.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `market-detail-data.js`.

- [ ] **Step 3: Implement the pure calculation module**

Create `trading-public/market-detail-data.js` with these exported contracts:

```js
export const DETAIL_SYMBOLS = ['BTC', 'ETH', 'SOL'];
export const DETAIL_PERIODS = ['15m', '30m', '1h', '4h', '8h', '12h', '24h'];
export const PERIOD_WINDOWS = {
  '15m': 3, '30m': 6, '1h': 12, '4h': 48,
  '8h': 96, '12h': 144, '24h': 288,
};

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
  return {
    pricePercent,
    oiPercent,
    netFlowUsd,
    direction: classifyDirection(pricePercent, oiPercent),
  };
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
      pricePercent: Number(value.pricePercent),
      oiPercent: Number(value.oiPercent),
      netFlowUsd: Number(value.netFlowUsd),
      direction: classifyDirection(Number(value.pricePercent), Number(value.oiPercent)),
    };
  }
  if (Object.keys(periods).length !== DETAIL_PERIODS.length && Object.keys(periods).length !== 1) {
    throw new Error('Incomplete period metrics');
  }
  return {
    symbol: input.symbol,
    updatedAt: Number(input.updatedAt),
    current: Object.fromEntries(Object.entries(current).map(([key, value]) => [key, Number(value)])),
    periods,
  };
}
```

Add the Binance collector to the same module. It must fetch 289 five-minute klines, OI history, taker buy/sell volume, current OI, premium index, and global long/short ratio for one symbol, merge rows by timestamp, append the live sample, and calculate all seven periods with `calculateWindow`. Limit concurrency to two symbols and throw when fewer than 280 aligned rows are available.

- [ ] **Step 4: Run the calculation test**

Run:

```powershell
node tools/test-trading-detail-data.mjs
```

Expected: `trading detail data tests passed`.

- [ ] **Step 5: Commit the calculation unit**

```powershell
git add trading-public/market-detail-data.js tools/test-trading-detail-data.mjs
git commit -m "feat: add market detail calculations"
```

### Task 2: Canonical Detail Snapshots and Liquidation Accumulator

**Files:**
- Modify: `trading-worker.js`
- Create: `tools/test-trading-detail-contract.mjs`

- [ ] **Step 1: Write the failing Worker contract test**

Create `tools/test-trading-detail-contract.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker = fs.readFileSync('trading-worker.js', 'utf8');
const html = fs.readFileSync('trading-public/index.html', 'utf8');
const css = fs.readFileSync('trading-public/styles.css', 'utf8');

for (const route of ['/api/detail', '/api/liquidations', '/api/etf']) {
  assert.ok(worker.includes(route), `missing ${route}`);
}
assert.ok(worker.includes('detail:BTC'));
assert.ok(worker.includes('liquidation:events'));
assert.ok(worker.includes("['BTC', 'ETH', 'SOL']"));
assert.ok(html.includes('data-view="detail"'));
assert.ok(html.includes('id="detail-view"'));
assert.ok(css.includes('.detail-workspace'));
console.log('trading detail contract tests passed');
```

- [ ] **Step 2: Run the contract test and verify failure**

Run:

```powershell
node tools/test-trading-detail-contract.mjs
```

Expected: FAIL with `missing /api/detail`.

- [ ] **Step 3: Add Worker routes and validation**

Modify `trading-worker.js` so the top-level `fetch` routes:

```js
if (url.pathname === '/api/detail') return detailSnapshot(request, env, url);
if (url.pathname === '/api/liquidations') return liquidationData(request, env, url);
if (url.pathname === '/api/etf') return etfData(request, env, url);
```

Add `detailSnapshot()` to forward requests to the existing `MARKET_SNAPSHOT` Durable Object using `/detail/BTC`, `/detail/ETH`, or `/detail/SOL`. GET returns the stored snapshot plus `stale: Date.now() - updatedAt > 60_000`. POST accepts only the symbol in the URL, seven named periods, numeric current fields, and an `updatedAt` no more than two minutes old. If a valid snapshot is younger than 45 seconds, return it instead of overwriting it.

Extend `MarketSnapshot.fetch()` with these storage keys:

```js
const DETAIL_SYMBOLS = ['BTC', 'ETH', 'SOL'];
const DETAIL_PERIODS = ['15m', '30m', '1h', '4h', '8h', '12h', '24h'];
const detailKey = symbol => `detail:${symbol}`;
const liquidationKey = 'liquidation:events';
```

The detail snapshot stored shape must be:

```js
{
  symbol: 'BTC',
  updatedAt: 1789660000000,
  current: { price, oiNotional, longShortRatio, fundingRate },
  periods: {
    '15m': { pricePercent, oiPercent, netFlowUsd, direction },
    '30m': { pricePercent, oiPercent, netFlowUsd, direction },
    '1h': { pricePercent, oiPercent, netFlowUsd, direction },
    '4h': { pricePercent, oiPercent, netFlowUsd, direction },
    '8h': { pricePercent, oiPercent, netFlowUsd, direction },
    '12h': { pricePercent, oiPercent, netFlowUsd, direction },
    '24h': { pricePercent, oiPercent, netFlowUsd, direction },
  },
}
```

- [ ] **Step 4: Add liquidation ingestion and rolling totals**

Accept POST `/api/liquidations` bodies shaped as:

```js
{
  events: [{ id, symbol, side, timestamp, usd }]
}
```

Validate `symbol` against BTC/ETH/SOL, `side` against `BUY`/`SELL`, timestamp within five minutes, and USD between zero and one billion. Store at most 5,000 events, deduplicate by `id`, remove entries older than 24 hours, and return:

```js
{
  updatedAt,
  startedAt,
  longLiquidationUsd,
  shortLiquidationUsd,
  complete24h: Date.now() - startedAt >= 86_400_000,
}
```

- [ ] **Step 5: Add free ETF daily proxy**

Implement GET `/api/etf?symbol=BTC|ETH|SOL`. For BTC and ETH, fetch the public daily table from Farside Investors, parse the latest dated total row, and cache the normalized `{ symbol, flowUsd, date, sourceUrl, updatedAt }` for six hours in Durable Object storage. Return `{ symbol: 'SOL', available: false, reason: 'No reliable free source' }` for SOL. If parsing fails, return the most recent stored result with `stale: true`; otherwise return `{ available: false }` without inventing a value.

- [ ] **Step 6: Run Worker and dry-run checks**

Run:

```powershell
node --check trading-worker.js
node tools/test-trading-detail-contract.mjs
npx wrangler deploy --config wrangler.trading.toml --dry-run --outdir .wrangler-dryrun-trading-detail
```

Expected: syntax passes; contract test still fails only on missing UI markup; dry-run lists `MARKET_SNAPSHOT` and `ASSETS`.

- [ ] **Step 7: Commit the Worker API**

```powershell
git add trading-worker.js tools/test-trading-detail-contract.mjs
git commit -m "feat: add canonical detail market snapshots"
```

### Task 3: Detail View Markup and Reference Layout

**Files:**
- Modify: `trading-public/index.html`
- Modify: `trading-public/styles.css`

- [ ] **Step 1: Add semantic view navigation and detail markup**

Add below the aggregate footer:

```html
<nav class="workspace-tabs" aria-label="市场工作区">
  <button class="workspace-tab active" data-view="aggregate">聚合看板</button>
  <button class="workspace-tab" data-view="detail">BTC / ETH / SOL 看盘</button>
</nav>
<section class="detail-workspace" id="detail-view" hidden aria-labelledby="detail-title">
  <header class="detail-header">
    <div><span class="eyebrow">EVIDENCE DETAIL</span><h2 id="detail-title">BTC 数据详情</h2></div>
    <div class="coin-switcher" role="tablist">
      <button role="tab" aria-selected="true" data-symbol="BTC">BTC</button>
      <button role="tab" aria-selected="false" data-symbol="ETH">ETH</button>
      <button role="tab" aria-selected="false" data-symbol="SOL">SOL</button>
    </div>
  </header>
  <div class="detail-summary" id="detail-summary"></div>
  <div class="detail-main">
    <article class="quadrant-card" id="quadrant-card"></article>
    <section class="period-evidence">
      <div class="direction-strip" id="direction-strip"></div>
      <div class="evidence-charts" id="evidence-charts"></div>
    </section>
  </div>
  <p class="detail-source" id="detail-source"></p>
</section>
```

Move the aggregate controls, grid, and footer into `<section id="aggregate-view">`. Load `market-detail-data.js` and `market-detail-view.js` as modules with a new cache version.

- [ ] **Step 2: Add the desktop reference-image layout**

Add CSS with these structural contracts:

```css
.workspace-tabs { position: sticky; bottom: 10px; z-index: 20; display: flex; gap: 4px; padding: 7px; border: 1px solid var(--line); border-radius: 10px; background: rgba(7,16,31,.94); backdrop-filter: blur(18px); }
.workspace-tab { border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--muted); padding: 10px 22px; }
.workspace-tab.active { color: var(--cyan); border-bottom-color: var(--cyan); }
.detail-workspace { padding: 18px 0 80px; }
.detail-header { display: flex; justify-content: space-between; align-items: center; }
.coin-switcher, .detail-summary, .direction-strip { display: grid; gap: 8px; }
.coin-switcher { grid-template-columns: repeat(3, 1fr); }
.detail-summary { grid-template-columns: repeat(6, minmax(0, 1fr)); margin: 12px 0; }
.detail-main { display: grid; grid-template-columns: minmax(360px, 38%) 1fr; gap: 10px; }
.quadrant-card { min-height: 590px; }
.direction-strip { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.evidence-charts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
```

Style the four quadrants with centered axes, named corners, a movable coin marker, and bounded scales derived from the maximum absolute price/OI values. Style all period bars around a centered zero axis, green for positive and red for negative.

- [ ] **Step 3: Add responsive stacking**

Under `@media (max-width: 820px)`, use one-column `.detail-main`, two-column summary cards, horizontally scrollable `.direction-strip`, and one-column `.evidence-charts`. Ensure `.quadrant-card` is at least 360px high and every card uses `min-width: 0`.

- [ ] **Step 4: Run the contract test**

Run:

```powershell
node tools/test-trading-detail-contract.mjs
```

Expected: `trading detail contract tests passed`.

- [ ] **Step 5: Commit the view shell**

```powershell
git add trading-public/index.html trading-public/styles.css
git commit -m "feat: add market detail workspace"
```

### Task 4: Detail View Controller and Live Collectors

**Files:**
- Create: `trading-public/market-detail-view.js`
- Modify: `trading-public/app.js`
- Modify: `trading-public/index.html`

- [ ] **Step 1: Implement cross-view navigation**

In `app.js`, bind `.workspace-tab` buttons. Toggle `hidden` on `#aggregate-view` and `#detail-view`, update `.active` and `aria-selected`, and dispatch `market-detail:visible` when the detail view opens. Do not restart the aggregate interval when switching views.

- [ ] **Step 2: Implement the detail snapshot controller**

Create `market-detail-view.js` as a module. Keep this state:

```js
const detailState = {
  symbol: 'BTC',
  snapshot: null,
  liquidation: null,
  etf: null,
  visible: false,
  refreshTimer: 0,
  socket: null,
};
```

Implement `loadDetail(symbol, { force = false } = {})`:

1. GET `/api/detail?symbol=${symbol}`.
2. If the canonical snapshot is fresh, render it.
3. If stale or absent, call `collectDetailSnapshot(symbol)` from `market-detail-data.js`.
4. POST the candidate to `/api/detail?symbol=${symbol}`.
5. Render only the canonical POST response.
6. Fetch `/api/liquidations?symbol=${symbol}` and `/api/etf?symbol=${symbol}` in parallel.
7. On failure, retain the prior rendered snapshot and show `数据延迟`.

Refresh every 60 seconds only while `document.visibilityState === 'visible'` and the detail view is open. Refresh immediately when visibility returns.

- [ ] **Step 3: Render all reference components**

Render summary cards with labels and metadata:

```js
[
  ['当前价格', formatUsd(current.price)],
  ['当前 OI', formatCompactUsd(current.oiNotional)],
  ['账户多空比', current.longShortRatio.toFixed(3)],
  ['ETF 净流入', etf.available ? formatSignedUsd(etf.flowUsd) : '—'],
  ['资金费率', `${(current.fundingRate * 100).toFixed(4)}%`],
  ['24H 爆仓', liquidation ? `${formatUsd(liquidation.longLiquidationUsd)} / ${formatUsd(liquidation.shortLiquidationUsd)}` : '—'],
]
```

Render the direction strip from all seven periods. Render the quadrant marker from the selected 24h metric to match the reference overview, with the marker tooltip showing price and OI percentages. Render centered horizontal bars for every period in three panels.

- [ ] **Step 4: Add Binance liquidation collection**

While detail view is visible, open `wss://fstream.binance.com/ws/!forceOrder@arr`. For BTCUSDT, ETHUSDT, and SOLUSDT events, calculate `usd = averagePrice * filledQuantity`; derive a stable id from symbol, trade time, side, price, and quantity; buffer events for five seconds; then POST the batch to `/api/liquidations`. Close the socket when hidden and reconnect with exponential delays of 2, 5, 15, and 30 seconds.

- [ ] **Step 5: Add status and source disclosures**

Show the canonical snapshot time beside the symbol title. ETF cards show their own date and source link. Liquidation cards show either `完整 24H` or `自 HH:mm 起累计`. Footer text must state `Binance 单交易所` and never use `全市场` for values that are not aggregated across exchanges.

- [ ] **Step 6: Run static and calculation tests**

Run:

```powershell
node --check trading-public/app.js
node --check trading-public/market-detail-data.js
node --check trading-public/market-detail-view.js
node tools/test-trading-detail-data.mjs
node tools/test-trading-detail-contract.mjs
```

Expected: all commands pass.

- [ ] **Step 7: Commit the interactive detail view**

```powershell
git add trading-public/app.js trading-public/index.html trading-public/market-detail-view.js
git commit -m "feat: add interactive btc eth sol watch"
```

### Task 5: Browser Regression and Production Deployment

**Files:**
- Create: `tools/test-trading-detail-browser.mjs`
- Modify: `trading-public/index.html` only if cache-version correction is required

- [ ] **Step 1: Write the browser verification script**

Create `tools/test-trading-detail-browser.mjs` using Playwright. It must accept `TRADING_BASE_URL`, open the page at 1920×1080, click the detail tab, wait for a canonical snapshot, switch BTC → ETH → SOL, and assert title/symbol changes without navigation. For each symbol assert seven direction cells, three evidence panels, and six summary cards. Record BTC snapshot time/value, open a second browser context, and assert the same canonical snapshot values. Repeat at 390×844 and assert `document.documentElement.scrollWidth === innerWidth`.

The test must save:

```text
output/playwright/trading-detail-desktop.png
output/playwright/trading-detail-mobile.png
```

- [ ] **Step 2: Run local build and regression checks**

Run:

```powershell
node tools/test-trading-detail-data.mjs
node tools/test-trading-detail-contract.mjs
git diff --check -- trading-public trading-worker.js wrangler.trading.toml tools/test-trading-detail-*.mjs
npx wrangler deploy --config wrangler.trading.toml --dry-run --outdir .wrangler-dryrun-trading-detail-final
```

Expected: all tests pass, no whitespace errors, and dry-run succeeds.

- [ ] **Step 3: Deploy with only the Luowenhui token**

Run:

```powershell
$token=[Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN_LUOWENHUI','User')
if([string]::IsNullOrWhiteSpace($token)){ throw 'CLOUDFLARE_API_TOKEN_LUOWENHUI is not set at User scope' }
$env:CLOUDFLARE_API_TOKEN=$token
$env:CLOUDFLARE_ACCOUNT_ID='7722052fdf1845b1b5e987938bb735f3'
npx wrangler deploy --config wrangler.trading.toml
```

Expected: deployment targets `trading.858846.xyz` under Account ID `7722052fdf1845b1b5e987938bb735f3`. Do not run `wrangler login` or use the Rowanwebber token.

- [ ] **Step 4: Run production browser verification**

Run:

```powershell
$env:TRADING_BASE_URL='https://trading.858846.xyz'
node tools/test-trading-detail-browser.mjs
```

Expected: `trading detail browser tests passed`, with desktop/mobile screenshots created.

- [ ] **Step 5: Verify live refresh**

Use Playwright CLI to record the BTC canonical snapshot timestamp and one 15m value, wait for the status timestamp to change, then confirm the API and visible value match. Expected: a newer timestamp within 120 seconds; if market values are unchanged, the timestamp must still advance and the response must not be marked stale.

- [ ] **Step 6: Commit verification assets and tests**

```powershell
git add tools/test-trading-detail-browser.mjs trading-public/index.html
git commit -m "test: verify market detail production flow"
```

## Final Verification Checklist

- [ ] Existing aggregate dashboard remains functional at desktop and mobile widths.
- [ ] BTC, ETH, and SOL switch without navigation or stale cross-symbol content.
- [ ] Seven rolling periods are present and calculated from five-minute samples.
- [ ] Quadrant direction equals the price/OI sign combination.
- [ ] Canonical snapshots match across independent browser contexts.
- [ ] Liquidation totals are deduplicated and disclose their accumulation start.
- [ ] BTC/ETH ETF values include a daily source date; SOL displays unavailable.
- [ ] Hidden tabs do not continue REST polling or WebSocket collection.
- [ ] Production status updates within 120 seconds.
- [ ] Wrangler deployment uses only `CLOUDFLARE_API_TOKEN_LUOWENHUI` and the specified Account ID.

