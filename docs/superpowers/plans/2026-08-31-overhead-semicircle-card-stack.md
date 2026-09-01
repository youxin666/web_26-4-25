# Overhead Semicircle Article Card Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the article archive's quarter-arc thumbnail stack with a responsive 180-degree upper semicircle that has a convincing overhead perspective and a gently extracted active card.

**Architecture:** Keep `initArticleCylinder` and its existing preview/interaction controller intact, and replace only `renderArcCardStack` geometry and depth transforms. CSS supplies the shared perspective and responsive footprint; the Worker cache keys expose the new assets immediately. Contract tests pin the geometry, 3D styling, preserved sidebar, and existing interaction hooks before deployment.

**Tech Stack:** Vanilla JavaScript, CSS 3D transforms, Node.js `assert` contract tests, Cloudflare Workers/Wrangler, Playwright browser verification.

---

## File Map

- Modify `tools/test-blog-article-cylinder.mjs`: replace quarter-arc and flat-transform expectations with the approved half-circle and overhead-depth contract.
- Modify `blog-public/script.js`: calculate the responsive elliptical semicircle, tangent rotation, depth scaling, opacity, Z offset, and one gently pulled active card.
- Modify `blog-public/styles.css`: enable preserve-3d card compositing and perspective while retaining the existing desktop/mobile footprints.
- Modify `blog-worker.js`: bump the script and stylesheet query keys used by production HTML.
- Modify `tools/test-blog-system-i18n.mjs`: expect the new shared asset keys.
- Modify `tools/test-blog-admin-fluid-width.mjs`, `tools/test-blog-auth-fluid-width.mjs`, and `tools/test-blog-user-pages-nav-width.mjs`: retain their unrelated layout assertions while updating the shared stylesheet key.

### Task 1: Lock the Approved Geometry and Perspective Contract

**Files:**
- Modify: `tools/test-blog-article-cylinder.mjs:45-86`

- [ ] **Step 1: Replace the old quarter-arc assertions with failing semicircle assertions**

Replace the assertions for `pulledX`, `horizontalSpan`, the quarter sine, the flat transform, and the current fan rotation with:

```js
assert.match(script, /var leftEndpointX = compact \? -4 : -70/, 'both layouts need a stable lower-left arc endpoint');
assert.match(script, /var pullDistance = compact \? 28 : 28/, 'the active card should pull only 28px from the left endpoint');
assert.match(script, /var theta = arcT \* Math\.PI/, 'non-active cards must span a full 180-degree arc');
assert.match(script, /centerX - radiusX \* Math\.cos\(theta\)/, 'semicircle X positions must follow cosine from left to right');
assert.match(script, /baselineY - radiusY \* Math\.sin\(theta\)/, 'semicircle Y positions must form an upper arch');
assert.match(script, /Math\.atan2\(-radiusY \* Math\.cos\(theta\), radiusX \* Math\.sin\(theta\)\)/, 'card rotation must follow the ellipse tangent');
assert.match(script, /rotateX\(' \+ tilt\.toFixed\(2\) \+ 'deg\)/, 'cards need a consistent overhead tilt');
assert.match(script, /translate3d\([\s\S]*depthZ\.toFixed\(2\) \+ 'px\)/, 'card depth must use the 3D axis');
assert.match(script, /card\.style\.zIndex = String\(pulled \? 40 : depthOrder\)/, 'depth ordering must follow the overhead arc');
assert.doesNotMatch(script, /Math\.sin\(arcT \* Math\.PI \* 0\.5\)/, 'the previous quarter arc must be removed');
assert.match(styles, /\.article-stream\.is-cylinder\s*\{[\s\S]*transform-style:\s*preserve-3d/, 'the arc stack must preserve its 3D children');
assert.match(styles, /\.article-stream\.is-cylinder \.article-list-item,[\s\S]*transform-style:\s*preserve-3d/, 'cards must retain overhead transforms');
```

Keep the existing assertions for image-only thumbnails, preview synchronization, pointer dragging, keyboard navigation, reduced motion, responsive preview sizing, and desktop sidebar visibility.

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run:

```powershell
node tools/test-blog-article-cylinder.mjs
```

Expected: FAIL at the first new semicircle assertion because `leftEndpointX`, the `PI` angle, and preserve-3d styling do not exist yet.

- [ ] **Step 3: Commit the failing contract**

```powershell
git add -- tools/test-blog-article-cylinder.mjs
git commit -m "test: define overhead semicircle card stack"
```

### Task 2: Implement the Responsive Half-Circle Geometry

**Files:**
- Modify: `blog-public/script.js:1422-1448`
- Test: `tools/test-blog-article-cylinder.mjs`

- [ ] **Step 1: Replace `renderArcCardStack` with the semicircle calculation**

Use this implementation while leaving `renderCylinder`, `setGeometry`, and the controller's input handlers unchanged:

```js
function renderArcCardStack(activeIndex, compact) {
  ring.style.transform = 'none';
  cards.forEach(function (card, index) {
    var stackSlot = modulo(index - activeIndex, cards.length);
    var pulled = stackSlot === 0;
    var arcT = pulled ? 0 : (stackSlot - 1) / Math.max(1, cards.length - 2);
    var theta = arcT * Math.PI;
    var leftEndpointX = compact ? -4 : -70;
    var pullDistance = compact ? 28 : 28;
    var radiusX = compact ? 47 : 150;
    var radiusY = compact ? 48 : 132;
    var centerX = leftEndpointX + radiusX;
    var baselineY = compact ? 34 : 72;
    var depth = pulled ? 0 : Math.sin(theta);
    var x = pulled ? leftEndpointX - pullDistance : centerX - radiusX * Math.cos(theta);
    var y = pulled ? baselineY + 4 : baselineY - radiusY * Math.sin(theta);
    var tangentRadians = pulled ? 0 : Math.atan2(-radiusY * Math.cos(theta), radiusX * Math.sin(theta));
    var tangentDegrees = tangentRadians * 180 / Math.PI;
    var rotation = pulled ? 0 : Math.max(-52, Math.min(52, tangentDegrees));
    var tilt = pulled ? 52 : 58;
    var scale = pulled ? 1 : 0.94 - depth * 0.18;
    var opacity = pulled ? 1 : 0.92 - depth * 0.22;
    var depthZ = pulled ? 24 : -depth * (compact ? 30 : 54);
    var depthOrder = 24 - Math.round(depth * 12) - Math.min(stackSlot, 8);
    card.classList.toggle('is-pulled', pulled);
    card.style.zIndex = String(pulled ? 40 : depthOrder);
    card.style.transform = 'translate3d(calc(-50% + ' + x.toFixed(2) + 'px), calc(-50% + ' + y.toFixed(2) + 'px), ' + depthZ.toFixed(2) + 'px) rotateX(' + tilt.toFixed(2) + 'deg) rotateZ(' + rotation.toFixed(2) + 'deg) scale(' + scale.toFixed(3) + ')';
    card.style.setProperty('--cylinder-card-opacity', opacity.toFixed(3));
    card.style.setProperty('--cylinder-depth', depth.toFixed(3));
  });
}
```

The one- and two-card cases remain finite because the active card bypasses arc division and the denominator is clamped to at least one.

- [ ] **Step 2: Run the focused test to expose the remaining CSS failure**

Run:

```powershell
node tools/test-blog-article-cylinder.mjs
```

Expected: geometry assertions PASS; the first preserve-3d style assertion FAILS.

- [ ] **Step 3: Inspect the diff for controller isolation**

Run:

```powershell
git diff -- blog-public/script.js
```

Expected: only `renderArcCardStack` changes; preview synchronization, drag/swipe handlers, keyboard handlers, and `setGeometry` remain unchanged.

- [ ] **Step 4: Commit the geometry implementation**

```powershell
git add -- blog-public/script.js
git commit -m "feat: form article cards into a half circle"
```

### Task 3: Add the Overhead 3D Presentation

**Files:**
- Modify: `blog-public/styles.css:4787-4908`
- Modify: `blog-public/styles.css:5777-5798`
- Test: `tools/test-blog-article-cylinder.mjs`

- [ ] **Step 1: Enable 3D stacking on desktop and shared cards**

In the base `.article-stream.is-cylinder` rule, replace the flat transform declarations and add a local perspective origin:

```css
  perspective: 760px;
  perspective-origin: 50% 18%;
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
```

In the shared `.article-stream.is-cylinder .article-list-item` rule, replace the flat declarations with:

```css
  transform-origin: 50% 100%;
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
  box-shadow:
    0 calc(10px + (1 - var(--cylinder-depth, 0)) * 14px)
    calc(22px + (1 - var(--cylinder-depth, 0)) * 20px)
    rgba(31, 45, 61, 0.18);
```

Keep `backface-visibility: hidden`, `will-change`, the existing image-only sizing, and transition timing.

- [ ] **Step 2: Keep the mobile arc compact while preserving 3D depth**

In the mobile `.article-stream.is-cylinder` rule, retain the current `right`, `bottom`, `width`, and `height`, but replace its flat declarations with:

```css
    perspective: 560px;
    perspective-origin: 50% 16%;
    transform-style: preserve-3d;
    -webkit-transform-style: preserve-3d;
```

Do not change the existing mobile preview height or the desktop sidebar media rules.

- [ ] **Step 3: Run the focused contract**

```powershell
node tools/test-blog-article-cylinder.mjs
```

Expected: `article cylinder contract passed`.

- [ ] **Step 4: Commit the overhead styles**

```powershell
git add -- blog-public/styles.css
git commit -m "style: add overhead depth to article arc"
```

### Task 4: Refresh Production Asset Keys and Run Regression Tests

**Files:**
- Modify: `blog-worker.js:641,872-3580`
- Modify: `tools/test-blog-system-i18n.mjs:34-35`
- Modify: `tools/test-blog-admin-fluid-width.mjs:10`
- Modify: `tools/test-blog-auth-fluid-width.mjs:17`
- Modify: `tools/test-blog-user-pages-nav-width.mjs:14`

- [ ] **Step 1: Replace the shared asset keys**

Replace all 12 script references:

```text
script.js?v=20260831-gentle-card-pull
```

with:

```text
script.js?v=20260831-overhead-semicircle
```

Replace the shared stylesheet reference:

```text
styles.css?v=20260831-desktop-title-caret-baseline
```

with:

```text
styles.css?v=20260831-overhead-semicircle
```

Make the same expected-key replacements in the four listed contract test files.

- [ ] **Step 2: Verify occurrence counts before testing**

Run:

```powershell
if ((rg -o '20260831-overhead-semicircle' blog-worker.js | Measure-Object).Count -ne 13) { throw 'Expected 12 script keys and 1 stylesheet key' }
if (rg -n '20260831-gentle-card-pull|20260831-desktop-title-caret-baseline' blog-worker.js tools) { throw 'Stale asset key remains' }
```

Expected: no exception and no stale-key output.

- [ ] **Step 3: Run the focused and related regression contracts**

```powershell
node tools/test-blog-article-cylinder.mjs
node tools/test-blog-system-i18n.mjs
node tools/test-blog-admin-fluid-width.mjs
node tools/test-blog-auth-fluid-width.mjs
node tools/test-blog-user-pages-nav-width.mjs
```

Expected: all five commands exit with code 0 and print their PASS/contract success messages.

- [ ] **Step 4: Run a Wrangler production-bundle dry run**

```powershell
npx --yes wrangler deploy --config wrangler.blog.toml --dry-run --outdir .wrangler-dryrun-overhead-semicircle
```

Expected: Wrangler reports a successful Worker bundle without deployment.

- [ ] **Step 5: Commit cache keys and regression expectations**

```powershell
git add -- blog-worker.js tools/test-blog-system-i18n.mjs tools/test-blog-admin-fluid-width.mjs tools/test-blog-auth-fluid-width.mjs tools/test-blog-user-pages-nav-width.mjs
git commit -m "chore: refresh semicircle assets"
```

### Task 5: Verify Responsive Behavior Locally

**Files:**
- Verify: `blog-public/script.js`
- Verify: `blog-public/styles.css`
- Verify: `blog-worker.js`

- [ ] **Step 1: Start the existing local blog Worker or static verification server**

Prefer the project path that successfully serves the archive and `/api/articles`. If local Wrangler can access the configured local bindings, run:

```powershell
npx --yes wrangler dev --config wrangler.blog.toml --local
```

Expected: Wrangler prints a localhost URL and the archive loads with article data. If the local bindings do not populate article data, use the existing project verification server that serves the captured production archive; record that fallback in the execution notes.

- [ ] **Step 2: Verify the mobile layout in a real browser**

At 390 by 844 CSS pixels, open `/articles`, switch to the arc/cylinder layout, and verify:

```text
- one active image card is 28px left of the lower-left endpoint
- remaining cards travel lower-left -> top -> lower-right across a visible half ellipse
- far/top cards are smaller and lighter than lower/front cards
- all cards are image-only
- the page has no horizontal overflow
- swipe/drag changes the active card and synchronized preview
- tap selection works
- no new console errors
```

Capture a screenshot for comparison with the approved design.

- [ ] **Step 3: Verify the desktop layout in a real browser**

At 1440 by 1000 CSS pixels, verify:

```text
- the same 180-degree upper ellipse is wider and shallower
- the overhead tilt and overlap are visible
- the active card remains close to the left endpoint
- the preview does not overlap the stack
- article categories and recent articles remain visible in the right sidebar
- mouse drag, click, ArrowLeft, ArrowRight, and Enter work
- no new console errors
```

Capture a desktop screenshot.

- [ ] **Step 4: Correct only measured visual defects and rerun the focused test**

If browser measurements show overflow or overlap, adjust only `radiusX`, `radiusY`, `baselineY`, stack footprint, or perspective values. After each adjustment run:

```powershell
node tools/test-blog-article-cylinder.mjs
```

Expected: `article cylinder contract passed` after the final visual values.

- [ ] **Step 5: Commit any browser-calibration changes**

If calibration changed files:

```powershell
git add -- blog-public/script.js blog-public/styles.css tools/test-blog-article-cylinder.mjs
git commit -m "fix: calibrate responsive semicircle depth"
```

If no files changed, record that no calibration commit was needed.

### Task 6: Deploy and Verify Production

**Files:**
- Deploy: `wrangler.blog.toml`
- Verify: `https://blog.858846.xyz/articles`

- [ ] **Step 1: Load the isolated Cloudflare token without printing it**

```powershell
$tokenValue = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN_LUOWENHUI', 'User')
if ([string]::IsNullOrWhiteSpace($tokenValue)) { throw 'CLOUDFLARE_API_TOKEN_LUOWENHUI is missing from User scope' }
$env:CLOUDFLARE_API_TOKEN = $tokenValue
Remove-Variable tokenValue
```

Expected: no output and no exception. Never print the token or include it in logs.

- [ ] **Step 2: Deploy the Worker to production**

```powershell
npx --yes wrangler deploy --config wrangler.blog.toml
```

Expected: Wrangler prints a new deployment version and the configured blog route.

- [ ] **Step 3: Verify production asset keys**

```powershell
$html = (Invoke-WebRequest 'https://blog.858846.xyz/articles?verify=overhead-semicircle' -UseBasicParsing).Content
if ($html -notmatch 'script\.js\?v=20260831-overhead-semicircle') { throw 'Production script key is stale' }
if ($html -notmatch 'styles\.css\?v=20260831-overhead-semicircle') { throw 'Production stylesheet key is stale' }
```

Expected: no exception.

- [ ] **Step 4: Repeat mobile and desktop interaction checks against production**

Use a real browser at 390 by 844 and 1440 by 1000. Repeat the complete Task 5 checklists against `https://blog.858846.xyz/articles?verify=overhead-semicircle`, capture production screenshots, and require a clean console.

- [ ] **Step 5: Record deployment evidence**

Record in the completion report:

```text
- Wrangler deployment version
- focused and regression test results
- dry-run success
- production asset-key check
- mobile screenshot path and interaction result
- desktop screenshot path and interaction/sidebar result
- production console result
```

Do not create an additional source commit unless production verification requires a code correction; if corrected, repeat Tasks 4 through 6 before reporting completion.
