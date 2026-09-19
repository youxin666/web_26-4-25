# Coin Panorama Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third `币种全景` workspace with a deterministic all-symbol screener, seven-period metrics, source-aware enrichment, shareable symbol details, and responsive desktop/mobile interaction.

**Architecture:** The existing Durable Object becomes the sole panorama snapshot coordinator. It gathers Binance data in bounded batches across alarm invocations, stores a draft by generation, and atomically publishes only complete snapshots; Coinalyze enrichment rotates through eligible symbols within its 20-symbol request cap and never blocks Binance baseline publication. Focused client modules own pure filtering/sorting and panorama rendering, while the existing aggregate and BTC/ETH/SOL modules remain isolated.

**Tech Stack:** Cloudflare Worker and Durable Objects, Binance USDⓈ-M public REST, Coinalyze REST, static HTML/CSS/ES modules, Node.js assertions, Playwright CLI, Wrangler.

---

## File Structure

- Create `trading-panorama.js`: server-side symbol normalization, period calculation, batching, and snapshot merge helpers.
- Modify `trading-worker.js`: `/api/panorama` routing, Durable Object draft/publish lifecycle, alarm continuation, and source fallbacks.
- Create `trading-public/panorama-model.js`: pure client search/filter/sort/query-state functions.
- Create `trading-public/panorama-view.js`: list loading, controls, table, drawer/mobile detail, URL state, refresh preservation, and rendering.
- Modify `trading-public/index.html`: third workspace markup, templates, navigation entry, and module loading.
- Modify `trading-public/app.js`: generic three-workspace switching and deep-link initialization.
- Modify `trading-public/styles.css`: themed screener table, filters, drawer, stale/error, and mobile full-screen detail styles.
- Create `tools/test-trading-panorama-data.mjs`: pure data and deterministic ordering tests.
- Create `tools/test-trading-panorama-contract.mjs`: route, markup, source, accessibility, and isolation contract tests.

### Task 1: Define and Test the Panorama Data Model

**Files:**
- Create: `trading-panorama.js`
- Create: `tools/test-trading-panorama-data.mjs`

- [ ] **Step 1: Write failing pure-model tests**

Cover symbol eligibility, null preservation, period math, deterministic ordering, bounded batches, and atomic generation merge:

```js
import assert from 'node:assert/strict';
import {
  PANORAMA_PERIODS, calculatePanoramaPeriods, chunkSymbols,
  mergePanoramaAsset, normalizePanoramaSymbol, publishableDraft,
} from '../trading-panorama.js';

assert.equal(normalizePanoramaSymbol({ symbol: 'BTCUSDT', contractType: 'PERPETUAL', quoteAsset: 'USDT', status: 'TRADING' }), 'BTC');
assert.equal(normalizePanoramaSymbol({ symbol: 'BTCUSDT_260925', contractType: 'CURRENT_QUARTER', quoteAsset: 'USDT', status: 'TRADING' }), null);
assert.deepEqual(PANORAMA_PERIODS, ['15m','30m','1h','4h','8h','12h','24h']);

const rows = Array.from({ length: 289 }, (_, index) => ({
  timestamp: index * 300_000,
  price: 100 + index,
  oiQuantity: 1_000 + index * 2,
  netFlowUsd: index ? 10 : 0,
}));
const periods = calculatePanoramaPeriods(rows);
assert.equal(Object.keys(periods).length, 7);
assert.ok(periods['24h'].pricePercent > periods['15m'].pricePercent);
assert.equal(periods['15m'].netFlowUsd, 30);
assert.deepEqual(chunkSymbols(['A','B','C','D','E'], 2), [['A','B'],['C','D'],['E']]);

const merged = mergePanoramaAsset({ symbol: 'BTC', price: 100, currentOi: 1_000 }, { longShortRatio: null });
assert.equal(merged.longShortRatio, null);
assert.equal(merged.completeness, 'partial');
assert.equal(publishableDraft({ expected: 2, assets: { BTC: merged } }), false);
assert.equal(publishableDraft({ expected: 1, assets: { BTC: merged } }), true);
console.log('trading panorama data tests passed');
```

- [ ] **Step 2: Run the test and confirm the red state**

Run: `node tools/test-trading-panorama-data.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `trading-panorama.js`.

- [ ] **Step 3: Implement the pure model**

Export these stable contracts:

```js
export const PANORAMA_PERIODS = ['15m','30m','1h','4h','8h','12h','24h'];
export const PANORAMA_WINDOWS = { '15m':3, '30m':6, '1h':12, '4h':48, '8h':96, '12h':144, '24h':288 };
export const BINANCE_BATCH_SIZE = 40;
export const COINALYZE_BATCH_SIZE = 10;

const finite = value => Number.isFinite(Number(value));
const percent = (current, baseline) => baseline ? (current / baseline - 1) * 100 : null;

export function normalizePanoramaSymbol(info) {
  if (info?.status !== 'TRADING' || info?.contractType !== 'PERPETUAL' || info?.quoteAsset !== 'USDT') return null;
  return String(info.baseAsset || info.symbol?.replace(/USDT$/, '') || '').toUpperCase() || null;
}

export function calculatePanoramaPeriods(rows) {
  if (!Array.isArray(rows) || rows.length < 289) throw new Error('Insufficient panorama history');
  const current = rows.at(-1);
  return Object.fromEntries(PANORAMA_PERIODS.map(period => {
    const count = PANORAMA_WINDOWS[period];
    const baseline = rows.at(-(count + 1));
    const flowRows = rows.slice(-count);
    const flowAvailable = flowRows.every(row => finite(row.netFlowUsd));
    return [period, {
      pricePercent: percent(Number(current.price), Number(baseline.price)),
      oiPercent: percent(Number(current.oiQuantity), Number(baseline.oiQuantity)),
      netFlowUsd: flowAvailable ? flowRows.reduce((sum, row) => sum + Number(row.netFlowUsd), 0) : null,
    }];
  }));
}

export function chunkSymbols(symbols, size) {
  return Array.from({ length: Math.ceil(symbols.length / size) }, (_, index) => symbols.slice(index * size, (index + 1) * size));
}

export function mergePanoramaAsset(binance, coinalyze = {}) {
  const enriched = ['crossExchangeOi','longShortRatio','liquidations'].every(key => coinalyze[key] !== null && coinalyze[key] !== undefined);
  return {
    ...binance,
    crossExchangeOi: coinalyze.crossExchangeOi ?? null,
    longShortRatio: coinalyze.longShortRatio ?? null,
    liquidations: coinalyze.liquidations ?? null,
    periods: Object.fromEntries(PANORAMA_PERIODS.map(period => [period, {
      ...binance.periods?.[period],
      netFlowUsd: coinalyze.periods?.[period]?.netFlowUsd ?? null,
    }])),
    coverage: coinalyze.coverage ?? { oiMarkets: 0, cvdMarkets: 0, ratioMarkets: 0, liquidationMarkets: 0 },
    completeness: enriched ? 'complete' : 'partial',
  };
}

export function publishableDraft(draft) {
  const assets = Object.values(draft?.assets || {});
  return assets.length === Number(draft?.expected) && assets.every(asset => PANORAMA_PERIODS.every(period => asset.periods?.[period]));
}
```

Use finite-number guards; never coerce `null` to zero. Tie-breaking order is current OI descending, then symbol ascending.

- [ ] **Step 4: Run and commit**

Run: `node tools/test-trading-panorama-data.mjs`

Expected: `trading panorama data tests passed`.

```powershell
git add trading-panorama.js tools/test-trading-panorama-data.mjs
git commit -m "feat: define coin panorama data model"
```

### Task 2: Build the Durable Object Panorama Snapshot Pipeline

**Files:**
- Modify: `trading-worker.js`
- Modify: `trading-panorama.js`
- Create: `tools/test-trading-panorama-contract.mjs`
- Test: `tools/test-trading-panorama-data.mjs`

- [ ] **Step 1: Write the failing Worker contract test**

Assert the implementation contains `/api/panorama`, `panorama:published`, `panorama:draft`, `panorama:refresh`, an `alarm()` handler, batch sizes below the free-plan 50-external-subrequest ceiling, and no API key in URLs:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
const worker = fs.readFileSync('trading-worker.js', 'utf8');
const panorama = fs.readFileSync('trading-panorama.js', 'utf8');
for (const token of ['/api/panorama','panorama:published','panorama:draft','panorama:refresh','async alarm()']) assert.ok(worker.includes(token), `missing ${token}`);
assert.match(panorama, /BINANCE_BATCH_SIZE = 40/);
assert.match(panorama, /COINALYZE_BATCH_SIZE = 10/);
assert.doesNotMatch(worker, /api_key=.*COINALYZE_API_KEY/);
console.log('trading panorama contract tests passed');
```

- [ ] **Step 2: Run it and confirm failure**

Run: `node tools/test-trading-panorama-contract.mjs`

Expected: FAIL with `missing /api/panorama`.

- [ ] **Step 3: Add the public route and DO dispatch**

Route both list and symbol queries through the existing named Durable Object:

```js
async function panoramaData(request, env, url) {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  const symbol = String(url.searchParams.get('symbol') || '').toUpperCase();
  const target = symbol ? `/panorama/symbol/${encodeURIComponent(symbol)}` : '/panorama';
  return detailObject(env).fetch(new Request(`https://snapshot.internal${target}`, request));
}
```

Add the route before static assets and dispatch `panorama`, `panorama/symbol`, and `alarm()` inside `MarketSnapshot`.

- [ ] **Step 4: Implement bounded draft generation**

Use storage records:

```js
// panorama:published => { generation, updatedAt, assets, stale, sources }
// panorama:draft => { generation, startedAt, expected, cursor, symbols, assets }
// panorama:refresh => { running, generation, nextCoinalyzeCursor }
```

On GET, return `panorama:published` immediately. If absent or older than 45 seconds, call `state.storage.setAlarm(Date.now())` and return the last snapshot with `stale: true`; if no snapshot exists return `202 { building: true, retryAfterMs: 1500 }`.

Each alarm invocation fetches no more than 40 Binance per-symbol 5m OI histories plus bulk `exchangeInfo`, `ticker/24hr`, and `premiumIndex` only when starting a generation. Persist the draft cursor and schedule the next alarm for `Date.now() + 250`. Once every eligible symbol has seven period metrics, sort and atomically write `panorama:published`, then delete the draft.

- [ ] **Step 5: Add rotating Coinalyze enrichment**

From the cached Coinalyze market catalog, choose at most one stable-margined perpetual market per asset. Process at most 10 assets per enrichment alarm, using header authentication and the existing retry-at behavior. Merge available ratio, net flow, liquidation, and cross-exchange OI fields into the draft; keep all absent values `null`. A Coinalyze 429 publishes the Binance-complete snapshot and reports stale enrichment rather than aborting the generation.

- [ ] **Step 6: Validate route and regression tests**

Run:

```powershell
node tools/test-trading-panorama-data.mjs
node tools/test-trading-panorama-contract.mjs
node tools/test-trading-detail-contract.mjs
node tools/test-trading-detail-data.mjs
git diff --check
```

Expected: all four tests pass and the diff check is silent.

- [ ] **Step 7: Commit**

```powershell
git add trading-worker.js trading-panorama.js tools/test-trading-panorama-contract.mjs
git commit -m "feat: publish unified coin panorama snapshots"
```

### Task 3: Implement Pure Screener Search, Filters, Sorting, and URL State

**Files:**
- Create: `trading-public/panorama-model.js`
- Create: `tools/test-trading-panorama-ui-model.mjs`

- [ ] **Step 1: Write failing client-model tests**

Test `normalizePanoramaQuery`, `filterPanoramaAssets`, `sortPanoramaAssets`, and `panoramaUrl` with combinations of search, rank, numeric ranges, completeness, period, nulls, and stable ties. Explicitly assert nulls sort last in ascending and descending order and `?view=panorama&symbol=BTC` round-trips.

- [ ] **Step 2: Run the test and verify failure**

Run: `node tools/test-trading-panorama-ui-model.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `panorama-model.js`.

- [ ] **Step 3: Implement the pure client model**

Use this state shape:

```js
export const DEFAULT_PANORAMA_QUERY = {
  search: '', period: '4h', rankMin: null, rankMax: null,
  priceMin: null, priceMax: null, oiMin: null, oiMax: null,
  fundingMin: null, fundingMax: null, volumeMin: null, volumeMax: null,
  completeness: 'all', sortKey: 'currentOi', sortDirection: 'desc', symbol: null,
};
```

Filtering is conjunctive. Sorting is stable: available values first, requested direction, then `oiRank`, then symbol. URL serialization keeps `view=panorama` and `symbol`, while local UI filters remain in memory for the first release.

- [ ] **Step 4: Run and commit**

Run: `node tools/test-trading-panorama-ui-model.mjs`

Expected: `trading panorama UI model tests passed`.

```powershell
git add trading-public/panorama-model.js tools/test-trading-panorama-ui-model.mjs
git commit -m "feat: add coin panorama screener model"
```

### Task 4: Add the Third Workspace and Responsive Panorama UI

**Files:**
- Modify: `trading-public/index.html`
- Modify: `trading-public/app.js`
- Modify: `trading-public/styles.css`
- Create: `trading-public/panorama-view.js`
- Modify: `tools/test-trading-panorama-contract.mjs`

- [ ] **Step 1: Extend the contract test for UI and accessibility**

Assert `data-view="panorama"`, `id="panorama-view"`, search label, period controls, completeness select, sortable table headers with `aria-sort`, drawer close/return control, `/panorama-view.js`, and warm-light selectors. Assert `app.js` switches three view IDs without a boolean-only detail branch.

- [ ] **Step 2: Add semantic workspace markup**

Add a hidden `#panorama-view` between the detail workspace and bottom navigation. It contains:

```html
<section class="panorama-workspace" id="panorama-view" hidden aria-labelledby="panorama-title">
  <header class="panorama-header">...</header>
  <form id="panorama-filters" class="panorama-filters" aria-label="币种筛选">...</form>
  <div class="panorama-status" id="panorama-status" aria-live="polite"></div>
  <div class="panorama-table-shell"><table id="panorama-table">...</table></div>
  <aside id="panorama-drawer" class="panorama-drawer" aria-label="币种全景详情" hidden>...</aside>
</section>
```

Add the third navigation button and load `panorama-view.js` as a module with a new cache version.

- [ ] **Step 3: Generalize workspace switching**

Replace the current detail boolean with a map:

```js
const workspaceIds = { aggregate: 'aggregate-view', detail: 'detail-view', panorama: 'panorama-view' };
function activateWorkspace(view, { updateUrl = true } = {}) {
  const selected = workspaceIds[view] ? view : 'aggregate';
  for (const [key, id] of Object.entries(workspaceIds)) document.querySelector(`#${id}`).hidden = key !== selected;
  document.querySelectorAll('.workspace-tab').forEach(tab => {
    const active = tab.dataset.view === selected;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  window.dispatchEvent(new CustomEvent('market-detail:visible', { detail: { visible: selected === 'detail' } }));
  window.dispatchEvent(new CustomEvent('market-panorama:visible', { detail: { visible: selected === 'panorama' } }));
  if (updateUrl) {
    const url = new URL(location.href);
    if (selected === 'aggregate') url.searchParams.delete('view'); else url.searchParams.set('view', selected);
    if (selected !== 'panorama') url.searchParams.delete('symbol');
    history.pushState({}, '', url);
  }
}
```

Initialize from `URLSearchParams` after listeners are registered.

- [ ] **Step 4: Implement panorama rendering and refresh preservation**

`panorama-view.js` imports the pure model. It owns one state object containing the latest snapshot, query, selected symbol, request ID, refresh timer, list scroll position, and visibility. It polls every 60 seconds only while visible, retains current rows during refresh, retries `202 building` responses using `retryAfterMs`, and never clears filters or selection.

Render cells with source-aware `—`, arrows plus color, fixed symbol column, stable formatted values, `aria-sort`, keyboard row activation, and a completeness badge. Selecting a row fetches `/api/panorama?symbol=...`, opens the drawer/full-screen surface, pushes the URL, and renders seven-period price/OI/flow bars plus direction labels and coverage.

- [ ] **Step 5: Add themed desktop and mobile CSS**

Use existing semantic variables only. Desktop keeps the table visible under a fixed right drawer with its own scrolling region. At `max-width: 820px`, hide the list while detail is open, make the detail surface fill the workspace, keep a visible return button, and confine horizontal scrolling to `.panorama-table-shell`. Add focus-visible styles and avoid theme-specific hard-coded dark surfaces.

- [ ] **Step 6: Run all static and model tests**

Run:

```powershell
node tools/test-trading-panorama-data.mjs
node tools/test-trading-panorama-ui-model.mjs
node tools/test-trading-panorama-contract.mjs
node tools/test-trading-theme-contract.mjs
node tools/test-trading-detail-contract.mjs
node tools/test-trading-detail-data.mjs
git diff --check
```

Expected: all six tests pass and the diff check is silent.

- [ ] **Step 7: Commit**

```powershell
git add trading-public/index.html trading-public/app.js trading-public/styles.css trading-public/panorama-model.js trading-public/panorama-view.js tools/test-trading-panorama-contract.mjs
git commit -m "feat: add coin panorama workspace"
```

### Task 5: Browser Verification, Worker Validation, and Production Deployment

**Files:**
- Verify: all panorama and existing trading files
- Verify: `wrangler.trading.toml`

- [ ] **Step 1: Run the complete fresh verification set**

Run all six commands from Task 4, then `node tools/test-coinalyze-production.mjs`. Expected: every process exits 0.

- [ ] **Step 2: Run Wrangler dry-run with the required account token**

Set `CLOUDFLARE_API_TOKEN` from the user-scoped `CLOUDFLARE_API_TOKEN_LUOWENHUI` without printing it, then run:

```powershell
npx wrangler deploy --config wrangler.trading.toml --dry-run --outdir .wrangler-dryrun-coin-panorama
```

Expected: successful bundle with the existing Durable Object and assets binding, no OAuth or account switch.

- [ ] **Step 3: Deploy and record the version**

```powershell
npx wrangler deploy --config wrangler.trading.toml
```

Expected: deployment to `trading.858846.xyz` under Account ID `7722052fdf1845b1b5e987938bb735f3`. Record the returned Worker version ID.

- [ ] **Step 4: Verify production in a real browser**

Using Playwright CLI, check desktop and 390 x 844 mobile in automatic, light, and dark modes. Verify:

- the third tab and deep link;
- a complete list snapshot with shared `updatedAt`;
- all filters, sorting directions, period switching, and null-last behavior;
- BTC, ETH, SOL, and one non-major symbol detail;
- an enrichment-missing symbol shows `—` rather than zero;
- refresh preserves state;
- desktop drawer focus return and mobile back behavior;
- no document-level overflow, console errors, or page errors;
- the first two workspaces still render and refresh.

- [ ] **Step 5: Clean generated artifacts and commit scoped fixes**

Dry-run-list and remove only generated `.playwright-cli`, `.wrangler`, and `.wrangler-dryrun-coin-panorama` directories. If production verification required fixes, rerun the full verification set and commit only panorama/trading files:

```powershell
git add trading-worker.js trading-panorama.js trading-public tools/test-trading-panorama-*.mjs
git commit -m "fix: polish coin panorama production behavior"
```
