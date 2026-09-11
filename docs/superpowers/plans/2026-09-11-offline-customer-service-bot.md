# Offline Customer Service Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an immediate DeepSeek-powered reply to `blog.858846.xyz` only while no administrator is connected to the customer-service console.

**Architecture:** Keep D1 as the message source of truth and the existing `CustomerServiceHub` Durable Object as the presence authority. A visitor message returns immediately, then `ctx.waitUntil()` checks admin presence, calls the independent DeepSeek configuration, checks presence again, and inserts one idempotent bot reply through the existing broadcast path.

**Tech Stack:** Cloudflare Workers, Durable Objects WebSockets, D1, vanilla JavaScript, OpenAI-compatible DeepSeek Chat Completions, Node contract tests, Wrangler.

---

## File map

- Modify `blog-customer-service.js`: presence query, bot prompt/client, asynchronous scheduler, idempotent bot insertion.
- Modify `blog-public/customer-service.js`: offline robot copy and visitor-side robot sender label.
- Modify `blog-public/customer-service-admin.js`: distinguish robot and human support messages.
- Modify `blog-public/customer-service.css`: compact robot identity badge in both themes and mobile layout.
- Modify `wrangler.blog.toml`: non-secret DeepSeek customer-service variables.
- Modify `tools/test-blog-customer-service.mjs`: static contracts for configuration, identity labels, and routing.
- Create `tools/test-blog-customer-service-bot.mjs`: behavioral tests for presence, model calls, idempotency, cancellation, and failure fallback.
- Modify `docs/customer-service.md`: document runtime behavior and secret setup.

### Task 1: Lock down bot configuration and pure contracts

**Files:**
- Modify: `wrangler.blog.toml`
- Modify: `blog-customer-service.js`
- Create: `tools/test-blog-customer-service-bot.mjs`

- [ ] **Step 1: Write the failing configuration and pure-function test**

Create `tools/test-blog-customer-service-bot.mjs` with imports rewritten in the same data-URL style as the existing customer-service test, then assert:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../blog-customer-service.js', import.meta.url), 'utf8')
  .replace("import { createNotification } from './blog-notifications.js';", 'const createNotification = async () => null;');
const chat = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const wrangler = readFileSync(new URL('../wrangler.blog.toml', import.meta.url), 'utf8');

assert.equal(chat.BOT_SENDER_ID, 'customer-service-bot');
assert.equal(chat.botClientMessageId('visitor-message-1'), 'bot:visitor-message-1');
assert.deepEqual(chat.buildBotModelMessages([
  { sender_type: 'visitor', sender_id: 'user-1', content: '怎么修改密码？' },
  { sender_type: 'admin', sender_id: 'admin-1', content: '进入我的账户。' }
]).slice(-2), [
  { role: 'user', content: '怎么修改密码？' },
  { role: 'assistant', content: '进入我的账户。' }
]);
assert.match(wrangler, /CUSTOMER_SERVICE_AI_MODEL\s*=\s*"deepseek-flash"/);
assert.match(wrangler, /CUSTOMER_SERVICE_AI_BASE_URL\s*=\s*"https:\/\/api\.deepseek\.com"/);
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node tools/test-blog-customer-service-bot.mjs`

Expected: FAIL because `BOT_SENDER_ID`, `botClientMessageId`, and `buildBotModelMessages` do not exist.

- [ ] **Step 3: Add the public bot constants and context builder**

Add to `blog-customer-service.js`:

```js
export const BOT_SENDER_ID = 'customer-service-bot';
export const BOT_HISTORY_LIMIT = 12;
export const BOT_HISTORY_CODE_POINTS = 12000;
export const botClientMessageId = messageId => `bot:${String(messageId).slice(0, 76)}`;

export function buildBotModelMessages(rows) {
  const system = `你是 Rowan Notes 客服机器人。只回答 blog.858846.xyz 的页面导航、文章、搜索、收藏、评论、账号、密码、投稿、审核、通知和在线客服使用问题。不得回答站外一般知识，不得猜测账户数据或管理员操作；无法确认时请说明服务范围并建议等待管理员。输出简洁中文纯文本。`;
  const history = rows.slice(-BOT_HISTORY_LIMIT).map(row => ({
    role: row.sender_type === 'visitor' ? 'user' : 'assistant',
    content: Array.from(String(row.content || '')).slice(0, 2000).join('')
  }));
  while (history.reduce((sum, item) => sum + Array.from(item.content).length, 0) > BOT_HISTORY_CODE_POINTS) history.shift();
  return [{ role: 'system', content: system }, ...history];
}
```

- [ ] **Step 4: Add non-secret Wrangler variables**

Replace the empty `[vars]` section in `wrangler.blog.toml` with:

```toml
[vars]
CUSTOMER_SERVICE_AI_BASE_URL = "https://api.deepseek.com"
CUSTOMER_SERVICE_AI_ENDPOINT = "/chat/completions"
CUSTOMER_SERVICE_AI_MODEL = "deepseek-flash"
```

- [ ] **Step 5: Run tests and commit**

Run: `node tools/test-blog-customer-service-bot.mjs && node tools/test-blog-customer-service.mjs`

Expected: both print their success messages.

Commit only these files:

```powershell
git add -- blog-customer-service.js wrangler.blog.toml tools/test-blog-customer-service-bot.mjs
git commit -m "test: define offline customer bot contracts"
```

### Task 2: Add authoritative presence checks and asynchronous bot replies

**Files:**
- Modify: `blog-customer-service.js`
- Modify: `tools/test-blog-customer-service-bot.mjs`

- [ ] **Step 1: Add failing behavioral tests with fake D1, hub, fetch, and waitUntil**

Extend the bot test with a harness whose `env.CHAT_HUB` returns `{ online: true|false }` from `/admin-presence`, whose fake D1 records inserts, and whose injected `fetch` returns a DeepSeek-shaped response:

```js
const modelFetch = async (_url, init) => {
  const body = JSON.parse(init.body);
  assert.equal(body.model, 'deepseek-flash');
  assert.deepEqual(body.thinking, { type: 'disabled' });
  return Response.json({ choices: [{ message: { content: '您可以在“我的账户”中修改密码。' } }] });
};

await chat.runOfflineBotReply(envOffline, session.id, visitorMessage.id, { fetch: modelFetch });
assert.equal(inserted.filter(row => row.sender_id === chat.BOT_SENDER_ID).length, 1);

await chat.runOfflineBotReply(envOnline, session.id, visitorMessage.id, { fetch: modelFetch });
assert.equal(inserted.filter(row => row.sender_id === chat.BOT_SENDER_ID).length, 0);
```

Add cases where the second presence response becomes online, the model returns HTTP 429, and the same trigger runs twice. Expected outcomes: cancel before insert, one fixed failure message, and one bot row respectively.

- [ ] **Step 2: Run the behavioral test and verify it fails**

Run: `node tools/test-blog-customer-service-bot.mjs`

Expected: FAIL because `runOfflineBotReply` is undefined.

- [ ] **Step 3: Add the Durable Object presence endpoint**

In `CustomerServiceHub.fetch`, before `/connect`, add:

```js
if (u.pathname === '/admin-presence') {
  return reply({ online: this.adminOnline() });
}
```

Add a fail-closed helper:

```js
async function adminIsOnline(env) {
  if (!env.CHAT_HUB) return true;
  try {
    const response = await hub(env, '/admin-presence', {});
    if (!response?.ok) return true;
    return Boolean((await response.json()).online);
  } catch (error) {
    console.warn('customer service presence check failed', { message: String(error?.message || error).slice(0, 160) });
    return true;
  }
}
```

- [ ] **Step 4: Add the DeepSeek client**

Add a function that never logs message text or credentials:

```js
async function requestBotReply(env, history, fetchImpl = fetch) {
  if (!env.CUSTOMER_SERVICE_AI_API_KEY) throw new Error('BOT_KEY_MISSING');
  const base = String(env.CUSTOMER_SERVICE_AI_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
  const endpoint = String(env.CUSTOMER_SERVICE_AI_ENDPOINT || '/chat/completions');
  const response = await fetchImpl(`${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.CUSTOMER_SERVICE_AI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.CUSTOMER_SERVICE_AI_MODEL || 'deepseek-flash',
      messages: buildBotModelMessages(history),
      thinking: { type: 'disabled' },
      stream: false,
      max_tokens: 400,
      temperature: 0.2
    })
  });
  if (!response.ok) throw new Error(`BOT_HTTP_${response.status}`);
  const payload = await response.json();
  const content = normalizeChatMessage(payload?.choices?.[0]?.message?.content).value;
  if (!content) throw new Error('BOT_EMPTY_CONTENT');
  return content;
}
```

- [ ] **Step 5: Add idempotent insertion and the exported scheduler**

Implement `runOfflineBotReply(env, sessionId, triggerMessageId, options = {})` to:

```js
const fallback = '客服机器人暂时无法回复，管理员上线后会继续处理。';
const trigger = await env.BLOG_DB.prepare("SELECT * FROM blog_chat_messages WHERE id=? AND session_id=? AND sender_type='visitor'").bind(triggerMessageId, sessionId).first();
if (!trigger || await adminIsOnline(env)) return { skipped: true };
const existing = await env.BLOG_DB.prepare('SELECT id FROM blog_chat_messages WHERE session_id=? AND sender_type=? AND client_message_id=?').bind(sessionId, 'admin', botClientMessageId(triggerMessageId)).first();
if (existing) return { duplicate: true };
const history = (await env.BLOG_DB.prepare('SELECT sender_type,sender_id,content FROM blog_chat_messages WHERE session_id=? ORDER BY created_at DESC,id DESC LIMIT ?').bind(sessionId, BOT_HISTORY_LIMIT).all()).results.reverse();
let content;
try { content = await requestBotReply(env, history, options.fetch || fetch); }
catch (error) { console.warn('customer service bot failed', { message: String(error?.message || error).slice(0, 160) }); content = fallback; }
if (await adminIsOnline(env)) return { skipped: true, reason: 'admin-online' };
return insertBotMessageIdempotently(env, sessionId, triggerMessageId, content, options.ctx);
```

The insertion uses `sender_type='admin'`, `sender_id=BOT_SENDER_ID`, and `client_message_id=botClientMessageId(triggerMessageId)`, updates the session preview, broadcasts the existing `message` event, catches only the unique-constraint race, and does not call `createNotification`.

- [ ] **Step 6: Schedule only after a newly inserted visitor message**

Refactor `insertMessage` to return `{ response, message, duplicate }` internally, or add an `onInserted` callback. In the visitor POST route, schedule only when `duplicate !== true`:

```js
const result = await insertMessage(env, s, 'visitor', user?.id || identity.id, b, ctx, { structured: true });
if (!result.duplicate) ctx?.waitUntil?.(runOfflineBotReply(env, s.id, result.message.id, { ctx }));
return result.response;
```

- [ ] **Step 7: Run behavioral and regression tests, then commit**

Run:

```powershell
node tools/test-blog-customer-service-bot.mjs
node tools/test-blog-customer-service.mjs
node tools/test-blog-notifications.mjs
```

Expected: all pass; model mock called only for offline cases.

```powershell
git add -- blog-customer-service.js tools/test-blog-customer-service-bot.mjs
git commit -m "feat: add offline DeepSeek customer replies"
```

### Task 3: Identify robot messages in visitor and admin interfaces

**Files:**
- Modify: `blog-public/customer-service.js`
- Modify: `blog-public/customer-service-admin.js`
- Modify: `blog-public/customer-service.css`
- Modify: `tools/test-blog-customer-service.mjs`

- [ ] **Step 1: Write failing interface contract tests**

Add assertions:

```js
assert.match(visitorClientSource, /sender_id === 'customer-service-bot'[\s\S]*客服机器人/);
assert.match(adminClientSource, /sender_id === 'customer-service-bot'[\s\S]*客服机器人/);
assert.match(visitorClientSource, /当前由客服机器人即时回复/);
assert.match(visitorStyles, /\.cs-bot-label/);
```

- [ ] **Step 2: Run the interface test and verify it fails**

Run: `node tools/test-blog-customer-service.mjs`

Expected: FAIL on the missing robot identity contracts.

- [ ] **Step 3: Add localized offline copy and message identity**

In visitor copy, change offline text to `客服机器人在线` and notice to `人工客服离线，当前由客服机器人即时回复。`; add equivalent English copy. In the message renderer derive:

```js
const isBot = message.sender_type === 'admin' && message.sender_id === 'customer-service-bot';
const senderLabel = isBot ? tr('botName') : message.sender_type === 'admin' ? tr('supportName') : state.session?.visitor_name;
```

Append `<span class="cs-bot-label">机器人</span>` using DOM nodes and `textContent`, never `innerHTML` with model content.

In the admin renderer use the same sender-ID check and label bot replies as `客服机器人`.

- [ ] **Step 4: Add compact theme-safe badge styles**

Add:

```css
.cs-bot-label{display:inline-flex;align-items:center;margin-left:.35rem;padding:.08rem .35rem;border-radius:999px;background:color-mix(in srgb,var(--btn-primary-bg) 14%,transparent);color:var(--btn-primary-bg);font-size:.64rem;font-weight:800;line-height:1.35}
@media (max-width:640px){.cs-bot-label{font-size:.58rem;padding:.06rem .28rem}}
```

- [ ] **Step 5: Bump customer-service asset cache keys**

Update the `customer-service.css` and `customer-service.js` query versions in `blog-worker.js` to `20260911-offline-bot`, and the admin script query version to the same value.

- [ ] **Step 6: Run tests and commit**

Run: `node tools/test-blog-customer-service.mjs && node tools/test-blog-customer-service-bot.mjs`

```powershell
git add -- blog-public/customer-service.js blog-public/customer-service-admin.js blog-public/customer-service.css blog-worker.js tools/test-blog-customer-service.mjs
git commit -m "feat: label offline customer service bot"
```

### Task 4: Document and configure the independent secret

**Files:**
- Modify: `docs/customer-service.md`
- Modify: `.dev.vars.example`

- [ ] **Step 1: Add deployment documentation**

Document that the Key must never be pasted into chat or committed, and provide:

```powershell
npx wrangler secret put CUSTOMER_SERVICE_AI_API_KEY --config wrangler.blog.toml
```

Document the three non-secret variables, the `deepseek-flash` model, `thinking.disabled`, offline-only behavior, two presence checks, and the fixed failure reply.

- [ ] **Step 2: Add the local placeholder**

Add only a blank placeholder to `.dev.vars.example`:

```dotenv
CUSTOMER_SERVICE_AI_API_KEY=
```

- [ ] **Step 3: Verify no credential-like value is tracked**

Run:

```powershell
git diff --check
git diff -- docs/customer-service.md .dev.vars.example | Select-String -Pattern 'sk-[A-Za-z0-9]+'
```

Expected: no secret matches.

- [ ] **Step 4: Commit documentation**

```powershell
git add -- docs/customer-service.md .dev.vars.example
git commit -m "docs: configure customer service AI secret"
```

### Task 5: Deploy and verify production behavior

**Files:**
- Verify: `blog-worker.js`, `blog-customer-service.js`, `blog-public/customer-service.js`, `blog-public/customer-service-admin.js`, `wrangler.blog.toml`

- [ ] **Step 1: Run the full focused suite and syntax checks**

Run:

```powershell
node --check blog-worker.js
node --check blog-customer-service.js
node --check blog-public/customer-service.js
node --check blog-public/customer-service-admin.js
node tools/test-blog-customer-service-bot.mjs
node tools/test-blog-customer-service.mjs
node tools/test-blog-customer-service-light-theme.mjs
node tools/test-blog-customer-service-theme-toggle.mjs
node tools/test-blog-customer-service-fluid-width.mjs
```

Expected: syntax checks exit 0 and every test prints its success message.

- [ ] **Step 2: Perform a Wrangler dry run**

Run with the established user-scoped Cloudflare token environment and no proxy:

```powershell
npx wrangler deploy --config wrangler.blog.toml --dry-run --outdir .wrangler-dryrun-customer-service-bot
```

Expected: assets, D1, R2, KV, and `CHAT_HUB` bindings are listed; dry run exits successfully.

- [ ] **Step 3: Configure the independent production secret interactively**

Run:

```powershell
npx wrangler secret put CUSTOMER_SERVICE_AI_API_KEY --config wrangler.blog.toml
```

Paste the second DeepSeek Key only into Wrangler's hidden prompt. Confirm with `npx wrangler secret list --config wrangler.blog.toml`; expected output contains the secret name but never its value.

- [ ] **Step 4: Deploy the blog worker**

Run: `npx wrangler deploy --config wrangler.blog.toml`

Expected: the custom domain and wildcard route both deploy to the new Worker version.

- [ ] **Step 5: Verify offline robot behavior in a real browser**

With no admin customer-service page open, sign in as a normal blog account, open the chat, and send `如何修改账户密码？`. Expected within a few seconds:

- visitor message appears immediately;
- status says the robot is responding while human support is offline;
- exactly one `客服机器人` message gives a site-scoped answer;
- DeepSeek failures, if any, show the fixed safe fallback rather than losing the visitor message.

- [ ] **Step 6: Verify online human takeover in a second browser context**

Open `/admin/customer-service` and wait for the WebSocket to connect. Send a unique visitor message from the first context and wait at least 10 seconds. Expected: no bot message is added; the administrator can reply normally and the visitor receives the human reply in real time.

- [ ] **Step 7: Verify scope refusal, idempotency, responsive layout, and logs**

Offline again, send an unrelated general-knowledge question; expected a concise scope refusal. Retry the same HTTP message ID; expected one bot reply. Inspect at desktop width and 390px mobile width in light and dark modes. Tail the Worker during one bot request; expected no Key, Cookie, full message, or full model response in logs.

- [ ] **Step 8: Record verification and final commit**

Update `docs/customer-service.md` with the verified production date and behavior, then:

```powershell
git add -- docs/customer-service.md
git commit -m "docs: record offline support bot verification"
```
