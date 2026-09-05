# User Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add editable private account profiles and limited public user profiles, with avatar uploads and comment-author links.

**Architecture:** Extend `blog_users` with profile fields, store avatar bytes in the existing `BLOG_MEDIA` R2 bucket, and keep validation and DTO construction in a focused `blog-user-profiles.js` module. `blog-worker.js` owns authenticated/public routes and HTML shells; `blog-public/script.js` owns edit state, uploads, translations, and comment profile links.

**Tech Stack:** Cloudflare Workers, D1, R2, vanilla JavaScript, HTML/CSS, Wrangler 4, Node contract tests, Playwright CLI.

---

## File map

- Create `migrations/blog_0008_user_profiles.sql`: add nullable profile columns and an index used by public profile lookup.
- Create `blog-user-profiles.js`: normalization, validation, avatar type detection, and private/public DTO helpers.
- Create `tools/test-blog-user-profile.mjs`: contract tests for schema, routes, privacy, UI hooks, and comment links.
- Modify `blog-worker.js`: account/public pages, profile APIs, avatar storage/serving, routing, navigation entry, comment payload user IDs, and cache keys.
- Modify `blog-public/script.js`: bilingual copy, profile loading/editing/upload behavior, and comment avatar rendering.
- Modify `blog-public/styles.css`: responsive account cards, edit form, public profile, avatar, and comment-author link styles.
- Modify cache-key assertions in `tools/test-blog-admin-fluid-width.mjs`, `tools/test-blog-auth-fluid-width.mjs`, `tools/test-blog-system-i18n.mjs`, and `tools/test-blog-user-pages-nav-width.mjs`.

### Task 1: Profile schema and pure validation module

**Files:**
- Create: `migrations/blog_0008_user_profiles.sql`
- Create: `blog-user-profiles.js`
- Create: `tools/test-blog-user-profile.mjs`

- [ ] **Step 1: Write failing schema and validation tests**

Add assertions that require `avatar_key`, `avatar_mime_type`, `bio`, and `updated_at`, plus pure validation behavior:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateProfileInput, detectAvatarType } from '../blog-user-profiles.js';

const migration = readFileSync(new URL('../migrations/blog_0008_user_profiles.sql', import.meta.url), 'utf8');
assert.match(migration, /ALTER TABLE blog_users ADD COLUMN avatar_key TEXT/);
assert.match(migration, /ALTER TABLE blog_users ADD COLUMN avatar_mime_type TEXT/);
assert.match(migration, /ALTER TABLE blog_users ADD COLUMN bio TEXT/);
assert.deepEqual(validateProfileInput({ displayName: ' Rowan ', bio: ' Notes ' }), {
  ok: true, displayName: 'Rowan', bio: 'Notes'
});
assert.equal(validateProfileInput({ displayName: '', bio: '' }).error, 'DISPLAY_NAME_REQUIRED');
assert.equal(validateProfileInput({ displayName: 'x'.repeat(41), bio: '' }).error, 'DISPLAY_NAME_TOO_LONG');
assert.equal(validateProfileInput({ displayName: 'Rowan', bio: 'x'.repeat(301) }).error, 'BIO_TOO_LONG');
assert.equal(detectAvatarType(new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])), 'image/png');
```

- [ ] **Step 2: Run the test and confirm the missing module failure**

Run: `node tools/test-blog-user-profile.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `blog-user-profiles.js`.

- [ ] **Step 3: Add the migration**

```sql
ALTER TABLE blog_users ADD COLUMN avatar_key TEXT;
ALTER TABLE blog_users ADD COLUMN avatar_mime_type TEXT;
ALTER TABLE blog_users ADD COLUMN bio TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_users ADD COLUMN updated_at TEXT;
CREATE INDEX IF NOT EXISTS idx_blog_users_public_profile ON blog_users(id, display_name);
```

- [ ] **Step 4: Implement pure profile helpers**

Export `PROFILE_LIMITS`, `validateProfileInput`, `detectAvatarType`, `privateProfileDto`, and `publicProfileDto`. Detect PNG, JPEG, and WebP from file signatures, not extensions. The DTOs must whitelist fields explicitly; the private DTO adds `email` and `createdAt`, while the public DTO does not.

```js
export const PROFILE_LIMITS = { displayName: 40, bio: 300, avatarBytes: 5 * 1024 * 1024 };

export function validateProfileInput(input) {
  const displayName = typeof input?.displayName === 'string' ? input.displayName.trim() : '';
  const bio = typeof input?.bio === 'string' ? input.bio.trim() : '';
  if (!displayName) return { ok: false, error: 'DISPLAY_NAME_REQUIRED', field: 'displayName' };
  if ([...displayName].length > PROFILE_LIMITS.displayName) return { ok: false, error: 'DISPLAY_NAME_TOO_LONG', field: 'displayName' };
  if ([...bio].length > PROFILE_LIMITS.bio) return { ok: false, error: 'BIO_TOO_LONG', field: 'bio' };
  return { ok: true, displayName, bio };
}
```

- [ ] **Step 5: Run the focused test**

Run: `node tools/test-blog-user-profile.mjs`

Expected: PASS for schema and pure helper assertions.

- [ ] **Step 6: Commit**

```powershell
git add migrations/blog_0008_user_profiles.sql blog-user-profiles.js tools/test-blog-user-profile.mjs
git commit -m "feat: add user profile schema and validation"
```

### Task 2: Private/public profile and avatar APIs

**Files:**
- Modify: `blog-worker.js`
- Modify: `tools/test-blog-user-profile.mjs`

- [ ] **Step 1: Add failing API contract assertions**

Require handlers and routes for `GET/PUT /api/user/profile`, `POST /api/user/avatar`, `GET /api/users/:id/profile`, and `GET /media/user-avatar/:id`. Assert that private DTO use follows `requireUser`, mutations call `requireSameOrigin`, and public output is constructed only through `publicProfileDto`.

- [ ] **Step 2: Run the focused test and confirm route assertions fail**

Run: `node tools/test-blog-user-profile.mjs`

Expected: FAIL at the first missing profile route.

- [ ] **Step 3: Implement profile queries and article count**

Use one D1 query for each view:

```sql
SELECT user.id, user.email, user.display_name, user.avatar_key,
       user.avatar_mime_type, user.bio, user.created_at, user.updated_at,
       COUNT(article.id) AS published_count
FROM blog_users AS user
LEFT JOIN blog_user_articles AS article
  ON article.user_id = user.id AND article.status = 'published'
WHERE user.id = ?
GROUP BY user.id
```

The private GET binds `auth.user.id`; the public GET binds the decoded path ID. Return `404 PROFILE_NOT_FOUND` for a missing public user.

- [ ] **Step 4: Implement safe profile updates**

Parse JSON with the existing bounded JSON pattern, call `validateProfileInput`, and execute:

```sql
UPDATE blog_users
SET display_name = ?, bio = ?, updated_at = ?
WHERE id = ?
```

Return the refreshed private DTO. Do not accept email, user ID, article count, avatar key, password, or timestamps from the request body.

- [ ] **Step 5: Implement avatar replacement**

Require `multipart/form-data`, a single `avatar` file, content length at most 5 MB plus bounded multipart overhead, and signature detection. Write to `user-avatars/<user-id>/<uuid>.<ext>`, update `avatar_key`, `avatar_mime_type`, and `updated_at`, then delete the previous key after the database update succeeds. If the database update fails, delete the newly written object before returning an error.

- [ ] **Step 6: Implement avatar serving**

Resolve the current key by public user ID, load it from `BLOG_MEDIA`, and return bytes with the stored MIME type, `X-Content-Type-Options: nosniff`, and `Cache-Control: public, max-age=300`. Return a small SVG initials fallback only from the HTML/CSS layer; the media endpoint returns 404 when no avatar exists.

- [ ] **Step 7: Run focused and security tests**

Run:

```powershell
node tools/test-blog-user-profile.mjs
node tools/test-blog-security-headers.mjs
```

Expected: both PASS.

- [ ] **Step 8: Commit**

```powershell
git add blog-worker.js tools/test-blog-user-profile.mjs
git commit -m "feat: add profile and avatar APIs"
```

### Task 3: Account and public profile pages

**Files:**
- Modify: `blog-worker.js`
- Modify: `blog-public/styles.css`
- Modify: `tools/test-blog-user-profile.mjs`

- [ ] **Step 1: Add failing page contract assertions**

Require `/account` and `/user/:id` route handlers, stable hooks (`data-account-page`, `data-profile-edit`, `data-profile-form`, `data-public-profile-page`), and the logged-in menu link labeled with `data-i18n="nav.account"`.

- [ ] **Step 2: Run the focused test and confirm page assertions fail**

Run: `node tools/test-blog-user-profile.mjs`

Expected: FAIL at the first missing page hook.

- [ ] **Step 3: Add account menu entry and private page shell**

Insert “我的账户” before “发布文章” in the existing account dropdown. Render `/account` with the shared navigation/footer and a loading profile card containing stable elements for avatar, display name, email, bio, published count, joined date, edit button, form fields, status text, cancel, and save.

- [ ] **Step 4: Add public page shell**

Render `/user/:id` with `data-profile-user-id` and only public placeholders: avatar, display name, bio, and published count. Do not place an email, joined date, or edit control in its HTML.

- [ ] **Step 5: Add responsive styles**

Desktop uses a two-column avatar/details card; `@media (max-width: 720px)` stacks it vertically. Reuse existing surface, line, ink, blue, and glass variables. Keep the edit button at least 40×40 px at the top right; style empty bio text, upload preview, form errors, success state, and dark mode.

- [ ] **Step 6: Run focused and layout contracts**

Run:

```powershell
node tools/test-blog-user-profile.mjs
node tools/test-blog-user-pages-nav-width.mjs
node tools/test-blog-system-i18n.mjs
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```powershell
git add blog-worker.js blog-public/styles.css tools/test-blog-user-profile.mjs tools/test-blog-user-pages-nav-width.mjs tools/test-blog-system-i18n.mjs
git commit -m "feat: add private and public profile pages"
```

### Task 4: Profile editor and bilingual client behavior

**Files:**
- Modify: `blog-public/script.js`
- Modify: `tools/test-blog-user-profile.mjs`

- [ ] **Step 1: Add failing UI behavior assertions**

Require profile translation keys in Chinese and English, `initAccountProfile`, `initPublicProfile`, JSON profile save, multipart avatar upload, character counters, cancel behavior, retained form values on failure, and session refresh after save.

- [ ] **Step 2: Run the focused test and confirm client assertions fail**

Run: `node tools/test-blog-user-profile.mjs`

Expected: FAIL at the first missing client initializer.

- [ ] **Step 3: Add translations**

Add exact Chinese/English strings for account title, edit, upload, no avatar, no bio, display name, email, bio, published articles, joined date, cancel, save, saving, saved, upload validation, load failure, save failure, and public user not found.

- [ ] **Step 4: Implement private account state**

`initAccountProfile()` fetches `/api/user/profile`; a 401 redirects to `/login?returnTo=%2Faccount`. Render view state from the response. Edit copies saved data into inputs; cancel restores saved data and clears transient status. Save sends only `{ displayName, bio }`, disables controls while pending, and preserves current inputs on failure.

- [ ] **Step 5: Implement avatar preview and upload**

Validate MIME and 5 MB size before upload, show an object URL preview, POST `FormData` to `/api/user/avatar`, revoke preview URLs, render the returned avatar URL with a cache query, and call `fetchUserSession()` so navigation reflects the updated display name/avatar.

- [ ] **Step 6: Implement public profile loading**

`initPublicProfile()` reads `data-profile-user-id`, fetches the public endpoint, renders only public fields, and displays the localized not-found state for 404.

- [ ] **Step 7: Run focused and i18n tests**

Run:

```powershell
node tools/test-blog-user-profile.mjs
node tools/test-blog-system-i18n.mjs
```

Expected: both PASS.

- [ ] **Step 8: Commit**

```powershell
git add blog-public/script.js tools/test-blog-user-profile.mjs tools/test-blog-system-i18n.mjs
git commit -m "feat: add profile editing interactions"
```

### Task 5: Comment avatars and public profile navigation

**Files:**
- Modify: `blog-worker.js`
- Modify: `blog-public/script.js`
- Modify: `blog-public/styles.css`
- Modify: `tools/test-blog-user-profile.mjs`

- [ ] **Step 1: Add failing comment profile assertions**

Require comment list queries to return `user_id`, DTOs to expose `userId`, and `renderCommentCard` to create `/user/<encoded-id>` links only when `userId` exists. Require both top-level comments and replies to use the same avatar helper.

- [ ] **Step 2: Run the focused test and confirm comment assertions fail**

Run: `node tools/test-blog-user-profile.mjs`

Expected: FAIL at the first missing comment profile contract.

- [ ] **Step 3: Return comment user identity**

Keep anonymous comments unchanged. For authenticated comments, include `user_id` in database selects and return `userId` in the JSON DTO. Never return author email.

- [ ] **Step 4: Render avatar/profile links**

Create one client helper that returns either an anchor to `/user/<id>` with `/media/user-avatar/<id>` and an initials fallback, or a non-link initials avatar for anonymous comments. Place the author name inside the same link when a user ID exists. Keep reply buttons separate so profile navigation does not trigger a reply.

- [ ] **Step 5: Style comment identity**

Add a compact circular avatar, aligned author/meta column, visible keyboard focus, and dark-mode borders. Use `onerror` to hide a failed image and reveal initials without changing layout.

- [ ] **Step 6: Run comment and profile tests**

Run:

```powershell
node tools/test-blog-user-profile.mjs
node tools/test-blog-comment-replies.mjs
```

Expected: both PASS.

- [ ] **Step 7: Commit**

```powershell
git add blog-worker.js blog-public/script.js blog-public/styles.css tools/test-blog-user-profile.mjs
git commit -m "feat: link comment authors to public profiles"
```

### Task 6: Migration, end-to-end verification, deployment, and push

**Files:**
- Modify: `blog-worker.js`
- Modify: cache-key assertion files listed in the file map

- [ ] **Step 1: Update shared asset cache key**

Replace the current shared `styles.css?v=` and `script.js?v=` key in `blog-worker.js` and all matching assertions with `20260905-user-profiles`.

- [ ] **Step 2: Run the full focused regression set**

Run:

```powershell
node tools/test-blog-user-profile.mjs
node tools/test-blog-comment-replies.mjs
node tools/test-blog-system-i18n.mjs
node tools/test-blog-admin-fluid-width.mjs
node tools/test-blog-auth-fluid-width.mjs
node tools/test-blog-user-pages-nav-width.mjs
node tools/test-blog-security-headers.mjs
git diff --check
```

Expected: all tests exit 0 and `git diff --check` reports no errors.

- [ ] **Step 3: Apply the D1 migration remotely**

Load `CLOUDFLARE_API_TOKEN_LUOWENHUI` from the Windows user environment without printing it, then run:

```powershell
npx --offline wrangler d1 migrations apply resume-blog-comments --remote --config wrangler.blog.toml
```

Expected: `blog_0008_user_profiles.sql` applied successfully. Query `PRAGMA table_info(blog_users)` remotely and confirm all four columns exist.

- [ ] **Step 4: Validate the Worker bundle**

Run:

```powershell
npx --offline wrangler deploy --config wrangler.blog.toml --dry-run --outdir .wrangler-dryrun-user-profiles
```

Expected: bundle completes and lists `BLOG_DB`, `BLOG_MEDIA`, and `ASSETS` bindings.

- [ ] **Step 5: Run local browser flows**

Use Playwright CLI at 390×844 and 1440×1000. Verify unauthenticated `/account` redirects, an authenticated fixture can edit/cancel/save, invalid avatar feedback preserves text, public profile contains no email, comment avatar opens the public profile, and light/dark plus Chinese/English layouts remain usable.

- [ ] **Step 6: Deploy production**

Run:

```powershell
npx --offline wrangler deploy --config wrangler.blog.toml
```

Expected: deployment reports `blog.858846.xyz` triggers and a new version ID.

- [ ] **Step 7: Verify production**

In a fresh Playwright session, log in through the existing account flow, open `/account`, save a reversible bio change, verify the account card and menu update, restore the prior bio, open a public profile from a comment, and verify the public DOM contains no email field. Confirm the loaded asset URL contains `20260905-user-profiles`.

- [ ] **Step 8: Commit and push the completed implementation**

```powershell
git add blog-user-profiles.js migrations/blog_0008_user_profiles.sql blog-worker.js blog-public/script.js blog-public/styles.css tools/test-blog-user-profile.mjs tools/test-blog-comment-replies.mjs tools/test-blog-system-i18n.mjs tools/test-blog-admin-fluid-width.mjs tools/test-blog-auth-fluid-width.mjs tools/test-blog-user-pages-nav-width.mjs
git commit -m "feat: add editable user profiles"
git push origin main
```

Expected: push advances `origin/main` to the implementation commit without staging unrelated working-tree files.
