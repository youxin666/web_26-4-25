# Coinalyze Hybrid Market Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the remaining single-exchange derivatives metrics in the BTC / ETH / SOL watch view with a cached Coinalyze cross-exchange aggregation while keeping Binance price and funding-rate data.

**Architecture:** A new pure Coinalyze aggregation module owns fixed market selection, API request construction and metric aggregation. `MarketSnapshot` invokes it inside the Durable Object refresh gate, stores one merged snapshot per asset, and never exposes `COINALYZE_API_KEY`. The existing browser collector continues to submit Binance price/funding candidates; the Worker supplies Coinalyze OI, CVD, long/short and liquidation metrics.

**Tech Stack:** Cloudflare Workers, Durable Objects, JavaScript ES modules, Coinalyze v1 REST API, Binance public futures API, Node assertion scripts, Playwright CLI.

---

### Task 1: Lock the live Coinalyze market contract

**Files:**
- Create: `tools/probe-coinalyze-markets.mjs`
- Create: `tools/test-coinalyze-data.mjs`
- Create: `trading-coinalyze.js`

- [ ] **Step 1: Write the failing market-selection test**

```js
import assert from 'node:assert/strict';
import { selectMarkets } from '../trading-coinalyze.js';

const selected = selectMarkets([
  { symbol: 'BTCUSDT_PERP.A', base_asset: 'BTC', exchange: 'A', is_perpetual: true, margined: 'STABLE', has_buy_sell_data: true, has_long_short_ratio_data: true },
  { symbol: 'BTCUSDT.6', base_asset: 'BTC', exchange: '6', is_perpetual: true, margined: 'STABLE', has_buy_sell_data: true, has_long_short_ratio_data: true },
  { symbol: 'BTCUSDT_PERP.3', base_asset: 'BTC', exchange: '3', is_perpetual: true, margined: 'STABLE', has_buy_sell_data: true, has_long_short_ratio_data: false },
]);
assert.deepEqual(selected.BTC.map(item => item.symbol), ['BTCUSDT_PERP.A', 'BTCUSDT.6', 'BTCUSDT_PERP.3']);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tools/test-coinalyze-data.mjs`

Expected: failure because `trading-coinalyze.js` does not exist.

- [ ] **Step 3: Implement fixed market selection and pure helpers**

```js
export const ASSETS = ['BTC', 'ETH', 'SOL'];
export const MARKET_CODES = ['A', '6', '3'];
export const PERIOD_WINDOWS = { '15m': 3, '30m': 6, '1h': 12, '4h': 48, '8h': 96, '12h': 144, '24h': 288 };

export function selectMarkets(markets) {
  return Object.fromEntries(ASSETS.map(asset => [asset, MARKET_CODES.map(exchange =>
    markets.find(item => item.base_asset === asset && item.exchange === exchange && item.is_perpetual && item.margined === 'STABLE' && /USDT/.test(item.symbol))
  ).filter(Boolean)]));
}
```

Create `tools/probe-coinalyze-markets.mjs` that reads `COINALYZE_API_KEY` from the environment, sends it only as an `api_key` request header, prints selected public market symbols and exits nonzero unless all three assets have the three expected exchanges. It must not log the key.

- [ ] **Step 4: Run pure and live discovery checks**

Run: `node tools/test-coinalyze-data.mjs; node tools/probe-coinalyze-markets.mjs`

Expected: pure selection test passes; probe prints nine public market symbols with no key material.

- [ ] **Step 5: Commit**

```bash
git add trading-coinalyze.js tools/test-coinalyze-data.mjs tools/probe-coinalyze-markets.mjs
git commit -m "feat: define coinalyze market selection"
```

### Task 2: Aggregate Coinalyze OI, CVD, liquidations and ratios

**Files:**
- Modify: `trading-coinalyze.js`
- Modify: `tools/test-coinalyze-data.mjs`

- [ ] **Step 1: Add failing aggregation tests**

```js
import { aggregateAssetHistory } from '../trading-coinalyze.js';

const result = aggregateAssetHistory({
  oi: [{ symbol: 'BTCUSDT_PERP.A', history: [{ t: 0, c: 100 }, { t: 300, c: 120 }] }],
  ohlcv: [{ symbol: 'BTCUSDT_PERP.A', history: [{ t: 0, c: 10, v: 8, bv: 5 }, { t: 300, c: 10, v: 12, bv: 9 }] }],
  liquidations: [{ symbol: 'BTCUSDT_PERP.A', history: [{ t: 300, l: 40, s: 10 }] }],
  ratios: [{ symbol: 'BTCUSDT_PERP.A', history: [{ t: 300, r: 2, l: 0.66, s: 0.34 }] }],
});
assert.equal(result.rows.at(-1).oiUsd, 120);
assert.equal(result.rows.at(-1).netFlowUsd, 60);
assert.equal(result.liquidations.longUsd, 40);
assert.equal(result.longShortRatio, 2);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tools/test-coinalyze-data.mjs`

Expected: failure because `aggregateAssetHistory` is not exported.

- [ ] **Step 3: Implement aggregation and bounded API client**

```js
export function aggregateAssetHistory({ oi, ohlcv, liquidations, ratios }) {
  // Join each market by Unix-second bucket; sum OI and CVD in USD.
  // CVD increment is (2 * bv - v) * c. Do not invent missing buckets.
  // Weight long/short ratio by latest market OI and include only markets with l/s data.
}

export async function fetchCoinalyzeMetrics({ apiKey, markets, now = Date.now() }) {
  const symbols = markets.flatMap(asset => asset.map(item => item.symbol));
  if (symbols.length !== 9) throw new Error('Expected exactly nine Coinalyze markets');
  // Four requests: open-interest-history, ohlcv-history, liquidation-history,
  // long-short-ratio-history, each covering the same nine symbols and 24h+5m baseline.
  // Use api_key header, convert_to_usd=true where supported, and surface 401/429 status.
}
```

`fetchCoinalyzeMetrics` must request 25 hours of 5-minute data to tolerate endpoint lag. It must stop on 429, retain `Retry-After`, and never retry inside the request. The function returns `{ assets, coverage, fetchedAt }`; coverage has independent `oiMarkets`, `cvdMarkets`, `ratioMarkets`, and `liquidationMarkets` counts.

- [ ] **Step 4: Run tests and a safe live request**

Run: `node tools/test-coinalyze-data.mjs; node tools/probe-coinalyze-markets.mjs --sample`

Expected: aggregation tests pass; sample request reports public metric coverage and timestamps without the API key.

- [ ] **Step 5: Commit**

```bash
git add trading-coinalyze.js tools/test-coinalyze-data.mjs tools/probe-coinalyze-markets.mjs
git commit -m "feat: aggregate coinalyze derivatives metrics"
```

### Task 3: Merge server-side Coinalyze data into canonical snapshots

**Files:**
- Modify: `trading-worker.js`
- Modify: `tools/test-trading-detail-contract.mjs`

- [ ] **Step 1: Add failing Worker contract checks**

```js
assert.match(workerSource, /COINALYZE_API_KEY/);
assert.match(workerSource, /coinalyze:markets/);
assert.match(workerSource, /coverage/);
assert.doesNotMatch(workerSource, /api_key=.*COINALYZE_API_KEY/);
```

- [ ] **Step 2: Run contract test to verify it fails**

Run: `node tools/test-trading-detail-contract.mjs`

Expected: failure because the Worker does not yet use Coinalyze.

- [ ] **Step 3: Put the refresh gate in the Durable Object**

```js
export class MarketSnapshot {
  constructor(state, env) { this.state = state; this.env = env; }

  async detail(request, symbol) {
    // On one accepted browser candidate per 60-second slot, call fetchCoinalyzeMetrics
    // once for all three assets, cache `coinalyze:metrics`, then merge this symbol.
    // Store source timestamps, coverage, Coinalyze liquidations and a `coinalyzeStale` flag.
  }
}
```

Merge rules:

- Candidate `current.price`, `current.fundingRate`, and `periods.*.pricePercent` remain Binance values.
- Replace `current.oiNotional`, `current.longShortRatio`, `periods.*.oiPercent`, `periods.*.netFlowUsd`, and `liquidations` with Coinalyze values only when their coverage is nonzero.
- When Coinalyze fails, retain last valid Coinalyze values; never replace them with Binance values under the same label.
- Return 503 only if no prior canonical snapshot exists and both data sources fail.

- [ ] **Step 4: Run the Worker tests and deploy dry-run**

Run: `node tools/test-trading-detail-contract.mjs; node --check trading-worker.js; npx wrangler deploy --config wrangler.trading.toml --dry-run --outdir .wrangler-dryrun-coinalyze`

Expected: tests pass and Wrangler reports the Worker bindings without exposing secrets.

- [ ] **Step 5: Commit**

```bash
git add trading-worker.js tools/test-trading-detail-contract.mjs
git commit -m "feat: merge coinalyze metrics into snapshots"
```

### Task 4: Render source and coverage honestly

**Files:**
- Modify: `trading-public/market-detail-view.js`
- Modify: `trading-public/styles.css`
- Modify: `trading-public/index.html`

- [ ] **Step 1: Add static UI contract checks**

```js
assert.match(viewSource, /Coinalyze 跨交易所衍生品/);
assert.match(viewSource, /coverage/);
assert.match(viewSource, /Coinalyze 数据延迟/);
```

- [ ] **Step 2: Run the contract test to verify it fails**

Run: `node tools/test-trading-detail-contract.mjs`

Expected: failure because the current UI labels all market detail data as Binance.

- [ ] **Step 3: Render separate source semantics**

```js
summaryTile('当前 OI', compactUsd(current.oiNotional), `Coinalyze · ${coverage.oiMarkets} 个市场`);
summaryTile('账户多空比', current.longShortRatio ? current.longShortRatio.toFixed(3) : '—', `Coinalyze · ${coverage.ratioMarkets} 个市场`);
summaryTile('24H 爆仓', liquidationText, `Coinalyze · ${coverage.liquidationMarkets} 个市场`);
source.innerHTML = '<span>Coinalyze 跨交易所衍生品 · Binance 实时价格</span>';
```

Render `—` and “数据延迟” when a Coinalyze field is unavailable or stale. Remove the browser force-order socket and its custom accumulation UI because the displayed liquidation metric now has true historical coverage. Bump changed asset cache versions in `index.html`.

- [ ] **Step 4: Run UI contract and syntax checks**

Run: `node tools/test-trading-detail-contract.mjs; node --check trading-public/market-detail-view.js; node --check trading-public/app.js; git diff --check`

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add trading-public/market-detail-view.js trading-public/styles.css trading-public/index.html tools/test-trading-detail-contract.mjs
git commit -m "feat: show coinalyze source coverage"
```

### Task 5: Deploy and verify production data parity

**Files:**
- Create: `tools/test-coinalyze-production.mjs`

- [ ] **Step 1: Write the production assertion script**

```js
const detail = await fetch(`${base}/api/detail?symbol=BTC`).then(response => response.json());
assert.equal(Object.keys(detail.periods).length, 7);
assert.ok(detail.coverage.oiMarkets >= 1);
assert.ok(detail.sources.coinalyze.updatedAt);
assert.equal(JSON.stringify(detail), JSON.stringify(await fetch(`${base}/api/detail?symbol=BTC`).then(r => r.json())));
```

- [ ] **Step 2: Run it before deployment to verify the expected old-contract failure**

Run: `node tools/test-coinalyze-production.mjs`

Expected: failure because deployed data does not yet have the Coinalyze fields.

- [ ] **Step 3: Deploy with the approved Cloudflare identity**

```powershell
$deployToken = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN_LUOWENHUI', 'User')
$env:CLOUDFLARE_API_TOKEN = $deployToken
$env:CLOUDFLARE_ACCOUNT_ID = '7722052fdf1845b1b5e987938bb735f3'
npx wrangler deploy --config wrangler.trading.toml
```

The command must not print `COINALYZE_API_KEY` and must deploy only `trading.858846.xyz`.

- [ ] **Step 4: Verify API and browser behavior**

Run: `node tools/test-coinalyze-data.mjs; node tools/test-trading-detail-contract.mjs; node tools/test-coinalyze-production.mjs`

Then use Playwright CLI to open `https://trading.858846.xyz/?verify=coinalyze`, select BTC, ETH and SOL, and verify:

- All three show seven periods.
- Source text says “Coinalyze 跨交易所衍生品 · Binance 实时价格”.
- OI, CVD, ratio and liquidation values show their coverage count or an honest unavailable state.
- A second independent browser request for the same asset sees the same canonical `updatedAt` and values.
- A 1920px and a 390px screenshot show no horizontal page overflow.

- [ ] **Step 5: Commit verification script**

```bash
git add tools/test-coinalyze-production.mjs
git commit -m "test: verify coinalyze production snapshots"
```

## Self-review

- The plan covers all approved inputs: Coinalyze OI, CVD, long/short ratio and historical liquidations; Binance price/funding; ETF unchanged.
- The request budget is explicit: nine fixed markets times four metric categories equals 36 calls per refresh slot.
- API key handling is server-only and covered by static contract checks.
- Exact snapshots, coverage fields, 401/429 behavior and browser verification all have a concrete implementation or test task.
