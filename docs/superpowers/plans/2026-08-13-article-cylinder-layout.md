# Article Cylinder Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete cylindrical article browser to `/articles` while retaining the existing single- and double-column layouts.

**Architecture:** The server renders a three-option layout switcher and a stable stage around the article container. The client owns layout persistence, all-article loading, cylindrical geometry, pointer/keyboard interaction, autoplay, and fallback behavior. CSS owns the perspective scene, responsive sizing, themes, focus states, and reduced-motion presentation.

**Tech Stack:** Cloudflare Workers, vanilla JavaScript, CSS, Node.js contract tests, Wrangler.

---

## Task 1: Establish the cylinder contract

- [ ] Add `tools/test-blog-article-cylinder.mjs` covering the three layout options, stored `cylinder` mode, all-article request, drag/keyboard controls, reduced motion, and cylinder CSS.
- [ ] Run `node tools/test-blog-article-cylinder.mjs` and confirm it fails for the missing implementation.

## Task 2: Add server-rendered layout controls and stage

- [ ] Replace the binary navigation toggle with a three-option switcher in the `/articles` heading area.
- [ ] Add the cylinder stage wrapper without changing article data or unrelated pages.
- [ ] Update the production script cache key.
- [ ] Re-run the cylinder contract and confirm remaining failures are client/style related.

## Task 3: Implement client layout state and cylinder controller

- [ ] Extend layout persistence to `single`, `double`, and `cylinder`.
- [ ] Fetch every published article when cylinder mode is selected and preserve pagination for single/double modes.
- [ ] Build cylindrical geometry for every article card with dynamic radius and active-card semantics.
- [ ] Add 18-second autoplay, pointer drag/swipe, snap-to-card, pause/resume, click-to-front, keyboard navigation, resize handling, reduced-motion behavior, and cleanup.
- [ ] Fall back to double-column mode when the all-article request fails.
- [ ] Run the cylinder contract until it passes.

## Task 4: Complete responsive and theme styling

- [ ] Style the three-option switcher to match the existing design system.
- [ ] Style the perspective stage, ring, cards, active state, light/dark themes, mobile sizing, and no-horizontal-overflow behavior.
- [ ] Preserve accessibility focus indicators and disable motion appropriately for `prefers-reduced-motion`.
- [ ] Re-run the cylinder contract.

## Task 5: Regression and production verification

- [ ] Run existing blog contract tests relevant to articles and the shared navigation.
- [ ] Run syntax checks and the Wrangler production dry-run.
- [ ] Inspect single, double, and cylinder layouts at mobile and desktop widths in a browser.
- [ ] Record the production version, deploy only after all critical checks pass, and verify `blog.858846.xyz/articles`.

