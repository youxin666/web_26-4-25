# User Notification Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an authenticated, bilingual Rowan Notes notification center for comment replies, comments on user-authored articles, submission approval/rejection, and customer-service replies.

**Architecture:** Add a focused `blog-notifications.js` domain module that owns validation, D1 persistence, pagination, unread state, idempotency, and retention. Existing comment, submission-review, and customer-service handlers call this module only after their primary writes succeed. The shared navigation and a new `/notifications` page consume authenticated notification APIs through the existing native JavaScript and theme system.

**Tech Stack:** Cloudflare Workers, D1 SQLite, KV article metadata, Durable Objects customer-service transport, native JavaScript, HTML/CSS, Node source-contract tests, Wrangler.

---

## File map

- Create `migrations/blog_0007_user_notifications.sql`: add comment ownership and notification persistence/indexes.
- Create `blog-notifications.js`: notification types, payload/link normalization, idempotent creation, list/count/read/retention operations.
- Create `tools/test-blog-notifications.mjs`: pure-domain and source-contract regression coverage.
- Modify `blog-worker.js`: import notification service; authenticated routes; notifications page; comment/submission event integration; shared-nav entry.
- Modify `blog-customer-service.js`: create a notification after a successfully persisted admin reply.
- Modify `blog-public/script.js`: i18n, nav badge, notification list/read interactions, return-to behavior.
- Modify `blog-public/styles.css`: responsive notification center, badge, dark theme, empty/error states, reduced motion.
- Modify `tools/test-blog-comment-replies.mjs`: confirm comments retain current reply behavior while storing authenticated ownership.
- Modify `tools/test-blog-customer-service.mjs`: confirm only persisted admin replies notify the bound user.
- Modify `tools/test-blog-system-i18n.mjs`: require notification interface strings in Chinese and English.

### Task 1: Notification schema and domain module

**Files:**
- Create: `migrations/blog_0007_user_notifications.sql`
- Create: `blog-notifications.js`
- Create: `tools/test-blog-notifications.mjs`

- [ ] **Step 1: Write the failing domain and schema test**

Create `tools/test-blog-notifications.mjs` with assertions for the migration contract and pure exports:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  NOTIFICATION_TYPES,
  notificationEventKey,
  safeNotificationHref,
  normalizeNotificationPayload
} from '../blog-notifications.js';

const migration = readFileSync(new URL('../migrations/blog_0007_user_notifications.sql', import.meta.url), 'utf8');
assert.match(migration, /ALTER TABLE blog_comments ADD COLUMN user_id TEXT/);
assert.match(migration, /CREATE TABLE IF NOT EXISTS blog_notifications/);
assert.match(migration, /event_key TEXT NOT NULL UNIQUE/);
assert.match(migration, /idx_blog_notifications_user_unread/);
assert.deepEqual([...NOTIFICATION_TYPES], [
  'comment_reply',
  'article_comment',
  'submission_approved',
  'submission_rejected',
  'customer_service_reply'
]);
assert.equal(notificationEventKey('comment_reply', 'reply-1'), 'comment_reply:reply-1');
assert.equal(safeNotificationHref('/article/example#comment-reply-1'), '/article/example#comment-reply-1');
assert.equal(safeNotificationHref('https://evil.example/'), '/notifications');
assert.deepEqual(normalizeNotificationPayload({ actorName: '<b>A</b>', extra: { bad: true } }), { actorName: '<b>A</b>' });
console.log('Blog notification domain checks passed.');
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run: `node tools/test-blog-notifications.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `blog-notifications.js`.

- [ ] **Step 3: Add the migration**

Create `migrations/blog_0007_user_notifications.sql`:

```sql
ALTER TABLE blog_comments ADD COLUMN user_id TEXT REFERENCES blog_users(id);

CREATE INDEX IF NOT EXISTS idx_blog_comments_user
  ON blog_comments(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS blog_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES blog_users(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN (
    'comment_reply',
    'article_comment',
    'submission_approved',
    'submission_rejected',
    'customer_service_reply'
  )),
  payload_json TEXT NOT NULL DEFAULT '{}',
  href TEXT NOT NULL DEFAULT '/notifications',
  read_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blog_notifications_user_created
  ON blog_notifications(user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_blog_notifications_user_unread
  ON blog_notifications(user_id, read_at, created_at DESC);
```

- [ ] **Step 4: Implement the focused notification module**

Create `blog-notifications.js` with these public interfaces:

```js
export const NOTIFICATION_TYPES = Object.freeze([
  'comment_reply',
  'article_comment',
  'submission_approved',
  'submission_rejected',
  'customer_service_reply'
]);

const TYPE_SET = new Set(NOTIFICATION_TYPES);
const PAYLOAD_KEYS = new Set(['actorName', 'articleTitle', 'articlePermalink', 'commentId', 'submissionId']);

export function notificationEventKey(type, sourceId) {
  if (!TYPE_SET.has(type)) return '';
  const id = String(sourceId || '').trim().slice(0, 160);
  return id ? `${type}:${id}` : '';
}

export function safeNotificationHref(value) {
  const href = String(value || '').trim();
  return /^\/(?!\/)[^\r\n]*$/.test(href) ? href.slice(0, 500) : '/notifications';
}

export function normalizeNotificationPayload(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  return Object.fromEntries(Object.entries(source)
    .filter(([key]) => PAYLOAD_KEYS.has(key))
    .map(([key, value]) => [key, String(value ?? '').slice(0, 300)]));
}

export async function createNotification(env, input) {
  if (!env?.BLOG_DB || !input?.userId || !TYPE_SET.has(input.type)) return { created: false };
  const eventKey = notificationEventKey(input.type, input.sourceId);
  if (!eventKey) return { created: false };
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const result = await env.BLOG_DB.prepare(
    `INSERT OR IGNORE INTO blog_notifications
     (id,user_id,event_key,type,payload_json,href,created_at)
     VALUES(?,?,?,?,?,?,?)`
  ).bind(
    id,
    input.userId,
    eventKey,
    input.type,
    JSON.stringify(normalizeNotificationPayload(input.payload)),
    safeNotificationHref(input.href),
    createdAt
  ).run();
  const cleanup = pruneNotifications(env, input.userId, createdAt).catch(() => undefined);
  if (input.ctx?.waitUntil) input.ctx.waitUntil(cleanup); else await cleanup;
  return { created: Number(result.meta?.changes || 0) === 1, id, createdAt };
}

export async function listNotifications(env, userId, { limit = 30, cursor = '' } = {}) {
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 30));
  let before = null;
  try { before = cursor ? JSON.parse(atob(cursor)) : null; } catch { before = null; }
  const where = before ? 'AND (created_at < ? OR (created_at = ? AND id < ?))' : '';
  const args = before
    ? [userId, before.createdAt, before.createdAt, before.id, safeLimit + 1]
    : [userId, safeLimit + 1];
  const rows = (await env.BLOG_DB.prepare(
    `SELECT id,type,payload_json,href,read_at,created_at
     FROM blog_notifications WHERE user_id=? ${where}
     ORDER BY created_at DESC,id DESC LIMIT ?`
  ).bind(...args).all()).results || [];
  const hasMore = rows.length > safeLimit;
  if (hasMore) rows.pop();
  const last = rows.at(-1);
  return {
    notifications: rows.map(row => ({
      ...row,
      payload: JSON.parse(row.payload_json || '{}'),
      payload_json: undefined
    })),
    nextCursor: hasMore && last ? btoa(JSON.stringify({ createdAt: last.created_at, id: last.id })) : ''
  };
}

export async function unreadNotificationCount(env, userId) {
  const row = await env.BLOG_DB.prepare(
    'SELECT COUNT(*) AS count FROM blog_notifications WHERE user_id=? AND read_at IS NULL'
  ).bind(userId).first();
  return Number(row?.count || 0);
}

export async function markNotificationRead(env, userId, id) {
  const readAt = new Date().toISOString();
  const rows = (await env.BLOG_DB.prepare(
    'UPDATE blog_notifications SET read_at=COALESCE(read_at,?) WHERE id=? AND user_id=? RETURNING id,read_at'
  ).bind(readAt, id, userId).all()).results || [];
  return { found: Boolean(rows[0]), readAt: rows[0]?.read_at || readAt };
}

export async function markAllNotificationsRead(env, userId) {
  const readAt = new Date().toISOString();
  const result = await env.BLOG_DB.prepare(
    'UPDATE blog_notifications SET read_at=? WHERE user_id=? AND read_at IS NULL'
  ).bind(readAt, userId).run();
  return { updated: Number(result.meta?.changes || 0), readAt };
}

export async function pruneNotifications(env, userId, nowIso = new Date().toISOString()) {
  const cutoff = new Date(new Date(nowIso).getTime() - 90 * 86400000).toISOString();
  await env.BLOG_DB.batch([
    env.BLOG_DB.prepare(
      'DELETE FROM blog_notifications WHERE user_id=? AND created_at<?'
    ).bind(userId, cutoff),
    env.BLOG_DB.prepare(
      `DELETE FROM blog_notifications WHERE id IN (
         SELECT id FROM blog_notifications WHERE user_id=?
         ORDER BY created_at DESC,id DESC LIMIT -1 OFFSET 500
       )`
    ).bind(userId)
  ]);
}
```

`createNotification` must use `INSERT OR IGNORE`, a generated UUID, JSON from `normalizeNotificationPayload`, `safeNotificationHref`, and the stable event key. Retention is best-effort: call it through `ctx.waitUntil` when context is provided and never fail the primary event because pruning failed.

- [ ] **Step 5: Run the new test**

Run: `node tools/test-blog-notifications.mjs`

Expected: `Blog notification domain checks passed.`

- [ ] **Step 6: Commit the schema and domain boundary**

```powershell
git add migrations/blog_0007_user_notifications.sql blog-notifications.js tools/test-blog-notifications.mjs
git commit -m "feat: add user notification domain"
```

### Task 2: Authenticated notification API and page shell

**Files:**
- Modify: `blog-worker.js`
- Modify: `tools/test-blog-notifications.mjs`

- [ ] **Step 1: Add failing route and authorization assertions**

Extend the test to require imports, routes and strict authentication:

```js
const worker = readFileSync(new URL('../blog-worker.js', import.meta.url), 'utf8');
assert.match(worker, /from '\.\/blog-notifications\.js'/);
assert.match(worker, /pathname === '\/api\/notifications'/);
assert.match(worker, /pathname === '\/api\/notifications\/unread-count'/);
assert.match(worker, /pathname === '\/api\/notifications\/read'/);
assert.match(worker, /pathname === '\/api\/notifications\/read-all'/);
assert.match(worker, /requireUser\(request, env\)/);
assert.match(worker, /pathname === '\/notifications'/);
assert.match(worker, /returnTo=.*notifications/);
```

- [ ] **Step 2: Run the test and verify route assertions fail**

Run: `node tools/test-blog-notifications.mjs`

Expected: FAIL on the first missing Worker route assertion.

- [ ] **Step 3: Add authenticated handlers**

Import the notification module into `blog-worker.js`. Add handlers that call `requireUser`, validate `limit` as `1..50`, return `Cache-Control: no-store`, and never accept a `userId` from the client:

```js
async function handleNotificationsApi(request, env) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;
  const url = new URL(request.url);
  const page = await listNotifications(env, auth.user.id, {
    limit: Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 30)),
    cursor: url.searchParams.get('cursor') || ''
  });
  return jsonResponse({ ...page, unreadCount: await unreadNotificationCount(env, auth.user.id) }, {
    headers: { 'Cache-Control': 'no-store' }
  });
}
```

Create equivalent small handlers for unread count, one-item read and read-all. Treat an unknown or other-user item ID as `404 NOTIFICATION_NOT_FOUND`.

- [ ] **Step 4: Add `/notifications` route and server-rendered page shell**

Add `notificationsPageHtml()` using `SHARED_NAV`, a heading, unread summary, all-read button, list live region, load-more button and empty/error templates identified by data attributes. Protect the route exactly like `/my-articles`; redirect unauthenticated users to the existing auth page with `returnTo=/notifications`.

- [ ] **Step 5: Run syntax and notification tests**

Run:

```powershell
node --check blog-worker.js
node tools/test-blog-notifications.mjs
```

Expected: both exit 0.

- [ ] **Step 6: Commit API and page shell**

```powershell
git add blog-worker.js tools/test-blog-notifications.mjs
git commit -m "feat: expose authenticated notification center"
```

### Task 3: Comment and review event integration

**Files:**
- Modify: `blog-worker.js`
- Modify: `tools/test-blog-notifications.mjs`
- Modify: `tools/test-blog-comment-replies.mjs`

- [ ] **Step 1: Write failing event assertions**

Require comment ownership, self-notification suppression, stable event keys and both review events:

```js
assert.match(worker, /INSERT INTO blog_comments \(id, article_permalink, author_name, author_email, content, parent_id, user_id/);
assert.match(worker, /comment_reply/);
assert.match(worker, /article_comment/);
assert.match(worker, /parent\.user_id !== currentUser\.id/);
assert.match(worker, /submission_approved/);
assert.match(worker, /submission_rejected/);
assert.match(worker, /sourceSubmissionId/);
```

Update `tools/test-blog-comment-replies.mjs` to require `user_id` in the parent lookup and insert while retaining all existing one-level reply assertions.

- [ ] **Step 2: Run both tests and verify they fail**

Run:

```powershell
node tools/test-blog-notifications.mjs
node tools/test-blog-comment-replies.mjs
```

Expected: FAIL on missing ownership/event integration.

- [ ] **Step 3: Bind authenticated comment ownership**

Change the handler signature to `handlePostComment(request, env, ctx, permalink)` and pass `ctx` from the router. Call `getCurrentUser(request, env)` once and load the article with `getArticle(env, permalink)`. Store `currentUser?.id || null` as `blog_comments.user_id`. When replying, select the root comment's `user_id` and author data. After the comment insert succeeds, enqueue the notification without allowing a notification failure to change the successful comment response:

```js
if (parent?.user_id && parent.user_id !== currentUser?.id) {
  ctx.waitUntil(createNotification(env, {
    userId: parent.user_id,
    type: 'comment_reply',
    sourceId: id,
    payload: { actorName: authorName, articleTitle: article.title, articlePermalink: permalink, commentId: id },
    href: `/article/${encodeURIComponent(permalink)}#comment-${id}`,
    ctx
  }).catch(error => console.error('comment reply notification failed', error)));
}
```

For a published user submission, use `article.sourceSubmissionId` to find `blog_user_articles.user_id`. Generate `article_comment` unless the same recipient already received `comment_reply` for this new comment.

- [ ] **Step 4: Notify after successful submission state changes**

After `markSubmissionPublished` confirms success, use `ctx.waitUntil` to create `submission_approved:<submission-id>` for `submission.user_id` with the final article URL and catch/log failures. When the publish endpoint is retried for an already published submission, enqueue the same idempotent notification before returning success so a transient notification failure can repair itself. Apply the same pattern after rejection and when a retry finds that exact submission already rejected. Link rejection to `/my-articles?status=rejected&id=<submission-id>`. Do not create notifications for unrelated conflict states.

- [ ] **Step 5: Run tests and syntax checks**

Run:

```powershell
node --check blog-worker.js
node tools/test-blog-notifications.mjs
node tools/test-blog-comment-replies.mjs
node tools/test-blog-user-publishing.mjs
```

Expected: all exit 0.

- [ ] **Step 6: Commit comment and review events**

```powershell
git add blog-worker.js tools/test-blog-notifications.mjs tools/test-blog-comment-replies.mjs
git commit -m "feat: notify users about comments and reviews"
```

### Task 4: Customer-service reply notification

**Files:**
- Modify: `blog-customer-service.js`
- Modify: `tools/test-blog-customer-service.mjs`
- Modify: `tools/test-blog-notifications.mjs`

- [ ] **Step 1: Add failing customer-service assertions**

```js
const customerService = readFileSync(new URL('../blog-customer-service.js', import.meta.url), 'utf8');
assert.match(customerService, /createNotification/);
assert.match(customerService, /customer_service_reply/);
assert.match(customerService, /session\.user_id/);
assert.match(customerService, /sourceId: id/);
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node tools/test-blog-notifications.mjs`

Expected: FAIL because customer-service notification integration is absent.

- [ ] **Step 3: Notify only after a persisted admin reply**

Import `createNotification` into `blog-customer-service.js`. In `insertMessage`, after the D1 batch succeeds and only when `senderType === 'admin' && session.user_id`, create a notification using message ID as the source ID:

```js
ctx?.waitUntil?.(createNotification(env, {
  userId: session.user_id,
  type: 'customer_service_reply',
  sourceId: id,
  payload: { actorName: '客服' },
  href: '/?openCustomerService=1',
  ctx
}).catch(error => console.error('support reply notification failed', error)));
```

Do not notify for duplicate message returns, visitor messages, unbound legacy sessions or failed inserts.

- [ ] **Step 4: Run customer-service regression tests**

Run:

```powershell
node --check blog-customer-service.js
node tools/test-blog-notifications.mjs
node tools/test-blog-customer-service.mjs
node tools/test-customer-service-api.mjs
```

Expected: all exit 0.

- [ ] **Step 5: Commit the customer-service event**

```powershell
git add blog-customer-service.js tools/test-blog-customer-service.mjs tools/test-blog-notifications.mjs
git commit -m "feat: notify users about support replies"
```

### Task 5: Bilingual navigation badge and message UI

**Files:**
- Modify: `blog-worker.js`
- Modify: `blog-public/script.js`
- Modify: `blog-public/styles.css`
- Modify: `tools/test-blog-notifications.mjs`
- Modify: `tools/test-blog-system-i18n.mjs`

- [ ] **Step 1: Write failing UI and i18n assertions**

Require the nav control, badge, page controller and message keys:

```js
const script = readFileSync(new URL('../blog-public/script.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../blog-public/styles.css', import.meta.url), 'utf8');
assert.match(worker, /data-notification-link/);
assert.match(worker, /data-notification-badge/);
assert.match(worker, /data-notifications-page/);
assert.match(script, /initNotifications/);
assert.match(script, /notifications\.commentReply/);
assert.match(script, /notifications\.submissionApproved/);
assert.match(script, /notifications\.submissionRejected/);
assert.match(script, /notifications\.supportReply/);
assert.match(styles, /\.notification-nav-badge/);
assert.match(styles, /\.notifications-list/);
assert.match(styles, /body\.dark \.notification-card/);
assert.match(styles, /prefers-reduced-motion/);
```

- [ ] **Step 2: Run UI tests and verify failure**

Run:

```powershell
node tools/test-blog-notifications.mjs
node tools/test-blog-system-i18n.mjs
```

Expected: FAIL on the first missing UI/i18n assertion.

- [ ] **Step 3: Add the authenticated nav entry**

Place a 36–44 px bell control before the user menu, hidden by default. `updateUserNav(user)` reveals it only for authenticated users and fetches `/api/notifications/unread-count`. Render `99+` for values over 99 and hide the badge at zero without leaving layout space. Add “消息中心 / Notifications” to the existing account menu.

- [ ] **Step 4: Add bilingual notification rendering**

Add Chinese and English keys for headings, empty/error/loading states, actions, and all five message types. Generate all text with `textContent`, never `innerHTML` from payload. Format messages as:

```js
function notificationText(item) {
  const payload = item.payload || {};
  const values = {
    actor: payload.actorName || t('notifications.someone'),
    title: payload.articleTitle || t('notifications.untitled')
  };
  return interpolate(t(`notifications.${notificationTypeKey(item.type)}`), values);
}
```

Implement pagination, one-item read, read-all, optimistic badge reduction with API reconciliation, retry state, and click-through. On a language change, rerender the current in-memory list.

- [ ] **Step 5: Add responsive Rowan Notes styling**

Use the current glass cards and theme variables. Desktop uses a readable centered timeline; mobile uses the existing compact nav sizing and full-width cards. Unread cards receive a subtle accent tint and dot, not a large solid block. Add dark-mode surfaces/borders/text and disable nonessential transitions under reduced motion.

- [ ] **Step 6: Run UI, i18n and syntax tests**

Run:

```powershell
node --check blog-public/script.js
node tools/test-blog-notifications.mjs
node tools/test-blog-system-i18n.mjs
node tools/test-blog-anzhiyu-theme.mjs
```

Expected: all exit 0.

- [ ] **Step 7: Commit the notification UI**

```powershell
git add blog-worker.js blog-public/script.js blog-public/styles.css tools/test-blog-notifications.mjs tools/test-blog-system-i18n.mjs
git commit -m "feat: add bilingual notification center UI"
```

### Task 6: Full verification, migration and production deployment

**Files:**
- Verify all modified files
- Update asset query versions in `blog-worker.js` only if static files changed

- [ ] **Step 1: Apply the migration locally**

Run:

```powershell
npx wrangler d1 migrations apply BLOG_DB --local --config wrangler.blog.toml
```

Expected: `blog_0007_user_notifications.sql` succeeds without altering existing rows destructively.

- [ ] **Step 2: Run every blog regression test**

Run:

```powershell
Get-ChildItem tools\test-blog-*.mjs | ForEach-Object { node $_.FullName; if ($LASTEXITCODE -ne 0) { throw "Test failed: $($_.Name)" } }
node tools\test-customer-service-api.mjs
node --check blog-worker.js
node --check blog-notifications.js
node --check blog-customer-service.js
node --check blog-public/script.js
```

Expected: every command exits 0.

- [ ] **Step 3: Produce and inspect a deployment dry run**

Run:

```powershell
npx wrangler deploy --dry-run --outdir .wrangler-dryrun-user-notifications --config wrangler.blog.toml
```

Expected: Worker bundles successfully with D1, KV, R2 and `CHAT_HUB` bindings intact.

- [ ] **Step 4: Record rollback version and apply the remote migration**

Run:

```powershell
npx wrangler deployments list --config wrangler.blog.toml
npx wrangler d1 migrations list BLOG_DB --remote --config wrangler.blog.toml
npx wrangler d1 migrations apply BLOG_DB --remote --config wrangler.blog.toml
```

Record the current production version before deploying. Expected: migration 0007 succeeds remotely.

- [ ] **Step 5: Deploy production**

Run:

```powershell
npx wrangler deploy --config wrangler.blog.toml
```

Expected: a new production version is created for `blog.858846.xyz`.

- [ ] **Step 6: Verify production behavior**

Verify at `https://blog.858846.xyz` using two non-admin test users and the existing admin session:

1. Unauthenticated nav has no notification entry and `/notifications` redirects to login.
2. Authenticated nav shows the bell with no layout jump.
3. A reply from user B creates one message for user A; self-reply creates none.
4. A comment on A's published submission creates an article-comment message for A.
5. Approval and rejection each create the correct message and destination.
6. An admin customer-service reply creates one message and opens the chat.
7. Single read and read-all update both list state and badge.
8. Chinese/English, light/dark, 390×844 and 1366×768 layouts remain usable.

If any critical API isolation, event delivery or navigation check fails, roll back the Worker to the recorded version. Do not roll back the additive D1 migration because old code ignores the new table and nullable column.

- [ ] **Step 7: Commit final integration and record versions**

```powershell
git add blog-worker.js blog-notifications.js blog-customer-service.js blog-public/script.js blog-public/styles.css migrations/blog_0007_user_notifications.sql tools/test-blog-notifications.mjs tools/test-blog-comment-replies.mjs tools/test-blog-customer-service.mjs tools/test-blog-system-i18n.mjs
git commit -m "feat: ship user notification center"
```

Record the new production version and the previous rollback version in the completion report.
