# Trading Dashboard Light Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an approved warm-gray light appearance to the trading dashboard with an automatic/system mode, a three-state header control, persistent manual preference, and no interruption to live market updates.

**Architecture:** A small standalone `theme-controller.js` owns preference validation, system-resolution, persistence, root attributes, control state, and browser theme color. A synchronous head bootstrap applies the saved/resolved theme before CSS paint; semantic CSS variables provide dark and light palettes while component rules continue to consume those variables. Static contract tests protect markup and theme boundaries, followed by a Playwright interaction test covering persistence, system changes, all dashboard views, and mobile overflow.

**Tech Stack:** Static HTML/CSS/JavaScript, browser `localStorage`, `matchMedia`, Node.js assertion scripts, Playwright, Cloudflare Workers/Wrangler.

---

## File Structure

- Create `trading-public/theme-controller.js`: isolated controller for `auto`, `light`, and `dark` preference behavior.
- Modify `trading-public/index.html`: pre-paint bootstrap, header control markup, cache-version updates, and theme script loading.
- Modify `trading-public/styles.css`: semantic palette expansion, approved warm light palette, theme-control styling, and light component overrides.
- Create `tools/test-trading-theme-contract.mjs`: dependency-free static assertions for the theme contract and isolation from market code.
- Create `tools/test-trading-theme-browser.spec.mjs`: real-browser tests for system preference, persistence, runtime changes, views, refresh continuity, and responsive overflow.
- Modify `docs/superpowers/specs/2026-09-18-trading-light-theme-design.md` only if implementation uncovers a genuine contradiction; otherwise leave the approved spec unchanged.

### Task 1: Lock the HTML and Controller Contract

**Files:**
- Create: `tools/test-trading-theme-contract.mjs`
- Test: `tools/test-trading-theme-contract.mjs`

- [ ] **Step 1: Write the failing contract test**

Create the test with explicit requirements:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('trading-public/index.html', 'utf8');
const css = fs.readFileSync('trading-public/styles.css', 'utf8');
const controllerPath = 'trading-public/theme-controller.js';

assert.ok(fs.existsSync(controllerPath), 'theme controller must exist');
const controller = fs.readFileSync(controllerPath, 'utf8');

assert.match(html, /data-theme-bootstrap/);
assert.match(html, /id="theme-toggle"/);
assert.match(html, /aria-label="主题模式/);
assert.match(html, /src="\/theme-controller\.js\?v=/);
assert.match(css, /:root\[data-theme="light"\]/);
assert.match(css, /--surface:/);
assert.match(css, /--surface-raised:/);
assert.match(css, /--shadow-panel:/);
assert.match(controller, /trading-theme-preference/);
assert.match(controller, /matchMedia\('\(prefers-color-scheme: dark\)'\)/);
assert.match(controller, /localStorage\.setItem/);
assert.match(controller, /addEventListener\('change'/);
assert.doesNotMatch(controller, /fetch\(|setInterval\(|\/api\//);

console.log('trading theme contract tests passed');
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run:

```powershell
node tools/test-trading-theme-contract.mjs
```

Expected: FAIL with `theme controller must exist`.

- [ ] **Step 3: Commit the red test**

```powershell
git add tools/test-trading-theme-contract.mjs
git commit -m "test: define trading theme contract"
```

### Task 2: Implement Preference Resolution and the Header Control

**Files:**
- Create: `trading-public/theme-controller.js`
- Modify: `trading-public/index.html:4-24`
- Test: `tools/test-trading-theme-contract.mjs`

- [ ] **Step 1: Add the pre-paint bootstrap and control markup**

In `index.html`, keep the existing dark theme color as the no-script fallback, add `id="theme-color"`, and place this bootstrap before the stylesheet:

```html
<meta name="theme-color" id="theme-color" content="#07101f">
<script data-theme-bootstrap>
  (() => {
    const key = 'trading-theme-preference';
    const allowed = new Set(['auto', 'light', 'dark']);
    let preference = 'auto';
    try {
      const saved = localStorage.getItem(key);
      if (allowed.has(saved)) preference = saved;
    } catch {}
    const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
    const resolved = preference === 'auto' ? (systemDark ? 'dark' : 'light') : preference;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  })();
</script>
```

Wrap the existing live status and new control in a header-actions container:

```html
<div class="header-actions">
  <button class="theme-toggle" id="theme-toggle" type="button"
    aria-label="主题模式：自动" title="主题模式：自动">
    <span aria-hidden="true" class="theme-toggle-icon">◐</span>
    <span class="theme-toggle-label">自动</span>
  </button>
  <div class="status" id="status" aria-live="polite"><i></i><span>正在同步市场</span></div>
</div>
```

Load the controller before the existing application scripts and bump changed asset versions:

```html
<script src="/theme-controller.js?v=20260918-1" defer></script>
<script src="/app.js?v=20260917-2" defer></script>
<script src="/market-detail-view.js?v=20260918-1" type="module"></script>
```

- [ ] **Step 2: Implement the isolated controller**

Create `trading-public/theme-controller.js`:

```js
(() => {
  const STORAGE_KEY = 'trading-theme-preference';
  const PREFERENCES = ['auto', 'light', 'dark'];
  const LABELS = { auto: '自动', light: '浅色', dark: '深色' };
  const ICONS = { auto: '◐', light: '☀', dark: '☾' };
  const THEME_COLORS = { light: '#f5f2eb', dark: '#07101f' };
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');

  function readPreference() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return PREFERENCES.includes(value) ? value : 'auto';
    } catch {
      return 'auto';
    }
  }

  function resolveTheme(preference) {
    return preference === 'auto' ? (media?.matches === false ? 'light' : 'dark') : preference;
  }

  function render(preference) {
    const theme = resolveTheme(preference);
    const root = document.documentElement;
    root.dataset.themePreference = preference;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;

    const toggle = document.querySelector('#theme-toggle');
    if (toggle) {
      const description = `主题模式：${LABELS[preference]}`;
      toggle.dataset.preference = preference;
      toggle.setAttribute('aria-label', description);
      toggle.title = description;
      toggle.querySelector('.theme-toggle-icon').textContent = ICONS[preference];
      toggle.querySelector('.theme-toggle-label').textContent = LABELS[preference];
    }

    const themeColor = document.querySelector('#theme-color');
    if (themeColor) themeColor.content = THEME_COLORS[theme];
  }

  function setPreference(preference) {
    const valid = PREFERENCES.includes(preference) ? preference : 'auto';
    try { localStorage.setItem(STORAGE_KEY, valid); } catch {}
    render(valid);
  }

  function init() {
    const toggle = document.querySelector('#theme-toggle');
    toggle?.addEventListener('click', () => {
      const current = readPreference();
      const next = PREFERENCES[(PREFERENCES.indexOf(current) + 1) % PREFERENCES.length];
      setPreference(next);
    });
    media?.addEventListener('change', () => {
      if (readPreference() === 'auto') render('auto');
    });
    render(readPreference());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
```

- [ ] **Step 3: Run contract and existing trading tests**

Run:

```powershell
node tools/test-trading-theme-contract.mjs
node tools/test-trading-detail-contract.mjs
node tools/test-trading-detail-data.mjs
```

Expected: all three commands print their passing messages and exit 0.

- [ ] **Step 4: Commit controller and markup**

```powershell
git add trading-public/index.html trading-public/theme-controller.js tools/test-trading-theme-contract.mjs
git commit -m "feat: add persistent trading theme control"
```

### Task 3: Convert the Palette to Semantic Variables and Add Warm Light Styling

**Files:**
- Modify: `trading-public/styles.css:2-519`
- Test: `tools/test-trading-theme-contract.mjs`

- [ ] **Step 1: Expand the dark palette without changing its appearance**

Replace the root palette with semantic values while preserving the current dark colors:

```css
:root {
  --bg: #050914;
  --surface: #0d1829;
  --surface-raised: #101d30;
  --surface-control: #0a1424;
  --surface-plot: rgba(22, 40, 66, 0.62);
  --line: #233753;
  --line-strong: #4f6b92;
  --text: #f2f7ff;
  --text-soft: #dce9fb;
  --muted: #8292ab;
  --muted-soft: #61728b;
  --green: #51d7ae;
  --red: #ff7188;
  --cyan: #68d9ff;
  --track: #1b2d49;
  --shadow-panel: none;
  --radius: 12px;
  color-scheme: dark;
}
```

Replace hard-coded component surfaces, tracks, text shades, borders, skeleton colors, marker colors, and overlays with these variables. Keep brand-only gradient stops hard-coded when their meaning is decorative rather than semantic.

- [ ] **Step 2: Add the approved light palette**

Add directly after `:root`:

```css
:root[data-theme="light"] {
  --bg: #f5f2eb;
  --surface: #fffdf8;
  --surface-raised: #ffffff;
  --surface-control: #f1ede5;
  --surface-plot: rgba(241, 237, 229, 0.82);
  --line: #d9d1c2;
  --line-strong: #b8ad9b;
  --text: #29323d;
  --text-soft: #3e4956;
  --muted: #746f67;
  --muted-soft: #91897d;
  --green: #137d68;
  --red: #c74750;
  --cyan: #1688aa;
  --track: #e8e0d4;
  --shadow-panel: 0 5px 18px rgba(75, 62, 42, 0.08);
  color-scheme: light;
}
```

Add narrow overrides only where variables cannot express the required light treatment: the page ambient gradients/grid, active segmented gradient text, streak-row translucent backgrounds, skeleton shimmer, and quadrant marker glow.

- [ ] **Step 3: Style the theme control and responsive header**

Add styles using existing tokens:

```css
.header-actions { display: flex; align-items: center; gap: 12px; }
.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-control);
  color: var(--text-soft);
  font: 600 11px "IBM Plex Mono", monospace;
  cursor: pointer;
}
.theme-toggle:hover { border-color: var(--line-strong); }
.theme-toggle:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }
.theme-toggle-icon { color: var(--cyan); font-size: 14px; }
```

Within the existing mobile media query, allow `.header-actions` to wrap without widening the page, and retain a visible label at 390 px unless it causes measured overflow.

- [ ] **Step 4: Run the static tests and inspect the CSS diff**

Run:

```powershell
node tools/test-trading-theme-contract.mjs
node tools/test-trading-detail-contract.mjs
git diff --check
```

Expected: both tests pass; `git diff --check` has no output.

- [ ] **Step 5: Commit the palette implementation**

```powershell
git add trading-public/styles.css tools/test-trading-theme-contract.mjs
git commit -m "feat: add warm light palette to trading dashboard"
```

### Task 4: Add Real-Browser Theme Behavior Coverage

**Files:**
- Create: `tools/test-trading-theme-browser.spec.mjs`
- Modify: `trading-public/index.html` only to bump final asset versions if needed
- Test: `tools/test-trading-theme-browser.spec.mjs`

- [ ] **Step 1: Write a Playwright test with a local static server**

Create a Playwright test that starts a Node `http` server in `beforeAll`, serves `trading-public`, and supplies deterministic JSON for `/api/market`, `/api/detail`, `/api/liquidations`, and `/api/etf`. Use these focused assertions:

```js
import { test, expect } from '@playwright/test';

test('auto follows system and manual preference persists', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(baseUrl);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('#theme-toggle')).toHaveAttribute('data-preference', 'auto');

  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('#theme-toggle')).toHaveAttribute('data-preference', 'light');
  await page.reload();
  await expect(page.locator('#theme-toggle')).toHaveAttribute('data-preference', 'light');

  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.locator('#theme-toggle').click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
```

Add a second test that opens the aggregate view and BTC/ETH/SOL detail view, confirms the toggle remains visible, waits for two mocked market requests across a shortened/fake timer boundary, and asserts that changing themes does not clear rendered market cards. Add a mobile block at a 390 x 844 viewport:

```js
expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
```

Capture `pageerror` and console `error` events and assert both arrays remain empty.

- [ ] **Step 2: Run the browser test and verify any initial failures are specific**

Run:

```powershell
npx --yes playwright test tools/test-trading-theme-browser.spec.mjs --workers=1
```

Expected before final fixes: any failure points to a concrete theme state, visibility, API fixture, or overflow assertion rather than a missing test dependency.

- [ ] **Step 3: Apply the minimal fixes identified by the browser test**

Limit fixes to `theme-controller.js`, `index.html`, and `styles.css`. Do not change `app.js`, `market-detail-data.js`, `market-detail-view.js`, API routes, refresh intervals, or calculation logic unless the test has exposed a pre-existing contract violation unrelated to theme; report such a violation instead of folding it into this feature.

- [ ] **Step 4: Run the full local verification set**

Run:

```powershell
node tools/test-trading-theme-contract.mjs
node tools/test-trading-detail-contract.mjs
node tools/test-trading-detail-data.mjs
npx --yes playwright test tools/test-trading-theme-browser.spec.mjs --workers=1
git diff --check
```

Expected: all Node scripts print passing messages, Playwright reports all tests passed, and the diff check is silent.

- [ ] **Step 5: Commit browser coverage and final asset versions**

```powershell
git add tools/test-trading-theme-browser.spec.mjs trading-public/index.html trading-public/theme-controller.js trading-public/styles.css
git commit -m "test: verify trading theme behavior"
```

### Task 5: Visual Review and Production Deployment

**Files:**
- Verify: `trading-public/index.html`
- Verify: `trading-public/styles.css`
- Verify: `trading-public/theme-controller.js`
- Verify: `wrangler.trading.toml`

- [ ] **Step 1: Start a local Worker preview**

Run from the isolated worktree without printing either secret:

```powershell
$env:CLOUDFLARE_API_TOKEN = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN_LUOWENHUI', 'User')
$env:COINALYZE_API_KEY = [Environment]::GetEnvironmentVariable('COINALYZE_API_KEY', 'User')
npx wrangler dev --config wrangler.trading.toml --local --var "COINALYZE_API_KEY:$env:COINALYZE_API_KEY"
```

Expected: Wrangler prints a localhost URL and does not print secret values.

- [ ] **Step 2: Complete desktop and mobile visual checks**

At desktop and 390 px widths, verify both appearances on:

- the grouped market overview;
- BTC, ETH, and SOL detail panels;
- loading, unavailable-value, and API-error states;
- positive/negative rows, ranking bars, plot axes, streak highlights, and skeletons.

Confirm the selected B direction is visible: warm-gray page, warm-white cards, restrained warm borders, readable slate text, cyan brand accents, and distinct green/red data colors. Confirm dark mode remains visually unchanged.

- [ ] **Step 3: Run a Cloudflare dry run with the required account token**

Run:

```powershell
$env:CLOUDFLARE_API_TOKEN = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN_LUOWENHUI', 'User')
npx wrangler deploy --config wrangler.trading.toml --dry-run --outdir .wrangler-dryrun-trading-light-theme
```

Expected: successful Worker bundle using Account ID `7722052fdf1845b1b5e987938bb735f3`; no OAuth/login prompt.

- [ ] **Step 4: Deploy to the existing production route**

Run:

```powershell
$env:CLOUDFLARE_API_TOKEN = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN_LUOWENHUI', 'User')
npx wrangler deploy --config wrangler.trading.toml
```

Expected: successful deployment to `trading.858846.xyz`. Do not log in, run OAuth, or switch to `rowanwebber`.

- [ ] **Step 5: Verify production behavior and freshness**

Open `https://trading.858846.xyz` with a cache-busting query. Repeat the three-state persistence test, system-theme test, overview/detail navigation, 390 px overflow check, console/page-error check, and confirm live market timestamps/data continue to refresh.

Run the existing production data verification when its environment requirements are available:

```powershell
node tools/test-coinalyze-production.mjs
```

Expected: the production theme behavior passes, the data verification exits 0, and the page reports no console errors.

- [ ] **Step 6: Record the deployed Worker version and final commit**

If visual verification required no code changes, record the Worker version in the handoff. If it required scoped fixes, rerun Task 4's full verification set and commit only the affected trading files:

```powershell
git add trading-public/index.html trading-public/styles.css trading-public/theme-controller.js tools/test-trading-theme-browser.spec.mjs
git commit -m "fix: polish trading light theme"
```
