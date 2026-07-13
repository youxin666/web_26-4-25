# User Article Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a login-only user article editor with Markdown preview, up to three R2-hosted images, D1-backed drafts and pending submissions, a personal article list, and one-click administrator publishing into the existing KV article pipeline.

**Architecture:** Keep public articles in the existing `BLOG_KV` store. Add D1 tables for user submissions and attachment metadata, bind one R2 bucket as `BLOG_MEDIA`, and expose ownership-checked user APIs plus administrator review APIs from the existing Worker. Put deterministic validation and publication conversion in a small importable module so the critical rules can be tested directly with Node before route wiring.

**Tech Stack:** Cloudflare Workers ES modules, Cloudflare D1, Cloudflare R2, Cloudflare KV, vanilla JavaScript, server-rendered HTML, Markdown, Node built-in assertions, Wrangler 4.

---

## File Map

- Create `blog-submissions.js`: pure submission validation, image signature detection, status checks, slug handling, and conversion to the existing public article shape.
- Create `migrations/blog_0003_user_articles.sql`: D1 submission and attachment tables plus indexes.
- Create `tools/test-blog-user-publishing.mjs`: executable Node regression suite for domain rules and source contracts.
- Modify `wrangler.blog.toml`: add `BLOG_MEDIA` R2 binding and explicit migrations directory.
- Modify `blog-worker.js`: submission pages, user/admin APIs, D1/R2 persistence, media delivery, navigation, and publication transaction order.
- Modify `blog-public/script.js`: account menu, editor, preview, autosave, upload workflow, personal article list, and admin submission actions.
- Modify `blog-public/styles.css`: editor, attachment, status-list, admin-preview, responsive, dark-mode, and reduced-motion styles.

---

### Task 1: Storage Schema and R2 Binding

**Files:**
- Create: `migrations/blog_0003_user_articles.sql`
- Modify: `wrangler.blog.toml`
- Create: `tools/test-blog-user-publishing.mjs`

- [ ] **Step 1: Write the failing storage contract test**

Create `tools/test-blog-user-publishing.mjs` with the initial assertions:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('migrations/blog_0003_user_articles.sql', 'utf8');
const config = readFileSync('wrangler.blog.toml', 'utf8');

assert.match(migration, /CREATE TABLE IF NOT EXISTS blog_user_articles/);
assert.match(migration, /status TEXT NOT NULL CHECK \(status IN \('draft', 'pending', 'published'\)\)/);
assert.match(migration, /CREATE TABLE IF NOT EXISTS blog_user_article_assets/);
assert.match(migration, /CREATE INDEX IF NOT EXISTS idx_blog_user_articles_user_status/);
assert.match(migration, /CREATE INDEX IF NOT EXISTS idx_blog_user_assets_article/);
assert.match(config, /\[\[r2_buckets\]\][\s\S]*binding = "BLOG_MEDIA"/);
assert.match(config, /migrations_dir = "migrations"/);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node tools/test-blog-user-publishing.mjs`

Expected: FAIL because `blog_0003_user_articles.sql` and the R2 binding do not exist.

- [ ] **Step 3: Add the D1 migration and configuration**

Create the migration with these tables and indexes:

```sql
CREATE TABLE IF NOT EXISTS blog_user_articles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  permalink TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  content_markdown TEXT NOT NULL DEFAULT '',
  cover_asset_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'published')) DEFAULT 'draft',
  published_permalink TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  submitted_at TEXT,
  published_at TEXT,
  FOREIGN KEY (user_id) REFERENCES blog_users(id)
);

CREATE TABLE IF NOT EXISTS blog_user_article_assets (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  alt_text TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (article_id) REFERENCES blog_user_articles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES blog_users(id)
);

CREATE INDEX IF NOT EXISTS idx_blog_user_articles_user_status
  ON blog_user_articles(user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_user_articles_pending
  ON blog_user_articles(status, submitted_at ASC);
CREATE INDEX IF NOT EXISTS idx_blog_user_assets_article
  ON blog_user_article_assets(article_id, created_at ASC);
```

Add to the D1 binding and append the R2 binding in `wrangler.blog.toml`:

```toml
migrations_dir = "migrations"

[[r2_buckets]]
binding = "BLOG_MEDIA"
bucket_name = "blog-858846-media"
```

- [ ] **Step 4: Verify GREEN**

Run: `node tools/test-blog-user-publishing.mjs`

Expected: PASS with no assertion output.

- [ ] **Step 5: Commit the storage contract**

```powershell
git add migrations/blog_0003_user_articles.sql wrangler.blog.toml tools/test-blog-user-publishing.mjs
git commit -m "feat: define user article storage"
```

---

### Task 2: Submission Domain Rules

**Files:**
- Create: `blog-submissions.js`
- Modify: `tools/test-blog-user-publishing.mjs`

- [ ] **Step 1: Add failing tests for article and image validation**

Extend the test file:

```js
import {
  ARTICLE_LIMITS,
  detectImageType,
  validateSubmission,
  canUserEditSubmission,
  buildPublishedArticle
} from '../blog-submissions.js';

assert.deepEqual(ARTICLE_LIMITS, {
  title: 120,
  category: 50,
  excerpt: 240,
  content: 30000,
  images: 3,
  imageBytes: 5 * 1024 * 1024
});

assert.equal(detectImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
assert.equal(detectImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
assert.equal(detectImageType(new TextEncoder().encode('GIF89a')), 'image/gif');
assert.equal(detectImageType(Uint8Array.from([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50])), 'image/webp');
assert.equal(detectImageType(new TextEncoder().encode('<script>')), '');

assert.deepEqual(validateSubmission({ title: '', category: 'Tech', excerpt: '', content: 'Body' }), {
  field: 'title', code: 'TITLE_REQUIRED'
});
assert.equal(canUserEditSubmission({ status: 'draft' }), true);
assert.equal(canUserEditSubmission({ status: 'pending' }), false);

const published = buildPublishedArticle({
  id: 'submission-1', title: 'Test', permalink: 'test', category: 'Tech',
  excerpt: 'Summary', content_markdown: '## Heading', coverUrl: '/media/user-articles/a1',
  authorName: 'rowan', created_at: '2026-07-14T00:00:00.000Z'
}, '2026-07-14T01:00:00.000Z');
assert.equal(published.authorName, 'rowan');
assert.equal(published.sourceSubmissionId, 'submission-1');
assert.equal(published.content, '## Heading');
```

- [ ] **Step 2: Run and verify RED**

Run: `node tools/test-blog-user-publishing.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `blog-submissions.js`.

- [ ] **Step 3: Implement the pure rules**

Create `blog-submissions.js` exporting the tested values and functions. Validation must return one stable `{ field, code }` error or `null`, trim string values, reject title/category/excerpt/content over their limits, require non-empty title/category/content at submission time, and preserve drafts with incomplete fields. `detectImageType` must compare binary signatures only. `buildPublishedArticle` must return the existing public fields:

```js
return {
  title: input.title.trim(),
  excerpt: input.excerpt.trim() || input.content_markdown.replace(/[#*_>`\[\]()!-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240),
  content: input.content_markdown,
  label: input.category.trim(),
  img: input.coverUrl || '',
  permalink: input.permalink,
  authorName: input.authorName,
  sourceSubmissionId: input.id,
  createDate: input.created_at,
  updatedAt: publishedAt
};
```

- [ ] **Step 4: Run and verify GREEN**

Run: `node tools/test-blog-user-publishing.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the domain rules**

```powershell
git add blog-submissions.js tools/test-blog-user-publishing.mjs
git commit -m "feat: validate user article submissions"
```

---

### Task 3: Ownership-Checked User Article APIs

**Files:**
- Modify: `blog-worker.js:330-455`
- Modify: `blog-worker.js:1590-1745`
- Modify: `blog-worker.js:1845-1910`
- Modify: `tools/test-blog-user-publishing.mjs`

- [ ] **Step 1: Add failing route and ownership source contracts**

Add assertions against `blog-worker.js`:

```js
const worker = readFileSync('blog-worker.js', 'utf8');
assert.match(worker, /pathname === '\/api\/user\/articles'/);
assert.match(worker, /\/api\/user\/articles\/\(\[\^\/\]\+\)/);
assert.match(worker, /user_id = \?/);
assert.match(worker, /status !== 'draft'/);
assert.match(worker, /VERSION_CONFLICT/);
assert.match(worker, /handleSubmitUserArticle/);
```

- [ ] **Step 2: Run and verify RED**

Run: `node tools/test-blog-user-publishing.mjs`

Expected: FAIL because user article routes and handlers are absent.

- [ ] **Step 3: Implement authenticated CRUD and submit handlers**

Import the domain module at the top of `blog-worker.js`. Add one reusable helper:

```js
async function requireUser(request, env) {
  const token = parseCookies(request)[USER_COOKIE_NAME];
  const session = await verifyUserToken(token, env);
  if (!session) return { response: jsonResponse({ error: 'LOGIN_REQUIRED' }, { status: 401 }) };
  return { user: session };
}
```

Implement:

- `POST /api/user/articles`: insert a UUID draft owned by `session.id`.
- `GET /api/user/articles`: select only rows with `user_id = ?`, newest first.
- `GET /api/user/articles/:id`: select article plus assets with both `id = ?` and `user_id = ?`.
- `PUT /api/user/articles/:id`: update only `draft`, validate `version`, increment `version`, and return HTTP 409 `{ error: 'VERSION_CONFLICT' }` on stale saves.
- `POST /api/user/articles/:id/submit`: load owned draft and assets, call `validateSubmission(..., { requireComplete: true })`, verify cover ownership, perform the final update with `WHERE id = ? AND user_id = ? AND status = 'draft'`, and set `status = 'pending'` and `submitted_at`.

Return public DTOs without internal `object_key` or email values.

- [ ] **Step 4: Run route contracts and existing tests**

Run:

```powershell
node tools/test-blog-user-publishing.mjs
node tools/test-blog-anzhiyu-theme.mjs
node tools/test-blog-article-quick-actions.mjs
```

Expected: all three commands PASS.

- [ ] **Step 5: Commit user article APIs**

```powershell
git add blog-worker.js tools/test-blog-user-publishing.mjs
git commit -m "feat: add authenticated article draft APIs"
```

---

### Task 4: R2 Image Upload and Controlled Media Delivery

**Files:**
- Modify: `blog-worker.js:1590-1810`
- Modify: `blog-worker.js:1845-1910`
- Modify: `tools/test-blog-user-publishing.mjs`

- [ ] **Step 1: Add failing image route contracts**

```js
assert.match(worker, /BLOG_MEDIA\.put/);
assert.match(worker, /BLOG_MEDIA\.get/);
assert.match(worker, /BLOG_MEDIA\.delete/);
assert.match(worker, /detectImageType/);
assert.match(worker, /IMAGE_LIMIT_REACHED/);
assert.match(worker, /X-Content-Type-Options.*nosniff/);
assert.match(worker, /status === 'published'/);
```

- [ ] **Step 2: Run and verify RED**

Run: `node tools/test-blog-user-publishing.mjs`

Expected: FAIL on the missing R2 calls.

- [ ] **Step 3: Implement image handlers**

For `POST /api/user/articles/:id/assets`:

1. Require user session and owned `draft` article.
2. Parse `multipart/form-data` and require one `File` field named `image`.
3. Reject files over `ARTICLE_LIMITS.imageBytes` before R2 write.
4. Count existing assets and reject count `>= 3` with HTTP 409 `IMAGE_LIMIT_REACHED`.
5. Read the first 16 bytes, call `detectImageType`, and require it to equal the normalized declared MIME.
6. Generate `assetId`, derive a fixed extension from detected MIME, and write `BLOG_MEDIA.put(objectKey, file.stream(), { httpMetadata: { contentType }, customMetadata: { articleId, userId } })`.
7. Insert D1 metadata and return `/media/user-articles/<assetId>`.

For asset metadata update and delete, require the same ownership and `draft` state. Delete the R2 object first and D1 row second; a missing R2 object is safe to retry.

For `GET /media/user-articles/:assetId`, join asset to submission. Allow access when the submission is `published`, or when the current user owns it, or when the request has a valid administrator session. Respond with stored content type, `X-Content-Type-Options: nosniff`, and either private/no-store caching or public immutable caching based on status.

- [ ] **Step 4: Run all source tests and Wrangler dry-run**

```powershell
node tools/test-blog-user-publishing.mjs
wrangler deploy --config wrangler.blog.toml --dry-run
```

Expected: tests PASS; dry-run lists `env.BLOG_MEDIA` as an R2 bucket binding.

- [ ] **Step 5: Commit media handling**

```powershell
git add blog-worker.js tools/test-blog-user-publishing.mjs
git commit -m "feat: store submission images in R2"
```

---

### Task 5: Logged-In Account Menu and Publish Editor Page

**Files:**
- Modify: `blog-worker.js:500-760`
- Modify: `blog-worker.js:999-1135`
- Modify: `blog-worker.js:1910-1995`
- Modify: `blog-public/script.js:50-320`
- Modify: `blog-public/script.js:920-1110`
- Modify: `tools/test-blog-user-publishing.mjs`

- [ ] **Step 1: Add failing page structure tests**

```js
assert.match(worker, /href="\/publish"/);
assert.match(worker, /href="\/my-articles"/);
assert.match(worker, /data-user-account-menu/);
assert.match(worker, /data-publish-editor/);
assert.match(worker, /data-editor-preview/);
assert.match(worker, /data-attachment-list/);
assert.match(worker, /data-editor-mode="edit"/);
assert.match(worker, /data-editor-mode="preview"/);
```

- [ ] **Step 2: Run and verify RED**

Run: `node tools/test-blog-user-publishing.mjs`

Expected: FAIL because the account menu and editor page do not exist.

- [ ] **Step 3: Render the account menu and `/publish` shell**

Update shared navigation so the authenticated state renders a button with the display name and a hidden menu containing links to `/publish`, `/my-articles`, and logout. Keep anonymous navigation unchanged.

Add `publishPageHtml()` with:

- title, category, excerpt and cover controls;
- Markdown toolbar buttons identified by `data-markdown-action`;
- `textarea[name="content"]` with 30,000 maximum length;
- attachment uploader accepting `.jpg,.jpeg,.png,.webp,.gif`;
- save-state live region;
- desktop editor and preview columns;
- mobile edit/preview segmented control;
- save-draft and submit-review buttons.

Route `/publish` and `/my-articles` through a server-side user session check. Unauthenticated requests redirect to `/login?returnTo=%2Fpublish` or `%2Fmy-articles`; accept return paths only when they start with one `/` and not `//`.

- [ ] **Step 4: Run source tests**

Run: `node tools/test-blog-user-publishing.mjs`

Expected: PASS.

- [ ] **Step 5: Commit page shells**

```powershell
git add blog-worker.js blog-public/script.js tools/test-blog-user-publishing.mjs
git commit -m "feat: add user publishing pages"
```

---

### Task 6: Editor, Markdown Preview, Autosave, and Attachments

**Files:**
- Modify: `blog-public/script.js:320-450`
- Modify: `blog-public/script.js:920-1110`
- Modify: `blog-public/script.js:1110-1250`
- Modify: `tools/test-blog-user-publishing.mjs`

- [ ] **Step 1: Add failing client behavior contracts**

```js
const script = readFileSync('blog-public/script.js', 'utf8');
assert.match(script, /function initPublishEditor/);
assert.match(script, /setTimeout\([^)]*3000/);
assert.match(script, /localStorage\.setItem/);
assert.match(script, /VERSION_CONFLICT/);
assert.match(script, /selectionStart/);
assert.match(script, /selectionEnd/);
assert.match(script, /\/assets'/);
assert.match(script, /\/submit'/);
```

- [ ] **Step 2: Run and verify RED**

Run: `node tools/test-blog-user-publishing.mjs`

Expected: FAIL because `initPublishEditor` and the editor flows are absent.

- [ ] **Step 3: Implement editor behavior**

Implement `initPublishEditor()` to:

- create a draft via `POST /api/user/articles` when no `id` query parameter exists;
- load an existing owned draft when `id` exists;
- wrap selected text or insert Markdown at `selectionStart`/`selectionEnd` for every toolbar command;
- render preview with the same supported Markdown element rules as the public article renderer;
- debounce server save for 3,000 ms and include the current `version`;
- save a local backup under `blog_user_draft_<id>` after every input;
- stop autosave and show conflict UI on HTTP 409;
- upload with `FormData`, update the attachment list, allow alt/caption updates, choose one cover, insert `![alt](/media/user-articles/id "caption")`, and delete only after confirmation;
- validate all limits before calling submit;
- force one successful save, then call `/submit`, clear the local backup, and redirect to `/my-articles?submitted=1`.

Use `textContent`/escaped templates for all user-provided values. Never insert raw title, category, alt, caption, or API error HTML.

- [ ] **Step 4: Run tests**

```powershell
node tools/test-blog-user-publishing.mjs
node tools/test-blog-anzhiyu-theme.mjs
```

Expected: both PASS.

- [ ] **Step 5: Commit the editor**

```powershell
git add blog-public/script.js tools/test-blog-user-publishing.mjs
git commit -m "feat: add Markdown submission editor"
```

---

### Task 7: My Articles Page

**Files:**
- Modify: `blog-worker.js:1050-1160`
- Modify: `blog-worker.js:1910-1995`
- Modify: `blog-public/script.js:1110-1300`
- Modify: `tools/test-blog-user-publishing.mjs`

- [ ] **Step 1: Add failing personal-list contracts**

```js
assert.match(worker, /data-my-articles/);
assert.match(script, /function initMyArticles/);
assert.match(script, /draft[\s\S]*pending[\s\S]*published/);
assert.match(script, /\/publish\?id=/);
```

- [ ] **Step 2: Run and verify RED**

Run: `node tools/test-blog-user-publishing.mjs`

Expected: FAIL on missing personal list behavior.

- [ ] **Step 3: Implement `/my-articles`**

Render a page shell with three accessible tabs: 草稿, 待审核, 已发布. `initMyArticles()` fetches `/api/user/articles`, groups items by status, and renders title, category, cover thumbnail, updated time and action:

- draft: `/publish?id=<id>` labeled 继续编辑;
- pending: `/my-articles?id=<id>` or an inline read-only preview labeled 查看投稿;
- published: `/article/<published_permalink>` labeled 查看已发布文章.

Render a useful empty state for each group. Use the existing language dictionary for all Chinese and English labels.

- [ ] **Step 4: Run tests**

Run: `node tools/test-blog-user-publishing.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the personal article list**

```powershell
git add blog-worker.js blog-public/script.js tools/test-blog-user-publishing.mjs
git commit -m "feat: add personal article dashboard"
```

---

### Task 8: Administrator Submission Review and Idempotent Publish

**Files:**
- Modify: `blog-worker.js:999-1050`
- Modify: `blog-worker.js:1625-1690`
- Modify: `blog-worker.js:1845-1910`
- Modify: `blog-public/script.js:960-1040`
- Modify: `tools/test-blog-user-publishing.mjs`

- [ ] **Step 1: Add failing administrator contracts**

```js
assert.match(worker, /\/api\/admin\/submissions/);
assert.match(worker, /handleAdminPublishSubmission/);
assert.match(worker, /sourceSubmissionId/);
assert.match(worker, /status = 'published'/);
assert.match(script, /data-admin-submissions/);
assert.match(script, /发布用户投稿/);
```

- [ ] **Step 2: Run and verify RED**

Run: `node tools/test-blog-user-publishing.mjs`

Expected: FAIL because review APIs and UI are absent.

- [ ] **Step 3: Implement review and publication**

Add administrator-authenticated endpoints:

- `GET /api/admin/submissions?status=pending`: list pending rows with author display name.
- `GET /api/admin/submissions/:id`: return full Markdown and attachment URLs.
- `POST /api/admin/submissions/:id/publish`: require `pending`, resolve a normalized unique permalink, build a public article with `buildPublishedArticle`, write `article:<permalink>`, update `articles:index` without duplicate entries, then update D1 to `published` with `published_permalink` and `published_at`.

If the D1 row is already `published`, return the existing public URL. If KV already contains an article with this `sourceSubmissionId`, reuse its permalink. This makes repeated clicks safe.

Extend the admin page with a “用户投稿” list, a full preview modal/panel, attachment display, and one publish button. Do not add reject, return, delete, or moderation-reason controls.

- [ ] **Step 4: Run all tests**

```powershell
node tools/test-blog-user-publishing.mjs
node tools/test-blog-anzhiyu-theme.mjs
node tools/test-blog-article-quick-actions.mjs
```

Expected: all PASS.

- [ ] **Step 5: Commit administrator publishing**

```powershell
git add blog-worker.js blog-public/script.js tools/test-blog-user-publishing.mjs
git commit -m "feat: publish reviewed user submissions"
```

---

### Task 9: Styling, Localization, Browser Verification, and Deployment

**Files:**
- Modify: `blog-public/styles.css`
- Modify: `blog-public/script.js:50-320`
- Modify: `blog-worker.js` cache-busting asset versions
- Modify: `tools/test-blog-user-publishing.mjs`

- [ ] **Step 1: Add failing style and localization contracts**

```js
const styles = readFileSync('blog-public/styles.css', 'utf8');
assert.match(styles, /\.publish-editor-layout/);
assert.match(styles, /\.publish-preview-panel/);
assert.match(styles, /\.article-attachment-grid/);
assert.match(styles, /@media \(max-width: 767px\)/);
assert.match(styles, /prefers-reduced-motion/);
assert.match(script, /'publish\.title'/);
assert.match(script, /'myArticles\.pending'/);
assert.match(script, /'admin\.publishSubmission'/);
```

- [ ] **Step 2: Run and verify RED**

Run: `node tools/test-blog-user-publishing.mjs`

Expected: FAIL on missing style and translation markers.

- [ ] **Step 3: Add production styles and translations**

Style the editor as the approved A layout:

- desktop grid with stable editor and preview columns;
- sticky preview within the content area, never over the header or footer;
- mobile segmented edit/preview mode with one visible panel at a time;
- three fixed-ratio attachment tiles that cannot resize from labels or loading state;
- compact save status and clear pending/published status badges;
- dark-mode variables without hard-coded white panels;
- focus-visible rings and reduced-motion rules;
- no nested decorative cards and no viewport-width font scaling.

Add complete Chinese and English strings for account menu, editor fields, toolbar labels, image errors, save states, article statuses, admin review and publish results. Update CSS/JS cache versions once after all edits.

- [ ] **Step 4: Run automated and local browser verification**

Run:

```powershell
node tools/test-blog-user-publishing.mjs
node tools/test-blog-anzhiyu-theme.mjs
node tools/test-blog-article-quick-actions.mjs
wrangler d1 migrations apply BLOG_DB --local --config wrangler.blog.toml
wrangler dev --config wrangler.blog.toml --local
```

Use Playwright to verify:

1. anonymous `/publish` redirects to login;
2. a registered user can create and autosave a draft;
3. 390×844 mobile mode switches between editor and preview with `scrollWidth === clientWidth`;
4. upload three valid images and reject the fourth;
5. choose a cover and insert an image into Markdown;
6. submit and confirm the article becomes read-only pending;
7. administrator sees the exact pending article and publishes it once;
8. the public article shows the author nickname and appears in `/api/articles`, `/rss.xml?format=xml`, and `/sitemap.xml`;
9. English and dark mode remain complete;
10. reduced-motion mode removes nonessential transitions.

- [ ] **Step 5: Provision production storage and deploy**

Use persisted Cloudflare environment variables without printing secrets:

```powershell
$env:CLOUDFLARE_API_TOKEN=[Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN','User')
$env:CLOUDFLARE_ACCOUNT_ID=[Environment]::GetEnvironmentVariable('CLOUDFLARE_ACCOUNT_ID','User')
$env:WRANGLER_SEND_METRICS='false'
wrangler r2 bucket create blog-858846-media
wrangler d1 migrations list BLOG_DB --remote --config wrangler.blog.toml
wrangler d1 migrations apply BLOG_DB --remote --config wrangler.blog.toml
wrangler deploy --config wrangler.blog.toml --dry-run
wrangler deploy --config wrangler.blog.toml
```

If the R2 bucket already exists, verify it with `wrangler r2 bucket list` and continue. Cloudflare documents the TOML R2 binding as `[[r2_buckets]]` with `binding` and `bucket_name`, and remote D1 migrations as `wrangler d1 migrations apply <database> --remote`.

- [ ] **Step 6: Verify production and commit final polish**

Repeat the browser flow on `https://blog.858846.xyz` with a disposable normal user and the administrator session. Confirm the published article is reachable, image responses have `nosniff`, draft images are not anonymously readable, and duplicate publish calls return the same permalink.

```powershell
git add blog-public/styles.css blog-public/script.js blog-worker.js tools/test-blog-user-publishing.mjs
git commit -m "feat: finish user article publishing workflow"
```

---

## Completion Evidence

The implementation is complete only when all of the following evidence exists in the same run:

- all three Node test commands exit 0;
- Wrangler dry-run lists KV, D1, Assets, and `BLOG_MEDIA` R2 bindings;
- the production D1 migration is listed as applied;
- desktop and 390px Playwright checks show no overlap or horizontal overflow;
- an authenticated user submission progresses `draft -> pending -> published`;
- anonymous users cannot access draft media;
- the published article appears once in the public API, RSS and sitemap;
- Cloudflare deploy returns a new Worker version ID.
