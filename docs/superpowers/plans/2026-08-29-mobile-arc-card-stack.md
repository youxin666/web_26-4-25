# Mobile Arc Article Card Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Curve the mobile article thumbnail stack from lower-left to upper-right and reduce the active preview image height without changing the desktop cylinder.

**Architecture:** Keep the existing mobile stack renderer and replace its linear slot offsets with a normalized sine-eased arc. The active card remains a separate fixed extraction point; CSS alone reduces the mobile preview image. Desktop continues through the existing 3D render branch.

**Tech Stack:** Vanilla JavaScript, CSS, Node contract tests, Wrangler, Playwright CLI.

---

### Task 1: Define the curved-stack and smaller-preview contract

**Files:**
- Modify: `tools/test-blog-article-cylinder.mjs`

- [ ] Add assertions requiring normalized `arcT`, `Math.sin(arcT * Math.PI * 0.5)`, horizontal arc spread, per-card rotation, and mobile preview height `clamp(11rem, 28vh, 15rem)`.

```js
assert.match(script, /var arcT = \(stackSlot - 1\) \/ Math\.max\(1, cards\.length - 2\)/);
assert.match(script, /Math\.sin\(arcT \* Math\.PI \* 0\.5\)/);
assert.match(script, /rotateZ\(' \+ rotation\.toFixed\(2\) \+ 'deg\)/);
assert.doesNotMatch(script, /var y = pulled \? 8 : 12 - Math\.min\(stackSlot - 1, 8\) \* 3/);
assert.match(styles, /\.article-cylinder-preview-media\s*\{\s*height:\s*clamp\(11rem, 28vh, 15rem\)/);
```

- [ ] Run `node tools/test-blog-article-cylinder.mjs` and confirm failure on the absent arc formula.

### Task 2: Implement the mobile arc and preview reduction

**Files:**
- Modify: `blog-public/script.js:1423-1438`
- Modify: `blog-public/styles.css:5746`

- [ ] Replace the non-current mobile card coordinates with a sine-eased arc while preserving the extracted card:

```js
var arcT = pulled ? 0 : (stackSlot - 1) / Math.max(1, cards.length - 2);
var x = pulled ? -76 : -4 + arcT * 94;
var y = pulled ? 8 : 30 - Math.sin(arcT * Math.PI * 0.5) * 58;
var scale = pulled ? 1 : 0.78 - arcT * 0.16;
var opacity = pulled ? 1 : 0.9 - arcT * 0.32;
var rotation = pulled ? 0 : -8 + arcT * 10;
```

- [ ] Append `rotateZ(...)` to the existing mobile `translate3d(...) scale(...)` transform.

- [ ] Change the mobile preview image rule to:

```css
.article-cylinder-preview-media { height: clamp(11rem, 28vh, 15rem); }
```

- [ ] Run `node tools/test-blog-article-cylinder.mjs` and confirm `article cylinder contract passed`.

### Task 3: Cache bust, verify, deploy, and inspect production

**Files:**
- Modify: `blog-worker.js`
- Modify: `tools/test-blog-system-i18n.mjs`
- Modify: `tools/test-blog-admin-fluid-width.mjs`
- Modify: `tools/test-blog-auth-fluid-width.mjs`
- Modify: `tools/test-blog-user-pages-nav-width.mjs`

- [ ] Replace the shared script and stylesheet cache key with `20260829-mobile-arc-stack` in the Worker and matching tests.

- [ ] Run the six related Node contract tests and require exit code `0` for every command.

- [ ] Run `npx wrangler deploy --config wrangler.blog.toml --dry-run --outdir .wrangler-dryrun-mobile-arc-stack` and require a successful bundle.

- [ ] Deploy with the isolated `CLOUDFLARE_API_TOKEN_LUOWENHUI` User environment variable without printing it.

- [ ] At 390×844 verify in production that card centers form a non-linear rising arc, the final vertical increment is smaller than the first, preview media height is at most 240 CSS pixels, one card is pulled, dragging synchronizes the preview, and there is no horizontal overflow.

- [ ] At 1440×1000 verify the ring/card transforms remain `matrix3d`, no `is-pulled` class remains, and the sidebar is `grid`.
