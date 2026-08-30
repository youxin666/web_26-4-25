# Desktop Arc Article Card Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the desktop 3D article cylinder with a responsive sine-arc card stack whose active card is extracted on the left, while preserving the mobile arc and desktop sidebar.

**Architecture:** Generalize the existing mobile renderer into `renderArcCardStack(activeIndex, compact)` with separate mobile and desktop geometry constants. Both viewports use the same active-index and interaction controller; `setGeometry()` only selects card width and the renderer owns all transforms and z-indexes. CSS changes the desktop ring from a 3D scene to a flat lower-right arc viewport.

**Tech Stack:** Vanilla JavaScript, CSS, Node contract tests, Wrangler, Playwright CLI.

---

### Task 1: Lock the shared arc contract

**Files:**
- Modify: `tools/test-blog-article-cylinder.mjs`

- [ ] Require `renderArcCardStack(activeIndex, compact)`, separate desktop/mobile geometry constants, unconditional arc rendering, desktop `84px` card width, flat ring CSS, and absence of desktop `rotateY(...) translateZ(...)` setup.
- [ ] Run `node tools/test-blog-article-cylinder.mjs` and confirm failure on the old mobile-only renderer.

### Task 2: Generalize the arc renderer and flatten desktop layout

**Files:**
- Modify: `blog-public/script.js:1408-1498`
- Modify: `blog-public/styles.css:4766-4895`

- [ ] Rename the renderer to `renderArcCardStack(activeIndex, compact)` and introduce these responsive constants:

```js
var pulledX = compact ? -76 : -190;
var startX = compact ? -4 : -70;
var horizontalSpan = compact ? 94 : 300;
var pulledY = compact ? 8 : 45;
var startY = compact ? 30 : 70;
var verticalSpan = compact ? 58 : 165;
var startScale = compact ? 0.78 : 0.92;
var scaleDrop = compact ? 0.16 : 0.24;
```

- [ ] Compute `x`, `y`, scale, opacity, and rotation from those values while keeping the existing normalized sine curve.
- [ ] Make `renderCylinder()` always call `renderArcCardStack(getActiveIndex(), isCompact)` and then synchronize the active card; remove the 3D ring transform branch.
- [ ] Remove z-index assignment from `syncActiveCard()` because the arc renderer owns all layers.
- [ ] Simplify `setGeometry()` to set `48px` for mobile or `84px` for desktop, set radius to zero, and call `renderCylinder()`; remove radius and tangent card transforms.
- [ ] Change desktop `.article-stream.is-cylinder` to a flat lower-right area using `right: -1.5rem`, `width: clamp(30rem, 48%, 42rem)`, `height: 18rem`, and flat transform style.
- [ ] Give desktop cards a transform transition matching mobile and add `.is-pulled` emphasis outside the mobile media query; keep the mobile overrides unchanged.
- [ ] Run the focused contract and confirm pass.

### Task 3: Cache bust, regressions, deploy, and browser validation

**Files:**
- Modify: `blog-worker.js`
- Modify: cache-key assertions in `tools/test-blog-*.mjs`

- [ ] Change the shared asset key to `20260829-responsive-arc-stack`.
- [ ] Run the six related Node tests and require all to exit `0`.
- [ ] Run Wrangler dry-run to `.wrangler-dryrun-responsive-arc-stack`.
- [ ] Deploy using the isolated Luowenhui User token without printing it.
- [ ] At 1440×1000 confirm one pulled card, nine arc cards, non-linear rising center points, no `matrix3d`, visible `grid` sidebar, no overlap with sidebar, synchronized drag, and no horizontal overflow.
- [ ] At 390×844 confirm one pulled card, the existing sine arc, preview media height at most 240px, hidden sidebar, and no horizontal overflow.
