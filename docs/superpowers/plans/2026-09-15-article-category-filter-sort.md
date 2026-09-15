# Article Archive Category Filter And Sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add URL-persistent category filtering and publish-date sorting to the article archive, using the existing desktop sidebar and a compact mobile toolbar.

**Architecture:** Keep filtering client-side because `/articles` already embeds the complete lightweight article list. Introduce one archive state object sourced from URL parameters, derive a filtered and sorted list before pagination, and render both desktop and mobile controls from the same state. Existing layout mode controls continue to determine page size and cylinder pagination behavior.

**Tech Stack:** Cloudflare Worker HTML templates, vanilla JavaScript, CSS, Node.js contract tests, Playwright CLI, Wrangler.

---

### Task 1: Lock The Archive Markup And Localization Contract

**Files:**
- Create: `tools/test-blog-article-filter-sort.mjs`
- Modify: `blog-worker.js:784-831`
- Modify: `blog-worker.js:894-922`
- Modify: `blog-public/script.js:190-220`
- Modify: `blog-public/script.js:485-515`

- [ ] **Step 1: Write the failing markup contract test**

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [worker, script] = await Promise.all([
  readFile(new URL('../blog-worker.js', import.meta.url), 'utf8'),
  readFile(new URL('../blog-public/script.js', import.meta.url), 'utf8')
]);

assert.match(worker, /data-archive-category=""/);
assert.match(worker, /data-archive-category="[^"<]+"/);
assert.match(worker, /data-archive-sort/);
assert.match(worker, /data-archive-mobile-filters/);
assert.match(script, /'archive\.allCategories': '全部'/);
assert.match(script, /'archive\.newestFirst': '最新发布'/);
assert.match(script, /'archive\.oldestFirst': '最早发布'/);
assert.match(script, /'archive\.allCategories': 'All'/);
assert.match(script, /'archive\.newestFirst': 'Newest first'/);
assert.match(script, /'archive\.oldestFirst': 'Oldest first'/);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node tools/test-blog-article-filter-sort.mjs`

Expected: FAIL because archive category buttons, mobile controls, and translations do not exist.

- [ ] **Step 3: Add shared archive controls to server-rendered HTML**

Change `renderThemeSidebar()` so its category card renders an “all” button plus one button per category:

```js
const categoryButtons = [
  `<li><button type="button" data-archive-category=""><span data-i18n="archive.allCategories">全部</span><strong>${list.length}</strong></button></li>`,
  ...Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => `<li><button type="button" data-archive-category="${escapeAttr(label)}"><span>${escapeHtml(label)}</span><strong>${count}</strong></button></li>`)
].join('');
```

Add the desktop sort select beneath the list and add this compact toolbar before `.article-cylinder-stage`:

```html
<div class="archive-mobile-filters" data-archive-mobile-filters>
  <label><span data-i18n="archive.categoryLabel">分类</span><select data-archive-category-select></select></label>
  <label><span data-i18n="archive.sortLabel">排序</span><select data-archive-sort><option value="latest" data-i18n="archive.newestFirst">最新发布</option><option value="oldest" data-i18n="archive.oldestFirst">最早发布</option></select></label>
</div>
```

- [ ] **Step 4: Add Chinese and English translation keys**

Add `archive.allCategories`, `archive.categoryLabel`, `archive.sortLabel`, `archive.newestFirst`, `archive.oldestFirst`, and `archive.filteredEmpty` to both language dictionaries.

- [ ] **Step 5: Run the test and verify GREEN**

Run: `node tools/test-blog-article-filter-sort.mjs`

Expected: `Article archive filter and sort contracts passed.`

- [ ] **Step 6: Inspect the scoped diff**

Run: `git diff -- blog-worker.js blog-public/script.js tools/test-blog-article-filter-sort.mjs`

Expected: only the archive filter controls and their focused test are new; preserve all pre-existing user changes in these shared files and do not commit them without an explicit request.

### Task 2: Implement URL State, Filtering, Sorting, And Pagination

**Files:**
- Modify: `tools/test-blog-article-filter-sort.mjs`
- Modify: `blog-public/script.js:800-910`
- Modify: `blog-public/script.js:1820-1905`
- Modify: `blog-public/script.js:4000-4050`

- [ ] **Step 1: Extend the test with state and data-flow assertions**

```js
assert.match(script, /function readArchiveStateFromUrl\(\)/);
assert.match(script, /function applyArchiveFilters\(articles\)/);
assert.match(script, /url\.searchParams\.set\('category'/);
assert.match(script, /url\.searchParams\.set\('sort'/);
assert.match(script, /window\.addEventListener\('popstate'/);
assert.match(script, /applyArchiveFilters\(archiveArticles\)/);
assert.match(script, /currentPage = 1/);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node tools/test-blog-article-filter-sort.mjs`

Expected: FAIL because archive state helpers do not exist.

- [ ] **Step 3: Add one archive state source**

Introduce `archiveArticles`, `archiveCategory`, and `archiveSort`, then implement:

```js
function readArchiveStateFromUrl() {
  var params = new URLSearchParams(window.location.search);
  return {
    category: params.get('category') || '',
    sort: params.get('sort') === 'oldest' ? 'oldest' : 'latest'
  };
}

function applyArchiveFilters(articles) {
  var filtered = archiveCategory
    ? articles.filter(function (article) { return (article.label || 'General') === archiveCategory; })
    : articles.slice();
  return filtered.sort(function (a, b) {
    var left = Date.parse(a.createDate) || 0;
    var right = Date.parse(b.createDate) || 0;
    return archiveSort === 'oldest' ? left - right : right - left;
  });
}
```

Validate `archiveCategory` against categories found in `archiveArticles`; invalid categories become the empty string.

- [ ] **Step 4: Update history and synchronize every control**

Implement `writeArchiveStateToUrl()`, `syncArchiveControls()`, and `initArchiveFilters()`. Omit default parameters, use `history.pushState`, reset `currentPage = 1`, and listen for `popstate` to re-read state and render again.

- [ ] **Step 5: Filter before pagination in all layouts**

Use the embedded full article list as `archiveArticles`. For single and double layouts, slice `applyArchiveFilters(archiveArticles)` using `pageSize`; construct pagination totals from the filtered length. For cylinder mode, pass the complete filtered list to `renderArticles()` and clear pagination.

- [ ] **Step 6: Run the focused and pagination tests**

Run:

```powershell
node tools/test-blog-article-filter-sort.mjs
node tools/test-blog-article-pagination.mjs
node tools/test-blog-article-cylinder.mjs
```

Expected: all three tests pass.

- [ ] **Step 7: Inspect the scoped behavior diff**

Run: `git diff -- blog-public/script.js tools/test-blog-article-filter-sort.mjs`

Expected: the new state/data-flow code is limited to the article archive path and does not replace unrelated user edits.

### Task 3: Style Desktop And Mobile Controls

**Files:**
- Modify: `tools/test-blog-article-filter-sort.mjs`
- Modify: `blog-public/styles.css:4738-4765`
- Modify: `blog-public/styles.css:5940-6060`

- [ ] **Step 1: Add failing responsive-style assertions**

```js
const styles = await readFile(new URL('../blog-public/styles.css', import.meta.url), 'utf8');
assert.match(styles, /\.theme-category-list button\s*\{/);
assert.match(styles, /\.theme-category-list button\.is-active/);
assert.match(styles, /\.archive-mobile-filters\s*\{/);
assert.match(styles, /@media \(max-width: 767px\)[\s\S]*\.archive-mobile-filters\s*\{[^}]*display:\s*grid/);
assert.match(styles, /\.archive-mobile-filters select[\s\S]*font-size:\s*16px/);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node tools/test-blog-article-filter-sort.mjs`

Expected: FAIL because active and responsive control styles do not exist.

- [ ] **Step 3: Add styles using existing theme tokens**

Make category buttons full-width, borderless, and keyboard-focusable. Use `--anzhiyu-blue`, `--anzhiyu-line`, `--anzhiyu-card`, and existing dark-mode variables for active, hover, and focus-visible states. Hide `.archive-mobile-filters` by default, then show it as a two-column grid below 768px. Set both selects to `font-size: 16px`, `min-height: 44px`, and `min-width: 0`.

- [ ] **Step 4: Run focused and theme regressions**

Run:

```powershell
node tools/test-blog-article-filter-sort.mjs
node tools/test-blog-anzhiyu-theme.mjs
node tools/test-blog-ios-form-input-scale.mjs
```

Expected: all tests pass.

- [ ] **Step 5: Inspect the scoped style diff**

Run: `git diff -- blog-public/styles.css tools/test-blog-article-filter-sort.mjs`

Expected: only archive control styling and its focused assertions are added; unrelated stylesheet edits remain intact.

### Task 4: Cache Bust, Deploy, And Verify Production

**Files:**
- Modify: `tools/test-blog-article-filter-sort.mjs`
- Modify: `blog-worker.js:656`
- Modify: `blog-worker.js:920`

- [ ] **Step 1: Add failing cache-version assertions**

```js
assert.match(worker, /styles\.css\?v=20260915-archive-filter-sort/);
assert.match(worker, /script\.js\?v=20260915-archive-filter-sort/);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node tools/test-blog-article-filter-sort.mjs`

Expected: FAIL because the new cache versions are absent.

- [ ] **Step 3: Update both asset query versions**

Change the shared stylesheet URL and the `/articles` script URL to `20260915-archive-filter-sort`.

- [ ] **Step 4: Run syntax and regression checks**

Run:

```powershell
node tools/test-blog-article-filter-sort.mjs
node tools/test-blog-article-pagination.mjs
node tools/test-blog-article-cylinder.mjs
node tools/test-blog-anzhiyu-theme.mjs
node tools/test-blog-ios-form-input-scale.mjs
node --check blog-public/script.js
node --check blog-worker.js
git diff --check -- blog-worker.js blog-public/script.js blog-public/styles.css tools/test-blog-article-filter-sort.mjs
```

Expected: all tests and syntax checks pass with no diff errors.

- [ ] **Step 5: Run Wrangler dry-run and deploy**

```powershell
npx wrangler deploy --config wrangler.blog.toml --dry-run --outdir .wrangler-dryrun-archive-filter-sort
$env:CLOUDFLARE_API_TOKEN = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN_LUOWENHUI','User')
$env:CLOUDFLARE_ACCOUNT_ID = [Environment]::GetEnvironmentVariable('CLOUDFLARE_ACCOUNT_ID_LUOWENHUI','User')
npx wrangler deploy --config wrangler.blog.toml
```

Expected: Wrangler reports the `blog-858846` routes and a new Current Version ID without printing credential values.

- [ ] **Step 6: Verify desktop production behavior with Playwright**

Open `/articles`, select `Cloudflare`, choose `最早发布`, and verify:

- URL contains encoded `category=Cloudflare` and `sort=oldest`.
- only Cloudflare article cards are visible and dates ascend.
- selected desktop category has `aria-pressed="true"`.
- browser Back restores the preceding state.

- [ ] **Step 7: Verify mobile production behavior with Playwright**

Resize to `390 × 844` and verify:

- the compact two-select toolbar is visible and the desktop sidebar is hidden.
- both select controls compute to at least `16px` font size and `44px` height.
- the page has no horizontal overflow.
- filtering, sorting, pagination, dark mode, and language switching preserve state.

- [ ] **Step 8: Record the deployment result and final scoped diff**

Run: `git diff --check -- blog-worker.js blog-public/script.js blog-public/styles.css tools/test-blog-article-filter-sort.mjs`

Expected: no whitespace errors. Report the production version ID and changed files; leave the implementation uncommitted because these shared files already contain unrelated user work.
