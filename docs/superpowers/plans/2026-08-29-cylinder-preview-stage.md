# Cylinder Preview Stage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the full-size article-card cylinder with a compact lower-right cylinder whose active card controls a large article preview above it.

**Architecture:** Keep the existing article API, localization data, automatic visual generator, and cylinder controller. Add dedicated cylinder-card and preview renderers in `blog-public/script.js`; the controller owns active-index synchronization and replaces the preview markup only when the snapped active article changes. Scope all new layout rules to `body[data-article-layout="cylinder"]` so single and double layouts remain unchanged.

**Tech Stack:** Cloudflare Worker HTML shell, vanilla JavaScript, CSS 3D transforms, Node source-contract tests, Wrangler, Playwright CLI.

---

## File Map

- `blog-public/script.js`: render compact cylinder cards, render the active preview, and synchronize preview state with the cylinder controller.
- `blog-public/styles.css`: create the A-layout preview stage, compact lower-right cylinder, responsive mobile composition, transition, and fallbacks.
- `blog-worker.js`: bump the main CSS and JavaScript cache keys after behavior and styling changes.
- `tools/test-blog-article-cylinder.mjs`: lock the new markup, preview synchronization, compact-card rules, responsive behavior, and unchanged interaction contract.

### Task 1: Lock the new cylinder rendering contract

**Files:**
- Modify: `tools/test-blog-article-cylinder.mjs`

- [ ] **Step 1: Write failing source-contract assertions**

Add assertions requiring dedicated compact cards, a preview renderer, active-preview synchronization, no excerpt inside cylinder-card markup, and A-layout CSS:

```js
assert.match(script, /function renderCylinderArticleCard\(article\)/, 'cylinder needs a compact card renderer');
assert.match(script, /function renderCylinderPreview\(article\)/, 'cylinder needs an active article preview renderer');
assert.match(script, /data-cylinder-preview/, 'cylinder needs a stable preview hook');
assert.match(script, /syncCylinderPreview\(next\)/, 'active-card changes must synchronize the preview');
assert.doesNotMatch(
  script.match(/function renderCylinderArticleCard\(article\)[\s\S]*?\n  }/)?.[0] || '',
  /safeExcerpt|article\.excerpt|<p class="text-sm/,
  'compact cylinder cards must not render article excerpts'
);
assert.match(styles, /\.article-cylinder-preview\s*\{/, 'styles need a large active preview');
assert.match(styles, /\.article-stream\.is-cylinder\s*\{[\s\S]*right:\s*clamp\(/, 'the cylinder must sit in the lower-right of the stage');
assert.match(styles, /\.article-stream\.is-cylinder \.article-list-item[\s\S]*height:\s*clamp\(8rem,/, 'cylinder cards must be substantially smaller');
assert.match(styles, /@media\s*\(max-width:\s*720px\)[\s\S]*\.article-cylinder-preview/s, 'mobile needs a dedicated preview composition');
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node tools/test-blog-article-cylinder.mjs
```

Expected: FAIL at `cylinder needs a compact card renderer` because the dedicated renderer does not exist yet.

- [ ] **Step 3: Commit the failing test**

```powershell
git add -- tools/test-blog-article-cylinder.mjs
git commit -m "test: define cylinder preview stage contract"
```

### Task 2: Add dedicated preview and compact-card rendering

**Files:**
- Modify: `blog-public/script.js` near `renderArticleCard()` and `renderArticles()`
- Test: `tools/test-blog-article-cylinder.mjs`

- [ ] **Step 1: Add the compact cylinder-card renderer**

Add beside `renderArticleCard()`:

```js
function renderCylinderArticleCard(article) {
  var displayArticle = getLocalizedArticle(article);
  var safeTitle = escapeHtml(displayArticle.title);
  var safeImg = escapeAttr(displayArticle.img || '');
  var safePermalink = escapeAttr(article.permalink);
  var visual = displayArticle.img
    ? '<img src="' + safeImg + '" alt="' + safeTitle + '" loading="lazy" data-cylinder-image>'
    : renderArticleVisual(article.permalink, displayArticle.label, displayArticle.title, true);

  return '<article class="article-card article-list-item article-cylinder-card">' +
    '<a href="/article/' + safePermalink + '" class="article-cylinder-card-link" aria-label="' + safeTitle + '">' +
      '<div class="card-image">' + visual + '</div>' +
      '<h3>' + safeTitle + '</h3>' +
    '</a>' +
  '</article>';
}
```

- [ ] **Step 2: Add the active preview renderer with image fallback**

Add beside the compact-card renderer:

```js
function renderCylinderPreview(article) {
  var displayArticle = getLocalizedArticle(article);
  var safeTitle = escapeHtml(displayArticle.title);
  var safeLabel = escapeHtml(displayArticle.label || 'General');
  var safePermalink = escapeAttr(article.permalink);
  var safeImg = escapeAttr(displayArticle.img || '');
  var visual = displayArticle.img
    ? '<img src="' + safeImg + '" alt="' + safeTitle + '" data-cylinder-preview-image>'
    : renderArticleVisual(article.permalink, displayArticle.label, displayArticle.title, false);

  return '<article class="article-cylinder-preview" data-cylinder-preview data-preview-permalink="' + safePermalink + '">' +
    '<span class="article-cylinder-preview-label">' + safeLabel + '</span>' +
    '<a href="/article/' + safePermalink + '" class="article-cylinder-preview-title"><h2>' + safeTitle + '</h2></a>' +
    '<a href="/article/' + safePermalink + '" class="article-cylinder-preview-media">' + visual + '</a>' +
    '<a href="/article/' + safePermalink + '" class="article-cylinder-preview-action">' +
      '<span>' + (currentLanguage === 'zh' ? '查看这篇文章' : 'View this article') + '</span><span aria-hidden="true">+</span>' +
    '</a>' +
  '</article>';
}
```

After assigning preview markup in `syncCylinderPreview()`, install this concrete image fallback:

```js
var previewImage = previewHost.querySelector('[data-cylinder-preview-image]');
if (previewImage) {
  previewImage.addEventListener('error', function () {
    var media = previewImage.closest('.article-cylinder-preview-media');
    var displayArticle = getLocalizedArticle(articles[next]);
    if (media) media.innerHTML = renderArticleVisual(
      articles[next].permalink,
      displayArticle.label,
      displayArticle.title,
      false
    );
  }, { once: true });
}
```

- [ ] **Step 3: Render compact markup only in cylinder mode**

Change `renderArticles()` to select the renderer without affecting single/double layouts:

```js
var cylinderMode = document.body.getAttribute('data-article-layout') === 'cylinder';
container.innerHTML = articles.map(cylinderMode ? renderCylinderArticleCard : renderArticleCard).join('');
```

- [ ] **Step 4: Run the focused test**

```powershell
node tools/test-blog-article-cylinder.mjs
```

Expected: remaining CSS and controller assertions fail, while renderer assertions pass.

- [ ] **Step 5: Commit rendering changes**

```powershell
git add -- blog-public/script.js tools/test-blog-article-cylinder.mjs
git commit -m "feat: render compact cylinder article cards"
```

### Task 3: Synchronize the active preview with cylinder movement

**Files:**
- Modify: `blog-public/script.js` inside `initArticleCylinder()`
- Test: `tools/test-blog-article-cylinder.mjs`

- [ ] **Step 1: Create the preview before measuring cards**

Inside `initArticleCylinder()`, derive articles from `window.__lastArticles`, insert the first preview before the ring, and retain a stable node reference:

```js
var articles = Array.isArray(window.__lastArticles) ? window.__lastArticles : [];
var previewHost = stage.querySelector('[data-cylinder-preview-host]');
if (!previewHost) {
  previewHost = document.createElement('div');
  previewHost.className = 'article-cylinder-preview-host';
  previewHost.setAttribute('data-cylinder-preview-host', '');
  stage.insertBefore(previewHost, ring);
}
```

- [ ] **Step 2: Add active-preview synchronization**

Add to the controller:

```js
var previewIndex = -1;

function syncCylinderPreview(next) {
  if (next === previewIndex || !articles[next]) return;
  previewIndex = next;
  previewHost.classList.add('is-changing');
  previewHost.innerHTML = renderCylinderPreview(articles[next]);
  window.requestAnimationFrame(function () {
    previewHost.classList.remove('is-changing');
  });
}
```

Call `syncCylinderPreview(next)` from `syncActiveCard()` after assigning `activeCard`. This makes drag snapping, keyboard navigation, card clicks, and reduced-motion jumps all share the same update path.

- [ ] **Step 3: Adjust click handling for compact-card links**

Use `.article-cylinder-card-link` as the active-card destination. Keep the existing dragged-state suppression and non-active-card rotation behavior:

```js
var link = card.querySelector('.article-cylinder-card-link');
```

Use the same selector in the Enter-key handler.

- [ ] **Step 4: Clean preview state during teardown**

In `cleanup()`, remove the preview host and reset card attributes so switching to single/double layout restores the existing archive exactly:

```js
if (previewHost && previewHost.parentNode) previewHost.parentNode.removeChild(previewHost);
```

- [ ] **Step 5: Run the focused test and verify controller assertions pass**

```powershell
node tools/test-blog-article-cylinder.mjs
```

Expected: only CSS assertions remain failing.

- [ ] **Step 6: Commit synchronization behavior**

```powershell
git add -- blog-public/script.js tools/test-blog-article-cylinder.mjs
git commit -m "feat: sync cylinder selection with article preview"
```

### Task 4: Build the A-layout and responsive compact cylinder

**Files:**
- Modify: `blog-public/styles.css` in the cylinder section and mobile media queries
- Test: `tools/test-blog-article-cylinder.mjs`

- [ ] **Step 1: Recompose the stage into preview plus lower-right cylinder**

Replace the full-stage ring positioning with these scoped rules:

```css
.article-cylinder-preview-host {
  position: absolute;
  z-index: 2;
  inset: clamp(1.25rem, 3vw, 2.5rem) clamp(1.25rem, 3vw, 2.5rem) auto;
  width: min(72%, 48rem);
  transition: opacity 160ms ease;
}

.article-cylinder-preview-host.is-changing { opacity: 0.35; }

.article-cylinder-preview {
  display: grid;
  grid-template-rows: auto auto minmax(16rem, 1fr) auto;
  gap: 0.65rem;
}

.article-cylinder-preview-media {
  display: block;
  height: clamp(19rem, 43vh, 31rem);
  overflow: hidden;
  border-radius: 3px;
}

.article-stream.is-cylinder {
  position: absolute;
  z-index: 3;
  inset: auto clamp(-2rem, -1.5vw, -0.5rem) clamp(0.75rem, 2vw, 1.5rem) auto;
  width: clamp(24rem, 45%, 38rem);
  height: clamp(12rem, 31%, 18rem);
  transform-style: preserve-3d;
}
```

- [ ] **Step 2: Reduce cylinder-card dimensions and hide full-card content by construction**

Add compact card rules:

```css
.article-stream.is-cylinder .article-list-item,
.article-stream.is-cylinder .article-list-item:nth-child(even) {
  width: var(--cylinder-card-width, 138px);
  height: clamp(8rem, 18vh, 12rem);
}

.article-stream.is-cylinder .article-cylinder-card-link {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  height: 100%;
}

.article-stream.is-cylinder .card-image,
.article-stream.is-cylinder .card-image > img,
.article-stream.is-cylinder .article-visual {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.article-stream.is-cylinder .article-cylinder-card h3 {
  margin: 0;
  padding: 0.55rem 0.6rem;
  font-size: clamp(0.66rem, 0.8vw, 0.8rem);
  line-height: 1.3;
  -webkit-line-clamp: 2;
}
```

- [ ] **Step 3: Tune JavaScript geometry for the smaller desktop and mobile rings**

In `setGeometry()`, compute card width from the ring width rather than the full stage width. Keep `cardGap` at 12px on desktop and use a smaller mobile width range. Preserve the tangent transform:

```js
var width = Math.max(220, ring.clientWidth || stage.clientWidth || window.innerWidth);
var compact = window.innerWidth <= 720;
var cardWidth = Math.round(compact
  ? Math.min(104, Math.max(76, width * 0.23))
  : Math.min(156, Math.max(118, width * 0.25)));
```

- [ ] **Step 4: Add the mobile A-layout**

Within `@media (max-width: 720px)`, use a taller stage, full-width preview, and a smaller partially edge-aligned cylinder without page overflow:

```css
body[data-article-layout="cylinder"] .article-cylinder-stage {
  height: min(44rem, 82vh);
  min-height: 38rem;
}

.article-cylinder-preview-host {
  inset: 1.1rem 1rem auto;
  width: auto;
}

.article-cylinder-preview-media { height: clamp(15rem, 39vh, 21rem); }

.article-stream.is-cylinder {
  right: -2.4rem;
  bottom: 0.75rem;
  width: min(72vw, 18rem);
  height: 11rem;
}
```

- [ ] **Step 5: Respect reduced motion for preview transitions**

Extend the existing reduced-motion block:

```css
@media (prefers-reduced-motion: reduce) {
  .article-cylinder-preview-host { transition: none; }
}
```

- [ ] **Step 6: Run the focused and theme tests**

```powershell
node tools/test-blog-article-cylinder.mjs
node tools/test-blog-anzhiyu-theme.mjs
node tools/test-blog-system-i18n.mjs
```

Expected: all three print their passing contract messages.

- [ ] **Step 7: Commit the responsive stage**

```powershell
git add -- blog-public/styles.css blog-public/script.js tools/test-blog-article-cylinder.mjs
git commit -m "feat: compose responsive cylinder preview stage"
```

### Task 5: Cache bust, build, deploy, and verify production

**Files:**
- Modify: `blog-worker.js`
- Modify: cache-key assertions in `tools/test-blog-system-i18n.mjs`, `tools/test-blog-admin-fluid-width.mjs`, `tools/test-blog-auth-fluid-width.mjs`, and `tools/test-blog-user-pages-nav-width.mjs` only if their exact shared-asset key contracts require it

- [ ] **Step 1: Bump shared asset cache keys**

Replace all current main asset references with:

```html
<link rel="stylesheet" href="/styles.css?v=20260829-cylinder-preview-stage">
<script src="/script.js?v=20260829-cylinder-preview-stage"></script>
```

Update only tests that assert the previous exact cache keys.

- [ ] **Step 2: Run all relevant source-contract tests**

```powershell
node tools/test-blog-article-cylinder.mjs
node tools/test-blog-anzhiyu-theme.mjs
node tools/test-blog-system-i18n.mjs
node tools/test-blog-admin-fluid-width.mjs
node tools/test-blog-auth-fluid-width.mjs
node tools/test-blog-user-pages-nav-width.mjs
```

Expected: every command exits 0 with its passing message.

- [ ] **Step 3: Run Wrangler dry-run build**

```powershell
npx --yes wrangler deploy --config wrangler.blog.toml --dry-run --outdir .wrangler-dryrun-cylinder-preview-stage
```

Expected: asset scan and Worker bundle complete, followed by `--dry-run: exiting now.`

- [ ] **Step 4: Deploy with the project-specific Luowenhui token**

```powershell
$env:CLOUDFLARE_API_TOKEN=[Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN_LUOWENHUI','User')
$env:CLOUDFLARE_ACCOUNT_ID=[Environment]::GetEnvironmentVariable('CLOUDFLARE_ACCOUNT_ID_LUOWENHUI','User')
npx --yes wrangler deploy --config wrangler.blog.toml
```

Expected: deployment lists `blog.858846.xyz/*`, the custom domain, schedule, and a new Current Version ID. Never print either credential value.

- [ ] **Step 5: Verify desktop behavior in a real browser**

Using Playwright CLI at `1440x1000`:

1. Open `https://blog.858846.xyz/articles`.
2. Snapshot before interacting.
3. Set `blog_article_layout` to `cylinder` and reload.
4. Confirm the preview contains category, title, large image/automatic visual, and article action.
5. Confirm `.blog-sidebar` is `display: grid` and does not overlap the stage.
6. Drag the cylinder one card and confirm `data-preview-permalink` changes to the snapped card.
7. Confirm cylinder cards contain no excerpt paragraph.

- [ ] **Step 6: Verify mobile behavior and both languages**

Using the same browser session at `390x844`:

1. Snapshot after resizing.
2. Confirm sidebar display is `none` and `document.documentElement.scrollWidth <= innerWidth`.
3. Drag one card and confirm the preview changes.
4. Switch to English using the fresh snapshot reference.
5. Confirm the action says `View this article` and the current title is localized.
6. Inspect console errors; record the unauthenticated customer-service `401` separately from feature errors.

- [ ] **Step 7: Commit the production-ready change**

```powershell
git add -- blog-worker.js blog-public/script.js blog-public/styles.css tools/test-blog-article-cylinder.mjs tools/test-blog-system-i18n.mjs tools/test-blog-admin-fluid-width.mjs tools/test-blog-auth-fluid-width.mjs tools/test-blog-user-pages-nav-width.mjs
git commit -m "feat: add cylinder-driven article preview stage"
```
