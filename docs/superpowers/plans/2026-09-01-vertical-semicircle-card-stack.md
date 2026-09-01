# Vertical Semicircle Article Card Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the archive thumbnail stack from a horizontal upper arch into a vertical left semicircle shaped like `(`, with the active card pulled from the leftmost midpoint.

**Architecture:** Keep the existing article-cylinder controller and replace only its responsive geometry, tangent orientation, and depth mapping. CSS will resize and reposition the stack footprint so the complete vertical ellipse fits between the preview and sidebar. Existing contract tests will be changed first, then production asset keys, browser interaction, and Cloudflare deployment will be verified.

**Tech Stack:** Vanilla JavaScript, CSS 3D transforms, Node.js assertion contracts, Playwright CLI, Cloudflare Workers and Wrangler.

---

## File Map

- Modify `tools/test-blog-article-cylinder.mjs`: require vertical-half-ellipse coordinates and a left-midpoint pulled card while retaining interaction and sidebar contracts.
- Modify `blog-public/script.js`: calculate the vertical `(` geometry, tangent rotation, center-weighted depth, and responsive radii.
- Modify `blog-public/styles.css`: provide a taller, narrower stack footprint on desktop and mobile.
- Modify `blog-worker.js`: update script and stylesheet cache keys.
- Modify `tools/test-blog-system-i18n.mjs`: expect the new shared asset keys.
- Modify `tools/test-blog-admin-fluid-width.mjs`, `tools/test-blog-auth-fluid-width.mjs`, and `tools/test-blog-user-pages-nav-width.mjs`: update their shared stylesheet-key expectation only.

### Task 1: Replace the Horizontal-Arc Contract

**Files:**
- Modify: `tools/test-blog-article-cylinder.mjs:45-88`

- [ ] **Step 1: Write the failing vertical-semicircle assertions**

Replace the current horizontal geometry assertions with:

```js
assert.match(script, /var theta = -Math\.PI \/ 2 \+ arcT \* Math\.PI/, 'cards must span a vertical 180-degree arc');
assert.match(script, /centerX - radiusX \* Math\.cos\(theta\)/, 'vertical semicircle X must bulge left at its midpoint');
assert.match(script, /centerY \+ radiusY \* Math\.sin\(theta\)/, 'vertical semicircle Y must run from top to bottom');
assert.match(script, /var pullDistance = compact \? 20 : 20/, 'the active card should pull only 20px from the left midpoint');
assert.match(script, /var x = pulled \? centerX - radiusX - pullDistance/, 'the active card must sit left of the arc midpoint');
assert.match(script, /var y = pulled \? centerY/, 'the active card must stay vertically centered');
assert.match(script, /var depth = pulled \? 1 : Math\.cos\(theta\)/, 'depth must peak at the left midpoint');
assert.match(script, /Math\.atan2\(radiusY \* Math\.cos\(theta\), radiusX \* Math\.sin\(theta\)\)/, 'card rotation must follow the vertical ellipse tangent');
assert.doesNotMatch(script, /baselineY - radiusY \* Math\.sin\(theta\)/, 'the previous horizontal upper arch must be removed');
assert.match(styles, /\.article-stream\.is-cylinder\s*\{[\s\S]*width:\s*clamp\(18rem, 30%, 24rem\)[\s\S]*height:\s*26rem/, 'desktop needs a tall narrow stack footprint');
assert.match(styles, /@media\s*\(max-width:\s*720px\)[\s\S]*\.article-stream\.is-cylinder\s*\{[\s\S]*width:\s*min\(54vw, 13rem\)[\s\S]*height:\s*13rem/s, 'mobile needs a compact vertical footprint');
```

Keep the existing checks for image-only cards, `rotateX`, preserve-3d, preview synchronization, pointer dragging, keyboard navigation, reduced motion, responsive preview sizing, and the desktop sidebar.

- [ ] **Step 2: Run the contract and confirm the expected failure**

```powershell
node tools/test-blog-article-cylinder.mjs
```

Expected: FAIL at the new `theta` assertion because the current implementation starts at zero and forms a horizontal upper arch.

- [ ] **Step 3: Commit the failing contract**

```powershell
git add -- tools/test-blog-article-cylinder.mjs
git commit -m "test: define vertical semicircle card stack"
```

### Task 2: Implement the Vertical Half-Ellipse

**Files:**
- Modify: `blog-public/script.js:1422-1450`
- Test: `tools/test-blog-article-cylinder.mjs`

- [ ] **Step 1: Replace `renderArcCardStack` geometry with the vertical model**

Use this calculation inside the existing card loop:

```js
var stackSlot = modulo(index - activeIndex, cards.length);
var pulled = stackSlot === 0;
var arcT = pulled ? 0.5 : (stackSlot - 1) / Math.max(1, cards.length - 2);
var theta = -Math.PI / 2 + arcT * Math.PI;
var pullDistance = compact ? 20 : 20;
var radiusX = compact ? 38 : 92;
var radiusY = compact ? 82 : 178;
var centerX = compact ? 30 : 74;
var centerY = compact ? 0 : 0;
var depth = pulled ? 1 : Math.cos(theta);
var x = pulled ? centerX - radiusX - pullDistance : centerX - radiusX * Math.cos(theta);
var y = pulled ? centerY : centerY + radiusY * Math.sin(theta);
var tangentRadians = pulled ? Math.PI / 2 : Math.atan2(radiusY * Math.cos(theta), radiusX * Math.sin(theta));
var tangentDegrees = tangentRadians * 180 / Math.PI - 90;
var rotation = pulled ? 0 : Math.max(-34, Math.min(34, tangentDegrees));
var tilt = pulled ? 52 : 58;
var scale = pulled ? 1 : 0.8 + depth * 0.14;
var opacity = pulled ? 1 : 0.72 + depth * 0.2;
var depthZ = pulled ? 24 : -((1 - depth) * (compact ? 26 : 48));
var depthOrder = 12 + Math.round(depth * 16) - Math.min(stackSlot, 6);
card.classList.toggle('is-pulled', stackSlot === 0);
card.style.zIndex = String(pulled ? 40 : depthOrder);
card.style.transform = 'translate3d(calc(-50% + ' + x.toFixed(2) + 'px), calc(-50% + ' + y.toFixed(2) + 'px), ' + depthZ.toFixed(2) + 'px) rotateX(' + tilt.toFixed(2) + 'deg) rotateZ(' + rotation.toFixed(2) + 'deg) scale(' + scale.toFixed(3) + ')';
card.style.setProperty('--cylinder-card-opacity', opacity.toFixed(3));
card.style.setProperty('--cylinder-depth', depth.toFixed(3));
```

Keep `ring.style.transform`, preview synchronization, pointer handling, keyboard handling, and `setGeometry` unchanged.

- [ ] **Step 2: Run the focused contract**

```powershell
node tools/test-blog-article-cylinder.mjs
```

Expected: geometry assertions PASS and the footprint assertion FAILS until CSS is updated.

- [ ] **Step 3: Inspect the scoped script diff**

```powershell
git diff -- blog-public/script.js
```

Expected: only `renderArcCardStack` geometry, depth, and transform values change.

- [ ] **Step 4: Commit the geometry**

```powershell
git add -- blog-public/script.js
git commit -m "feat: arrange article cards on a vertical semicircle"
```

### Task 3: Fit the Vertical Arc into Responsive Layouts

**Files:**
- Modify: `blog-public/styles.css:4787-4802`
- Modify: `blog-public/styles.css:5777-5798`
- Test: `tools/test-blog-article-cylinder.mjs`

- [ ] **Step 1: Replace the desktop stack footprint**

Keep the existing perspective and preserve-3d declarations, but set the base rule to:

```css
.article-stream.is-cylinder {
  position: absolute;
  z-index: 3;
  top: 50%;
  left: auto;
  right: 0.75rem;
  bottom: auto;
  width: clamp(18rem, 30%, 24rem);
  height: 26rem;
  display: block;
  perspective: 760px;
  perspective-origin: 42% 50%;
  transform: translateY(-38%);
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
  will-change: transform, opacity;
}
```

This places the arc in the preview's right-side open region. Browser measurements in Task 5 determine the final `right` and vertical translation without changing the vertical geometry.

- [ ] **Step 2: Replace the mobile footprint override**

Use:

```css
  .article-stream.is-cylinder {
    top: auto;
    left: auto;
    right: 0.75rem;
    bottom: 0.9rem;
    width: min(54vw, 13rem);
    height: 13rem;
    perspective: 560px;
    perspective-origin: 42% 50%;
    transform: none;
    transform-style: preserve-3d;
    -webkit-transform-style: preserve-3d;
  }
```

Keep card dimensions, active-card emphasis, preview dimensions, and desktop sidebar rules unchanged.

- [ ] **Step 3: Run the focused contract**

```powershell
node tools/test-blog-article-cylinder.mjs
```

Expected: `article cylinder contract passed`.

- [ ] **Step 4: Commit responsive positioning**

```powershell
git add -- blog-public/styles.css
git commit -m "style: fit vertical article arc responsively"
```

### Task 4: Refresh Asset Keys and Run Regression Tests

**Files:**
- Modify: `blog-worker.js`
- Modify: `tools/test-blog-system-i18n.mjs`
- Modify: `tools/test-blog-admin-fluid-width.mjs`
- Modify: `tools/test-blog-auth-fluid-width.mjs`
- Modify: `tools/test-blog-user-pages-nav-width.mjs`

- [ ] **Step 1: Update production cache keys**

Replace every script key:

```text
20260831-overhead-semicircle
```

with:

```text
20260901-vertical-semicircle
```

Replace the stylesheet key with the same `20260901-vertical-semicircle` value. Update the listed contract expectations to match.

- [ ] **Step 2: Verify exact Worker key counts**

```powershell
$count = (rg -o '20260901-vertical-semicircle' blog-worker.js | Measure-Object).Count
if ($count -ne 13) { throw "Expected 13 Worker asset keys, got $count" }
if (rg -n '20260831-overhead-semicircle' blog-worker.js tools) { throw 'Stale semicircle key remains' }
```

Expected: 12 script references plus one stylesheet reference and no stale key.

- [ ] **Step 3: Run focused and related regression contracts**

```powershell
node tools/test-blog-article-cylinder.mjs
node tools/test-blog-system-i18n.mjs
node tools/test-blog-admin-fluid-width.mjs
node tools/test-blog-auth-fluid-width.mjs
node tools/test-blog-user-pages-nav-width.mjs
```

Expected: all commands exit with code zero and print their success messages.

- [ ] **Step 4: Run a Wrangler dry run**

```powershell
npx --yes wrangler deploy --config wrangler.blog.toml --dry-run --outdir .wrangler-dryrun-vertical-semicircle
```

Expected: Wrangler reads the blog assets and produces a successful Worker bundle without deployment.

- [ ] **Step 5: Commit asset keys and test expectations**

```powershell
git add -- blog-worker.js tools/test-blog-system-i18n.mjs tools/test-blog-admin-fluid-width.mjs tools/test-blog-auth-fluid-width.mjs tools/test-blog-user-pages-nav-width.mjs
git commit -m "chore: refresh vertical semicircle assets"
```

### Task 5: Calibrate and Verify in Real Browsers

**Files:**
- Verify and, if measured bounds require it, modify: `blog-public/script.js`
- Verify and, if measured bounds require it, modify: `blog-public/styles.css`
- Test: `tools/test-blog-article-cylinder.mjs`

- [ ] **Step 1: Start the existing Node preview server**

```powershell
$env:PORT='8790'
node tools/serve-blog-preview.mjs
```

Expected: `Blog preview listening on http://127.0.0.1:8790`. Use this server because local Wrangler has previously failed on this Windows host with `spawn EFTYPE`.

- [ ] **Step 2: Verify mobile at 390 by 844**

Open `http://127.0.0.1:8790/articles`, select cylinder layout, and verify:

```text
- non-active cards form a vertical left semicircle shaped like (
- top and bottom endpoints are on the right
- the active card is at the leftmost midpoint and visibly pulled left
- exactly one card is pulled
- all transformed card bounds remain inside the article panel
- no horizontal page overflow
- tap, keyboard, and drag change the preview and pulled card together
```

Save `output/playwright/vertical-semicircle-mobile-local.png`.

- [ ] **Step 3: Verify desktop at 1440 by 1000**

Verify:

```text
- the vertical ( arc occupies the open region right of the preview
- the large preview and article link are unobstructed
- categories and recent articles remain visible in the sidebar
- all card bounds remain inside the main article panel
- click, drag, ArrowLeft, ArrowRight, and Enter update the preview
- no card-stack console errors
```

Save `output/playwright/vertical-semicircle-desktop-local.png`.

- [ ] **Step 4: Calibrate only measured geometry values**

If transformed bounds clip or overlap, adjust only `centerX`, `centerY`, `radiusX`, `radiusY`, stack `right`, stack vertical position, or responsive footprint. After each adjustment run:

```powershell
node tools/test-blog-article-cylinder.mjs
```

Expected: `article cylinder contract passed` after final calibration.

- [ ] **Step 5: Commit browser calibration when needed**

```powershell
git add -- blog-public/script.js blog-public/styles.css tools/test-blog-article-cylinder.mjs
git commit -m "fix: calibrate vertical semicircle bounds"
```

If no calibration files changed, do not create an empty commit.

### Task 6: Deploy and Verify Production

**Files:**
- Deploy: `wrangler.blog.toml`
- Verify: `https://blog.858846.xyz/articles`

- [ ] **Step 1: Load the luowenhui Cloudflare token without printing it**

```powershell
$tokenValue = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN_LUOWENHUI', 'User')
if ([string]::IsNullOrWhiteSpace($tokenValue)) { throw 'CLOUDFLARE_API_TOKEN_LUOWENHUI is missing from User scope' }
$env:CLOUDFLARE_API_TOKEN = $tokenValue
Remove-Variable tokenValue
```

Expected: no output and no exception.

- [ ] **Step 2: Deploy the Worker**

```powershell
npx --yes wrangler deploy --config wrangler.blog.toml
```

Expected: Wrangler prints the `blog.858846.xyz` route and a new version ID.

- [ ] **Step 3: Verify production cache keys**

```powershell
$html = (Invoke-WebRequest 'https://blog.858846.xyz/articles?verify=vertical-semicircle' -UseBasicParsing).Content
if ($html -notmatch 'script\.js\?v=20260901-vertical-semicircle') { throw 'Production script key is stale' }
if ($html -notmatch 'styles\.css\?v=20260901-vertical-semicircle') { throw 'Production stylesheet key is stale' }
```

Expected: no exception.

- [ ] **Step 4: Repeat production browser verification**

Repeat the complete mobile and desktop Task 5 checklists against `https://blog.858846.xyz/articles?verify=vertical-semicircle`. Save:

```text
output/playwright/vertical-semicircle-mobile-production.png
output/playwright/vertical-semicircle-desktop-production.png
```

- [ ] **Step 5: Record completion evidence**

Report the deployment version, five regression results, dry-run result, asset-key check, responsive screenshots, interaction results, sidebar result, overflow measurements, and console status. If production reveals a code defect, correct it and repeat Tasks 4 through 6 before completion.
