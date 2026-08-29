# Mobile Extracted Article Card Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile archive cylinder thumbnails with a compact overlapping stack whose active card is pulled out to the left, while preserving the desktop cylinder and synchronized article preview.

**Architecture:** The existing controller remains the single owner of angle, active index, dragging, keyboard control, and preview synchronization. A viewport-dependent render branch maps the active index to flat stack slots on mobile; desktop retains the existing `rotateY(...) translateZ(...)` geometry. CSS provides the smaller mobile footprint and transform transitions.

**Tech Stack:** Vanilla JavaScript, CSS, Node contract tests, Wrangler, Playwright CLI.

---

### Task 1: Add the mobile stack contract

**Files:**
- Modify: `tools/test-blog-article-cylinder.mjs`

- [ ] **Step 1: Write the failing contract assertions**

Add assertions requiring an `isCompact` geometry branch, a `renderMobileCardStack(activeIndex)` function, cyclic stack slots, a pulled-card class, and the new compact CSS footprint:

```js
assert.match(script, /function renderMobileCardStack\(activeIndex\)/);
assert.match(script, /var stackSlot = modulo\(index - activeIndex, cards\.length\)/);
assert.match(script, /card\.classList\.toggle\('is-pulled', stackSlot === 0\)/);
assert.match(script, /if \(isCompact\) \{[\s\S]*renderMobileCardStack\(getActiveIndex\(\)\)/);
assert.match(script, /rotateY\('[\s\S]*translateZ\('/, 'desktop cylinder transform must remain');
assert.match(styles, /@media\s*\(max-width:\s*720px\)[\s\S]*width:\s*min\(68vw, 16rem\)/s);
assert.match(styles, /\.article-list-item\.is-pulled[\s\S]*box-shadow:/s);
```

- [ ] **Step 2: Run the focused test and verify red**

Run: `node tools/test-blog-article-cylinder.mjs`

Expected: FAIL because `renderMobileCardStack` does not exist.

### Task 2: Implement the extracted mobile card stack

**Files:**
- Modify: `blog-public/script.js:1338-1470`
- Modify: `blog-public/styles.css:4860-4905, 5739-5770`

- [ ] **Step 1: Add viewport state and mobile stack renderer**

Add `var isCompact = false;` beside the geometry state. Add this renderer before `renderCylinder()`:

```js
function renderMobileCardStack(activeIndex) {
  ring.style.transform = 'none';
  cards.forEach(function (card, index) {
    var stackSlot = modulo(index - activeIndex, cards.length);
    var pulled = stackSlot === 0;
    var x = pulled ? -82 : -8 + Math.min(stackSlot - 1, 8) * 7;
    var y = pulled ? 8 : 12 - Math.min(stackSlot - 1, 8) * 3;
    var scale = pulled ? 1 : Math.max(0.62, 0.74 - stackSlot * 0.012);
    var opacity = pulled ? 1 : Math.max(0.42, 0.88 - stackSlot * 0.045);
    card.classList.toggle('is-pulled', pulled);
    card.style.zIndex = String(pulled ? 30 : cards.length - stackSlot + 1);
    card.style.transform = 'translate3d(calc(-50% + ' + x + 'px), calc(-50% + ' + y + 'px), 0) scale(' + scale.toFixed(3) + ')';
    card.style.setProperty('--cylinder-card-opacity', opacity.toFixed(3));
  });
}
```

- [ ] **Step 2: Branch rendering without changing desktop geometry**

At the start of `renderCylinder()` use:

```js
if (isCompact) {
  renderMobileCardStack(getActiveIndex());
  syncActiveCard();
  return;
}
```

In `setGeometry()` set `isCompact = window.innerWidth <= 720`. For compact mode set `--cylinder-card-width` to `58px`, set radius to zero, call `renderCylinder()`, and return. Keep the existing desktop width/radius/card `rotateY(...) translateZ(...)` code unchanged.

- [ ] **Step 3: Prevent active z-index synchronization from overriding mobile layers**

In `syncActiveCard()`, only assign the existing active/inactive z-index when `!isCompact`; `renderMobileCardStack()` owns all mobile stack layers.

- [ ] **Step 4: Add compact CSS and extracted-card emphasis**

Within the existing `max-width: 720px` block set:

```css
.article-stream.is-cylinder {
  right: -0.75rem;
  bottom: 0.85rem;
  width: min(68vw, 16rem);
  height: 9rem;
  transform-style: flat;
}

.article-stream.is-cylinder .article-list-item,
.article-stream.is-cylinder .article-list-item:nth-child(even) {
  width: var(--cylinder-card-width, 58px);
  height: clamp(5rem, 10.5vh, 6.2rem);
  transition: transform 260ms cubic-bezier(0.2, 0.72, 0.2, 1), opacity 180ms ease, box-shadow 180ms ease;
}

.article-stream.is-cylinder .article-list-item.is-pulled {
  outline-color: color-mix(in srgb, var(--anzhiyu-blue) 45%, var(--anzhiyu-line));
  box-shadow: 0 18px 36px rgba(31, 45, 61, 0.24);
  filter: brightness(1.04);
}
```

- [ ] **Step 5: Run the focused test and verify green**

Run: `node tools/test-blog-article-cylinder.mjs`

Expected: `article cylinder contract passed`.

### Task 3: Cache bust, regressions, and production verification

**Files:**
- Modify: `blog-worker.js`
- Modify: `tools/test-blog-system-i18n.mjs`
- Modify: `tools/test-blog-admin-fluid-width.mjs`
- Modify: `tools/test-blog-auth-fluid-width.mjs`
- Modify: `tools/test-blog-user-pages-nav-width.mjs`

- [ ] **Step 1: Update shared asset cache keys**

Replace the current script and stylesheet cache key with `20260829-mobile-extracted-stack` in `blog-worker.js` and matching contract tests.

- [ ] **Step 2: Run regression tests**

Run:

```powershell
node tools/test-blog-article-cylinder.mjs
node tools/test-blog-anzhiyu-theme.mjs
node tools/test-blog-system-i18n.mjs
node tools/test-blog-admin-fluid-width.mjs
node tools/test-blog-auth-fluid-width.mjs
node tools/test-blog-user-pages-nav-width.mjs
```

Expected: all six commands exit `0`.

- [ ] **Step 3: Run a Cloudflare dry run**

Run:

```powershell
npx wrangler deploy --config wrangler.blog.toml --dry-run --outdir .wrangler-dryrun-mobile-extracted-stack
```

Expected: Worker and assets bundle successfully.

- [ ] **Step 4: Deploy using the isolated Luowenhui token**

Load `CLOUDFLARE_API_TOKEN_LUOWENHUI` from the Windows User environment into process scope without printing it, then run `npx wrangler deploy --config wrangler.blog.toml`.

Expected: Wrangler reports a new Current Version ID for `blog-858846`.

- [ ] **Step 5: Verify production in real browsers**

At 390×844 verify the active card is left of the overlapping group, at least four stacked edges are visible, card width is below 20% of the ring, dragging changes the preview and pulled card, the sidebar is hidden, and the document has no horizontal overflow. At 1440×1000 verify desktop cards still use 3D matrix transforms and the sidebar remains a grid. Verify one English translated preview/action and capture screenshots under `output/playwright/`.
