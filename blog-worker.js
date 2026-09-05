// Blog Worker for blog.858846.xyz
// Serves articles from KV, handles API, RSS, comments, admin, static assets

import {
  ARTICLE_LIMITS,
  validateSubmission,
  canUserEditSubmission,
  detectImageType,
  buildPublishedArticle
} from './blog-submissions.js';
import { IMPORTED_ARTICLES } from './blog-imported-articles.js';
import { handleCustomerServiceRequest, CustomerServiceHub } from './blog-customer-service.js';
import {
  createNotification,
  listNotifications,
  unreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead
} from './blog-notifications.js';
export { CustomerServiceHub };

const ADMIN_COOKIE_NAME = 'blog_admin_session';
const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours
const USER_COOKIE_NAME = 'blog_user_session';
const USER_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const USER_ARTICLE_JSON_MAX_BYTES = 256 * 1024;
const USER_ARTICLE_MULTIPART_OVERHEAD_BYTES = 256 * 1024;
const PASSWORD_HASH_ITERATIONS = 100000;
let blogCommentsSchemaReady = false;

const SEED_ARTICLES = [
  ...IMPORTED_ARTICLES,
  {
    title: '从 OKX 合约记录看一次加密货币交易复盘',
    excerpt: '基于 OKX 实盘合约归档成交记录，复盘 ZK 和 CRV 两次永续合约交易：一次小幅盈利，一次回撤亏损，以及它们提醒我的仓位、节奏和退出纪律。',
    content: `## 从 OKX 合约记录看一次加密货币交易复盘

这篇文章先不写成交易教程，也不把它包装成成功故事。它更像一次把真实合约记录摊开看的复盘：我在 OKX 的实盘永续合约归档成交里，主要留下了两组记录，一组是 ZK-USDT-SWAP，一组是 CRV-USDT-SWAP。

数据来自 OKX live profile 的合约成交历史。当前普通近期成交为空，交割合约成交为空，永续当前持仓为空；真正有内容的是归档永续成交。

![OKX 合约账单摘要](/assets/articles/okx-swap-bill-summary.svg "账单摘要图：脱敏展示 ZK 和 CRV 两组永续合约成交结果，不包含订单号、账户信息或 API 信息。")

### 这次记录里出现的币

- **ZK-USDT-SWAP** - 2026 年 5 月 10 日开多并平多，成交数量合计 53 张，已实现盈亏约 +0.1484 USDT，扣除手续费后约 +0.1414 USDT。
- **CRV-USDT-SWAP** - 2026 年 5 月 14 日开始开多，5 月 15 日到 5 月 18 日分批卖出平多，成交数量合计 2785 张，已实现盈亏约 -75.5772 USDT，扣除手续费后约 -76.2718 USDT。

这组数据很直接：ZK 是一次很小的盈利，CRV 才是真正值得复盘的地方。

### ZK：小仓位的快进快出

ZK 的交易时间很短。买入均价约 0.01866，卖出均价约 0.01894，方向是 long，最后留下的是小额正收益。它说明小仓位、短周期、明确退出的时候，结果至少是可控的。

但这笔交易的意义不在盈利金额。它更像一次测试：判断、入场、离场都很轻，不会因为一次判断失误拖成大问题。对个人交易来说，这种低负担试错反而更健康。

![ZK 合约 K 线复盘](/assets/articles/zk-swap-kline-review.svg "ZK 的 1H K 线复盘：当天开多、当天平多，盈利很小，但交易路径清楚。")

这张图给我的提醒是：小仓位试错的核心不是赚多少，而是动作是否干净。如果入场和离场都能按计划执行，哪怕结果很小，也比没有纪律的大波动更有复盘价值。

### CRV：判断方向后，真正困难的是退出

CRV 的记录更有代表性。5 月 14 日凌晨，我在 0.2716 附近分批买入做多。之后价格没有按预期继续走强，而是逐步下行。5 月 15 日先在 0.2612 附近卖出一部分，5 月 16 日在 0.2387 附近继续卖出，5 月 18 日又在 0.2345、0.2346 和 0.2242 附近平掉剩余仓位。

从数字看，CRV 的问题不是手续费，而是方向判断失败后没有足够早地处理。总手续费不到 1 USDT，主要亏损来自价格从买入均价 0.2716 跌到卖出均价 0.2445 左右。也就是说，真正决定结果的是入场后的处理纪律。

![CRV 合约 K 线复盘](/assets/articles/crv-swap-kline-review.svg "CRV 的 1H K 线复盘：入场后价格没有延续预期，分批退出把亏损拖长，最后形成主要回撤。")

这张图比账单数字更直观：入场后价格曾经有短暂波动，但后续重心持续下移。如果没有提前定义“这个判断到哪里失效”，分批平仓就不是计划，而是被动处理。

### 我从这次记录里看到的问题

第一，合约交易不能只看“我看好这个币”。CRV 也许有叙事、有波动、有反弹想象，但合约仓位面对的是价格路径，不是故事本身。方向对不对很重要，但什么时候承认不对更重要。

第二，分批成交不等于风险管理。CRV 的买入和平仓都是分批完成的，但如果没有明确止损线，分批只是在把一次亏损拉长。真正有效的风控应该在开仓前就决定：错了到哪里退出，亏损最多接受多少。

第三，小盈利和大亏损放在一起看，才知道交易系统是否健康。ZK 赚了约 0.14 USDT，CRV 净亏约 76.27 USDT。这个比例说明，不能让小试错变成大暴露，也不能让一次亏损吞掉很多次小盈利。

### 后面我会怎么改

如果继续做合约，我会把每次开仓前的规则写得更具体：

- 这笔交易是短线还是波段。
- 入场理由是什么，失效条件是什么。
- 单笔最大亏损是多少。
- 如果价格没有按预期走，多久必须重新判断。
- 平仓是一次性退出，还是按明确价位分批退出。

这篇文章不是投资建议，只是我的个人交易复盘。它提醒我：交易经历真正有价值的部分，不是截图里某次盈利，而是亏损之后还能不能把问题写清楚，并把下一次决策变得更干净。`,
    label: 'Crypto',
    img: '',
    permalink: 'okx-swap-crv-zk-review',
    createDate: '2026-07-06T00:00:00.000Z',
    updatedAt: '2026-07-06T00:00:00.000Z'
  },
  {
    title: '从主站开始的 Cloudflare 博客实验',
    excerpt: '这是博客系统的第一篇文章。它运行在 Cloudflare Workers 上，文章索引和正文存储在 KV 中，适合记录技术实践、部署过程和项目复盘。',
    content: `## 从主站开始的 Cloudflare 博客实验

这是博客系统的第一篇文章。它运行在 Cloudflare Workers 上，文章索引和正文存储在 KV 中，适合记录技术实践、部署过程和项目复盘。

### 技术栈

- **Cloudflare Workers** - 处理路由、API 和页面渲染
- **Cloudflare KV** - 存储文章内容
- **Cloudflare D1** - 存储评论数据
- **静态 CSS / JS** - 避免 Tailwind CDN 客户端编译

### 后续计划

后续可以把主站、邮箱系统、反馈系统、技术实验室、D1 数据库和 Workers AI 的实践拆成独立文章。`,
    label: 'Cloudflare',
    img: '',
    permalink: 'cloudflare-blog-start',
    createDate: '2026-06-23T00:00:00.000Z',
    updatedAt: '2026-06-23T00:00:00.000Z'
  },
  {
    title: 'Cloudflare Workers 静态站点部署指南',
    excerpt: '如何使用 Cloudflare Workers + Assets 绑定部署静态网站，包括自定义域名配置、缓存策略和 CI/CD 集成。',
    content: `## Cloudflare Workers 静态站点部署指南

使用 Cloudflare Workers 部署静态网站是目前最高效的免费方案之一。

### 基础配置

\`\`\`toml
name = "my-site"
main = "./worker.js"
compatibility_date = "2025-06-01"

[assets]
directory = "./public"
binding = "ASSETS"
run_worker_first = true
\`\`\`

### 缓存策略

- HTML 页面：\`max-age=0, must-revalidate\`
- CSS / JS：\`max-age=86400, stale-while-revalidate=604800\`
- 图片 / 字体：\`max-age=604800, immutable\``,
    label: 'Cloudflare',
    img: '',
    permalink: 'cloudflare-workers-deploy',
    createDate: '2026-06-24T00:00:00.000Z',
    updatedAt: '2026-06-24T00:00:00.000Z'
  },
  {
    title: 'D1 数据库实践：反馈与评论系统',
    excerpt: '基于 Cloudflare D1 构建轻量级反馈和评论系统，包括表设计、API 设计和防垃圾信息策略。',
    content: `## D1 数据库实践：反馈与评论系统

Cloudflare D1 是边缘 SQLite 数据库，适合轻量级应用场景。

### 表设计

\`\`\`sql
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
\`\`\`

### 防垃圾策略

使用 honeypot 陷阱字段。表单中放置一个对用户不可见但对机器人可见的字段，如果该字段有值则静默接受但不写入数据库。`,
    label: 'Database',
    img: '',
    permalink: 'd1-feedback-system',
    createDate: '2026-06-25T00:00:00.000Z',
    updatedAt: '2026-06-25T00:00:00.000Z'
  },
  {
    title: '把个人展示站部署到 Cloudflare Workers',
    excerpt: '记录从静态页面、出场动画、自定义域名到 Worker 路由的完整上线过程，以及为什么主站内容采用静态优先设计。',
    content: `## 把个人展示站部署到 Cloudflare Workers

个人展示站最初只是一个静态页面集合，后来逐步增加了文章入口、作品页、反馈系统、面试邀约、后台管理、邮箱系统和技术实验室。最终选择 Cloudflare Workers 承接主站路由，是因为它足够轻、部署快，也适合个人站长期维护。

### 静态优先的原因

- **访问稳定** - 首页、作品、简历、文章入口都不需要每次访问数据库。
- **成本可控** - 免费额度主要留给反馈、邀约和匹配报告这些必要写入。
- **部署简单** - HTML、CSS、JS 作为静态资源发布，Worker 只处理路由和 API。
- **后续可扩展** - 博客系统、邮箱系统和实验室可以拆成独立子域。

### Worker 路由分层

主站 Worker 先处理 API，例如反馈提交、面试邀约、岗位匹配记录和后台接口；不是 API 的请求再交给静态资源绑定。这样既能保留静态站的速度，又能在需要保存数据的地方使用 D1。

### 缓存策略

HTML 使用 \`max-age=0, must-revalidate\`，方便页面内容更新后立即生效；CSS 和 JS 使用较长缓存，并通过版本号刷新。图片、字体这类资源可以缓存更久，减少重复请求。

### 拆分博客系统

文章最终迁移到独立博客系统，而不是继续留在主站的二级页面。主站只保留入口，博客系统负责文章索引、正文、RSS、sitemap、评论和收藏，这样内容生产和个人展示不会互相拖累。`,
    label: 'Cloudflare',
    img: '',
    permalink: 'personal-site-cloudflare-workers',
    createDate: '2026-06-26T00:00:00.000Z',
    updatedAt: '2026-06-30T00:00:00.000Z'
  },
  {
    title: 'D1 数据库如何承接反馈、邀约和匹配记录',
    excerpt: '反馈、面试邀约和岗位匹配报告需要长期留存，因此用 D1 形成数据闭环；文章、作品和简历仍保持静态优先。',
    content: `## D1 数据库如何承接反馈、邀约和匹配记录

这个个人站不是把所有内容都放进数据库。真正需要写入和管理的数据，集中在反馈、面试邀约和岗位匹配报告三类；文章、作品、简历这些高频浏览内容则继续静态化。

### 哪些数据进入 D1

- **反馈记录** - 访客评价、分类、评分、联系方式和公开状态。
- **面试邀约** - 公司、岗位、联系人、联系方式、面试时间和处理状态。
- **岗位匹配报告** - JD、匹配分数、亮点、差距、摘要和生成时间。

### 后台管理闭环

后台只对管理员开放。登录后可以查看统计、筛选记录、更新状态、删除无效数据。这样公开页面保持干净，管理动作集中在一个受保护的入口里。

### 为什么文章不依赖 D1

文章阅读频率高，但写入频率低。如果每次打开文章都查询数据库，会浪费免费额度，也增加故障面。文章正文放到博客系统的 KV 中，主站只保留入口，是更适合个人站的方案。

### 表结构设计原则

每张表只保存业务需要的字段，状态字段使用少量可枚举值，时间统一存储为创建时间。后台展示前再格式化日期和标签，避免数据库层承担展示逻辑。`,
    label: 'Database',
    img: '',
    permalink: 'd1-feedback-interview-job-match',
    createDate: '2026-06-27T00:00:00.000Z',
    updatedAt: '2026-06-30T00:00:00.000Z'
  },
  {
    title: 'AI 岗位匹配器的产品路径',
    excerpt: '从 HR 粘贴 JD、自动分析匹配矩阵，到保存报告并进入后台查看，把一次 AI 分析做成完整的小型产品闭环。',
    content: `## AI 岗位匹配器的产品路径

岗位匹配器不是单纯的聊天框，而是一个围绕招聘沟通设计的小工具。目标是让 HR 或访客粘贴岗位 JD 后，快速看到匹配结论、优势、风险和后续沟通方向。

### 入口与输入

首页提供岗位匹配入口。用户粘贴 JD 后，前端先做基础校验，避免空文本或过短内容直接进入模型流程。有效输入才会提交给后端分析。

### 输出结构

报告不只返回一段文字，而是拆成分数、等级、亮点、差距、摘要等字段。这样前端可以稳定展示，后台也能保存结构化记录，后续筛选和复盘更方便。

### 保存与后台查看

每次成功分析都会保存到 D1，后台可以查看历史匹配记录。这个设计让 AI 功能从一次性体验变成可追踪的数据资产，便于之后比较不同 JD 的要求差异。

### 设计取舍

模型输出必须保守、客观，并且只返回 JSON。前端负责排版和交互，后端负责调用、解析和兜底，避免把不稳定的模型文本直接暴露给页面。`,
    label: 'AI Workflow',
    img: '',
    permalink: 'ai-job-matcher-product-loop',
    createDate: '2026-06-28T00:00:00.000Z',
    updatedAt: '2026-06-30T00:00:00.000Z'
  },
  {
    title: '把嵌入式项目写成可阅读的项目复盘',
    excerpt: '把 STM32 门禁系统和四足机器人项目整理成项目文章，从需求、硬件、软件、测试问题到最终成果逐段展开。',
    content: `## 把嵌入式项目写成可阅读的项目复盘

嵌入式项目很容易只停留在图片、演示视频或论文摘要里。真正适合展示的项目文章，需要把需求、硬件、软件、测试过程和问题处理串起来，让读者能看懂项目是如何完成的。

### 文章结构

- **项目背景** - 为什么做这个项目，解决什么问题。
- **硬件组成** - 主控、传感器、执行器、供电和连接方式。
- **软件逻辑** - 状态机、通信协议、控制流程和异常处理。
- **测试过程** - 如何验证功能，遇到哪些问题，如何修复。
- **最终成果** - 实物效果、可改进点和复盘结论。

### 门禁系统的写法

门禁系统适合从使用流程展开：识别、验证、开锁、记录、异常提示。文章里可以把每个模块的输入输出说清楚，再补充硬件接线和测试结果。

### 四足机器人的写法

四足机器人更适合围绕控制和调试展开：舵机控制、步态规划、姿态调整、电源稳定性和机械结构问题。重点不是堆功能，而是写清楚调试过程。

### 从作品到复盘

作品页负责展示结果，博客文章负责解释过程。把两者拆开后，读者既能快速看成果，也能深入了解项目实现。`,
    label: 'Embedded',
    img: '',
    permalink: 'embedded-project-review',
    createDate: '2026-06-29T00:00:00.000Z',
    updatedAt: '2026-06-30T00:00:00.000Z'
  }
];

const ARTICLE_I18N_EN = {
  'okx-swap-crv-zk-review': {
    title: 'A Crypto Trading Review from My OKX Swap History',
    excerpt: 'A review based on OKX live swap archive fills: one small ZK win, one larger CRV drawdown, and what they say about sizing, timing, and exit discipline.'
  },
  'cloudflare-blog-start': {
    title: 'From the Main Site to a Cloudflare Blog Experiment',
    excerpt: 'The first article in this blog system. It runs on Cloudflare Workers, stores the article index and body in KV, and is built for technical notes, deployment logs, and project retrospectives.'
  },
  'cloudflare-workers-deploy': {
    title: 'Cloudflare Workers Static Site Deployment Guide',
    excerpt: 'A practical guide to deploying a static website with Cloudflare Workers and Assets, including custom domains, cache strategy, and CI/CD integration.'
  },
  'd1-feedback-system': {
    title: 'D1 Practice: Feedback and Comment System',
    excerpt: 'A lightweight feedback and comment system built on Cloudflare D1, covering table design, API design, and anti-spam handling.'
  },
  'personal-site-cloudflare-workers': {
    title: 'Deploying a Personal Showcase Site to Cloudflare Workers',
    excerpt: 'A record of the full launch path from static pages and entrance animations to custom domains and Worker routing, with a static-first design for the main site.'
  },
  'd1-feedback-interview-job-match': {
    title: 'Using D1 for Feedback, Interview Invites, and Match Records',
    excerpt: 'Feedback, interview invitations, and job-match reports need durable storage, so D1 becomes the data loop while articles, portfolio pages, and resumes stay static-first.'
  },
  'ai-job-matcher-product-loop': {
    title: 'The Product Path for an AI Job Matcher',
    excerpt: 'From pasting a job description to generating a match matrix, saving the report, and reviewing it in the admin console, this turns one AI analysis into a small product loop.'
  },
  'embedded-project-review': {
    title: 'Turning Embedded Projects into Readable Retrospectives',
    excerpt: 'A project-writing approach for STM32 access control and quadruped robot work, covering requirements, hardware, software, testing issues, and final outcomes.'
  }
};

// ─── Utilities ───────────────────────────────────────────────

function applyBaselineSecurityHeaders(headers) {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  return headers;
}

function jsonResponse(payload, init = {}) {
  const headers = applyBaselineSecurityHeaders(new Headers(init.headers));
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(payload), { ...init, headers });
}

function htmlResponse(html, init = {}) {
  const headers = applyBaselineSecurityHeaders(new Headers(init.headers));
  headers.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(html, { ...init, headers });
}

function normalizeText(value, maxLength) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function parseCookies(request) {
  const header = request.headers.get('Cookie') || '';
  return Object.fromEntries(
    header.split(';').map(item => {
      const [name, ...rest] = item.trim().split('=');
      return [name, rest.join('=')];
    }).filter(([name]) => name)
  );
}

// ─── Auth helpers ────────────────────────────────────────────

function base64UrlEncode(value) {
  const bytes = value instanceof Uint8Array
    ? value
    : value instanceof ArrayBuffer
      ? new Uint8Array(value)
      : new TextEncoder().encode(String(value));
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function signPayload(payload, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return base64UrlEncode(sig);
}

async function createAdminToken(env) {
  const secret = normalizeText(env.ADMIN_SESSION_SECRET || env.ADMIN_PASSWORD || '', 240);
  if (!secret) return '';
  const payload = base64UrlEncode(JSON.stringify({ role: 'admin', exp: Date.now() + ADMIN_SESSION_MAX_AGE * 1000 }));
  const signature = await signPayload(payload, secret);
  return `${payload}.${signature}`;
}

function getSessionSecret(env) {
  return normalizeText(env.USER_SESSION_SECRET || env.ADMIN_SESSION_SECRET || env.ADMIN_PASSWORD || '', 240);
}

function randomBase64Url(byteLength = 16) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase().slice(0, 160);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function hashPassword(password) {
  const salt = randomBase64Url(16);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: PASSWORD_HASH_ITERATIONS },
    key,
    256
  );
  return `pbkdf2_sha256$${PASSWORD_HASH_ITERATIONS}$${salt}$${base64UrlEncode(bits)}`;
}

async function verifyPassword(password, storedHash) {
  const [algorithm, iterationsRaw, salt, expected] = String(storedHash || '').split('$');
  const iterations = Number(iterationsRaw);
  if (algorithm !== 'pbkdf2_sha256' || !iterations || !salt || !expected) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations },
    key,
    256
  );
  return base64UrlEncode(bits) === expected;
}

async function createUserToken(user, env) {
  const secret = getSessionSecret(env);
  if (!secret) return '';
  const payload = base64UrlEncode(JSON.stringify({
    role: 'user',
    id: user.id,
    email: user.email,
    name: user.display_name || '',
    exp: Date.now() + USER_SESSION_MAX_AGE * 1000
  }));
  const signature = await signPayload(payload, secret);
  return `${payload}.${signature}`;
}

async function verifyUserToken(token, env) {
  const secret = getSessionSecret(env);
  if (!secret) return null;
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return null;
  if ((await signPayload(payload, secret)) !== signature) return null;
  try {
    const data = JSON.parse(base64UrlDecode(payload));
    if (data.role !== 'user' || !data.id || Number(data.exp) <= Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

async function verifyAdminToken(token, env) {
  const secret = normalizeText(env.ADMIN_SESSION_SECRET || env.ADMIN_PASSWORD || '', 240);
  if (!secret) return false;
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return false;
  try {
    const data = JSON.parse(base64UrlDecode(payload));
    if (data.role !== 'admin' || Number(data.exp) <= Date.now()) return false;
  } catch { return false; }
  return (await signPayload(payload, secret)) === signature;
}

async function isAdminRequest(request, env) {
  const token = parseCookies(request)[ADMIN_COOKIE_NAME];
  return verifyAdminToken(token, env);
}

async function requireAdmin(request, env) {
  if (await isAdminRequest(request, env)) return null;
  return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
}

function adminCookie(value) {
  return `${ADMIN_COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${ADMIN_SESSION_MAX_AGE}`;
}

function userCookie(value) {
  return `${USER_COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${USER_SESSION_MAX_AGE}`;
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name || user.name || ''
  };
}

async function getCurrentUser(request, env) {
  const tokenData = await verifyUserToken(parseCookies(request)[USER_COOKIE_NAME], env);
  if (!tokenData) return null;
  if (!env.BLOG_DB) return publicUser({ id: tokenData.id, email: tokenData.email, display_name: tokenData.name });
  try {
    const user = await env.BLOG_DB.prepare(
      'SELECT id, email, display_name, created_at FROM blog_users WHERE id = ? LIMIT 1'
    ).bind(tokenData.id).first();
    return publicUser(user);
  } catch {
    return null;
  }
}

function queueBackgroundTask(ctx, promise, label = 'background task') {
  const guarded = Promise.resolve(promise).catch(error => console.error(`${label} failed`, error));
  if (ctx?.waitUntil) ctx.waitUntil(guarded);
  return guarded;
}

async function requireUser(request, env) {
  if (!env.BLOG_DB) {
    return {
      user: null,
      response: jsonResponse({ error: 'USER_DATABASE_UNAVAILABLE' }, { status: 503 })
    };
  }
  const tokenData = await verifyUserToken(parseCookies(request)[USER_COOKIE_NAME], env);
  if (!tokenData) {
    return {
      user: null,
      response: jsonResponse({ error: 'LOGIN_REQUIRED' }, { status: 401 })
    };
  }
  try {
    const user = await env.BLOG_DB.prepare(
      'SELECT id, email, display_name, created_at FROM blog_users WHERE id = ? LIMIT 1'
    ).bind(tokenData.id).first();
    if (!user) {
      return {
        user: null,
        response: jsonResponse({ error: 'LOGIN_REQUIRED' }, { status: 401 })
      };
    }
    return { user: publicUser(user), response: null };
  } catch {
    return {
      user: null,
      response: jsonResponse({ error: 'USER_DATABASE_UNAVAILABLE' }, { status: 503 })
    };
  }
}

// ─── Article helpers (KV-backed) ─────────────────────────────

// KV key: `article:${permalink}` → JSON: { title, excerpt, content, label, img, permalink, createDate, updatedAt }
// KV key: `article-index` → JSON array of permalink strings (chronological)

async function getArticleIndex(env) {
  if (!env.BLOG_KV) return [];
  try {
    const raw = await env.BLOG_KV.get('article-index');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveArticleIndex(env, index) {
  if (!env.BLOG_KV) return;
  await env.BLOG_KV.put('article-index', JSON.stringify(index));
}

async function getArticle(env, permalink) {
  if (env.BLOG_KV) {
    const raw = await env.BLOG_KV.get(`article:${permalink}`);
    if (raw) return JSON.parse(raw);
  }
  return SEED_ARTICLES.find(article => article.permalink === permalink) || null;
}

async function getAllArticles(env) {
  const index = await getArticleIndex(env);
  const seedIndex = SEED_ARTICLES.map(article => article.permalink);
  const mergedIndex = [...index, ...seedIndex.filter(permalink => !index.includes(permalink))];
  const articles = [];
  for (const permalink of mergedIndex) {
    const article = await getArticle(env, permalink);
    if (article) articles.push(article);
  }
  return articles;
}

// ─── HTML Templates ──────────────────────────────────────────

const LOGO_INLINE_CSS = `
.brand-logo-mark{position:relative;overflow:hidden;flex:0 0 auto;background:radial-gradient(circle at 26% 22%,rgba(255,255,255,.42),transparent 1.35rem),linear-gradient(135deg,#b895d4 0%,#d789b5 54%,#f29db3 100%);border:1px solid rgba(255,255,255,.34);box-shadow:0 16px 34px rgba(160,113,164,.24),inset 0 1px 0 rgba(255,255,255,.32)}
.brand-logo-mark:after{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.28),transparent 42%),radial-gradient(circle at 76% 82%,rgba(255,255,255,.2),transparent 1.2rem);pointer-events:none}
.brand-logo-glyph{position:relative;z-index:1;width:1.86rem;height:1.86rem;display:block;background:#fff;filter:drop-shadow(0 2px 4px rgba(73,48,92,.22));-webkit-mask:url("data:image/svg+xml,%3Csvg viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='black' d='M51.6 9.1C34.8 10.4 20.7 20 14.1 35.2c-2.4 5.5-3.4 11.2-2.9 17.2.1 1.2 1.6 1.8 2.5.9l8.5-8.5c4.9 3.7 12.1 3.2 16.5-1.4 5.6-5.8 5.7-16.8 15.2-26.3 2.7-2.7 1.5-8.3-2.3-8ZM22.7 38.4c4.8-6.5 10.5-12.2 17.2-17.3 1.1-.8 2.4.6 1.5 1.6-5.2 6.2-11 11.9-17.5 17.1-.9.7-1.9-.5-1.2-1.4Z'/%3E%3C/svg%3E") center/132% no-repeat;mask:url("data:image/svg+xml,%3Csvg viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='black' d='M51.6 9.1C34.8 10.4 20.7 20 14.1 35.2c-2.4 5.5-3.4 11.2-2.9 17.2.1 1.2 1.6 1.8 2.5.9l8.5-8.5c4.9 3.7 12.1 3.2 16.5-1.4 5.6-5.8 5.7-16.8 15.2-26.3 2.7-2.7 1.5-8.3-2.3-8ZM22.7 38.4c4.8-6.5 10.5-12.2 17.2-17.3 1.1-.8 2.4.6 1.5 1.6-5.2 6.2-11 11.9-17.5 17.1-.9.7-1.9-.5-1.2-1.4Z'/%3E%3C/svg%3E") center/132% no-repeat}
[data-theme="dark"] .brand-logo-mark{background:radial-gradient(circle at 25% 18%,rgba(255,255,255,.32),transparent 1.3rem),linear-gradient(135deg,#9d82dc 0%,#b77cc5 48%,#d98aa8 100%);border-color:rgba(242,225,255,.2);box-shadow:0 16px 34px rgba(0,0,0,.34),0 0 0 1px rgba(217,190,255,.08) inset}
@media (max-width:640px){.brand-logo-glyph{width:1.62rem;height:1.62rem}}
`;

function seoHead(title, description, canonicalPath, extraMeta = '') {
  const base = 'https://blog.858846.xyz';
  const url = base + canonicalPath;
  return `    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="keywords" content="cloudflare,workers,blog,技术笔记,个人博客">
    <link rel="canonical" href="${url}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Rowan Notes">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    ${extraMeta}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="icon" href="data:image/svg+xml,%3Csvg viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='64' height='64' rx='14' fill='%23425aef'/%3E%3Cpath fill='white' d='M51.6 9.1C34.8 10.4 20.7 20 14.1 35.2c-2.4 5.5-3.4 11.2-2.9 17.2.1 1.2 1.6 1.8 2.5.9l8.5-8.5c4.9 3.7 12.1 3.2 16.5-1.4 5.6-5.8 5.7-16.8 15.2-26.3 2.7-2.7 1.5-8.3-2.3-8ZM22.7 38.4c4.8-6.5 10.5-12.2 17.2-17.3 1.1-.8 2.4.6 1.5 1.6-5.2 6.2-11 11.9-17.5 17.1-.9.7-1.9-.5-1.2-1.4Z'/%3E%3C/svg%3E">
    <link rel="stylesheet" href="/styles.css?v=20260905-centered-side-arc">
    <link rel="stylesheet" href="/customer-service.css?v=20260804-chat-receipts-tight">
    <style>${LOGO_INLINE_CSS}</style>
    <link rel="alternate" type="application/rss+xml" title="Rowan Notes RSS" href="/rss.xml">`;
}

const SHARED_NAV = `    <!-- Navigation -->
    <nav class="glass-nav anzhiyu-nav sticky top-0 z-50 border-b border-white/30">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16 md:h-20">
                <a href="/" class="brand-link flex items-center space-x-3 group">
                    <div class="brand-logo-mark w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                        <i class="brand-logo-glyph" aria-hidden="true"></i>
                    </div>
                    <span class="text-lg md:text-xl font-bold text-gray-800 hidden sm:block">Rowan Notes</span>
                </a>
                <div class="hidden md:flex items-center space-x-8">
                    <a href="/" class="nav-link text-gray-700 font-medium hover:text-accent-primary">
                        <i class="ri-home-4-line mr-1"></i><span data-i18n="nav.home">Home</span>
                    </a>
                    <a href="/rss.xml" class="nav-link text-gray-700 font-medium hover:text-accent-primary" data-rss-link>
                        <i class="ri-rss-line mr-1"></i><span data-i18n="nav.rss">RSS</span>
                    </a>
                    <a href="/about" class="nav-link text-gray-700 font-medium hover:text-accent-primary">
                        <i class="ri-user-3-line mr-1"></i><span data-i18n="nav.about">关于</span>
                    </a>
                </div>
                <div class="nav-controls flex items-center">
                    <button class="nav-icon-btn nav-control-button site-search-trigger rounded-xl bg-white/60 backdrop-blur-sm border border-white/40 flex items-center justify-center hover:bg-white/80 transition-all" type="button" data-site-search-trigger data-i18n-aria="search.open" aria-label="搜索文章" title="搜索文章">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="2"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                    <button class="nav-icon-btn nav-control-button theme-toggle-btn rounded-xl bg-white/60 backdrop-blur-sm border border-white/40 flex items-center justify-center hover:bg-white/80 transition-all" onclick="toggleTheme()" aria-label="Toggle dark mode">
                        <i class="ri-moon-line text-accent-primary" data-theme-icon></i>
                    </button>
                    <button class="nav-icon-btn nav-control-button article-layout-toggle rounded-xl bg-white/60 backdrop-blur-sm border border-white/40 items-center justify-center hover:bg-white/80 transition-all" type="button" data-article-layout-cycle aria-label="切换文章排列方式" title="切换文章排列方式" hidden>
                        <i class="ri-layout-grid-line" data-article-layout-cycle-icon aria-hidden="true"></i>
                    </button>
                    <button class="nav-icon-btn nav-control-button article-comment-nav rounded-xl bg-white/60 backdrop-blur-sm border border-white/40 items-center justify-center hover:bg-white/80 transition-all" type="button" data-article-action="comments" data-i18n-aria="articleActions.comments" aria-label="查看评论" title="查看评论" hidden>
                        <i class="ri-chat-3-line" aria-hidden="true"></i>
                    </button>
                    <button class="language-switch nav-control-button" type="button" data-language-toggle aria-label="Switch language">
                        <span data-language-current>中</span>
                    </button>
                    <div class="admin-account-menu" data-admin-account>
                        <button class="admin-account-trigger" type="button" data-admin-account-trigger aria-expanded="false" aria-haspopup="menu">
                            <i class="ri-checkbox-blank-circle-line" aria-hidden="true"></i>
                            <span>admin</span>
                            <i class="ri-arrow-down-s-line admin-account-chevron" aria-hidden="true"></i>
                        </button>
                        <div class="admin-account-dropdown" data-admin-account-menu role="menu" hidden>
                            <a href="/admin/" data-admin-home role="menuitem">
                                <i class="ri-home-4-line" aria-hidden="true"></i>
                                <span data-i18n="nav.adminHome">管理首页</span>
                            </a>
                            <button type="button" data-admin-logout role="menuitem">
                                <i class="ri-logout-box-r-line" aria-hidden="true"></i>
                                <span data-i18n="nav.adminLogout">退出登录</span>
                            </button>
                        </div>
                    </div>
                    <a href="/login" class="user-auth-link px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-sm font-semibold flex items-center shadow-md" data-user-auth-link>
                        <i class="ri-user-line mr-2"></i>
                        <span data-i18n="nav.login">登录 / 注册</span>
                    </a>
                    <div class="user-menu hidden" data-user-menu>
                        <button class="user-account-trigger" type="button" data-user-account-trigger aria-expanded="false" aria-haspopup="menu">
                            <i class="ri-user-3-line user-account-icon" aria-hidden="true"></i>
                            <span class="user-menu-name" data-user-name>用户</span>
                            <i class="ri-arrow-down-s-line user-account-chevron" aria-hidden="true"></i>
                        </button>
                        <div class="user-account-menu hidden" data-user-account-menu role="menu">
                            <a href="/publish" role="menuitem"><i class="ri-quill-pen-line" aria-hidden="true"></i><span data-i18n="nav.publish">发布文章</span></a>
                            <a href="/my-articles" role="menuitem"><i class="ri-file-list-3-line" aria-hidden="true"></i><span data-i18n="nav.myArticles">我的文章</span></a>
                            <a href="/notifications" role="menuitem"><span class="user-menu-message-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg></span><span data-i18n="nav.notifications">我的消息</span><span class="user-menu-notification-count hidden" data-user-menu-notification-count>0</span></a>
                            <a href="/bookmarks" role="menuitem"><i class="ri-bookmark-line" aria-hidden="true"></i><span data-i18n="nav.myFavorites">我的收藏</span></a>
                            <button class="user-menu-logout" type="button" data-user-logout role="menuitem"><i class="ri-logout-box-r-line" aria-hidden="true"></i><span data-i18n="nav.logout">退出</span></button>
                        </div>
                    </div>
                    <button class="home-scroll-progress" type="button" data-home-scroll-progress aria-label="返回顶部，当前滚动 0%" title="返回顶部" hidden>
                        <span class="home-scroll-progress-value" data-home-scroll-progress-value>0</span>
                        <i class="ri-arrow-up-line home-scroll-progress-icon" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
        </div>
        <div class="site-search-layer hidden" data-site-search-layer>
            <section class="site-search-dialog" role="dialog" aria-modal="true" aria-labelledby="site-search-title" data-site-search-dialog>
                <button class="site-search-drag-handle" type="button" data-site-search-drag-handle aria-label="移动搜索窗口" title="拖动搜索窗口">
                    <span aria-hidden="true"></span>
                </button>
                <header class="site-search-header">
                    <div><span data-i18n="search.kicker">SEARCH NOTES</span><h2 id="site-search-title" data-i18n="search.title">搜索文章</h2></div>
                    <button type="button" data-site-search-close data-i18n-aria="search.close" aria-label="关闭搜索"><span aria-hidden="true">×</span></button>
                </header>
                <label class="site-search-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="2"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    <input type="search" data-site-search-input data-i18n-placeholder="search.placeholder" maxlength="80" autocomplete="off" placeholder="搜索标题、分类或正文关键词">
                    <kbd>/</kbd>
                </label>
                <div class="site-search-results" data-site-search-results aria-live="polite">
                    <div class="site-search-empty"><span>⌕</span><strong data-i18n="search.initialTitle">从想法中寻找线索</strong><p data-i18n="search.initialText">标题、摘要、分类和正文都可以搜索。</p></div>
                </div>
            </section>
        </div>
    </nav>`;

// The homepage keeps its deliberately sparse hero navigation. Search remains
// available everywhere else without reserving an empty control slot here.
const HOME_NAV = SHARED_NAV
  .replace(/\s*<button class="[^"]*site-search-trigger[\s\S]*?<\/button>/, '')
  .replace(/\s*<div class="site-search-layer hidden"[\s\S]*?<\/section>\s*<\/div>/, '');

const ADMIN_NAV = SHARED_NAV
  .replace(/\s*<button class="[^\"]*site-search-trigger[\s\S]*?<\/button>/, '')
  .replace(/\s*<div class="site-search-layer hidden"[\s\S]*?<\/section>\s*<\/div>/, '')
  .replace(/\s*<button class="language-switch[\s\S]*?<\/button>/, '');

const SHARED_FOOTER = `    <footer class="footer-glass border-t border-white/30 py-8 md:py-10">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center">
                <p class="text-gray-500 text-sm">858846.xyz / Cloudflare Workers Blog</p>
            </div>
        </div>
    </footer>
    <script src="/customer-service.js?v=20260804-system-i18n" defer></script>`;

function renderThemeSidebar(articles) {
  const list = Array.isArray(articles) ? articles : [];
  const categoryCounts = new Map();
  list.forEach(article => {
    const label = article.label || 'General';
    categoryCounts.set(label, (categoryCounts.get(label) || 0) + 1);
  });
  const categories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => `<li><span>${escapeHtml(label)}</span><strong>${count}</strong></li>`)
    .join('');
  const recent = list.slice(0, 5).map(article => `
    <li>
      <a href="/article/${escapeAttr(article.permalink)}" data-sidebar-article-permalink="${escapeAttr(article.permalink)}">
        <span>${escapeHtml(article.title)}</span>
        <time>${new Date(article.createDate).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</time>
      </a>
    </li>`).join('');

  return `<aside class="blog-sidebar" data-i18n-aria="a11y.blogSidebar" aria-label="博客侧栏">
    <section class="theme-sidebar-card theme-profile-card">
      <div class="theme-profile-brand" aria-hidden="true"><i class="brand-logo-glyph"></i></div>
      <p class="theme-sidebar-kicker">Rowan Notes</p>
      <h2 data-i18n="sidebar.profile">技术、工作与生活记录</h2>
      <p data-i18n="sidebar.profileText">记录 Cloudflare 实践、个人项目、交易复盘和持续学习。</p>
      <div class="theme-profile-stats">
        <span><strong>${list.length}</strong><small data-i18n="sidebar.articles">文章</small></span>
        <span><strong>${categoryCounts.size}</strong><small data-i18n="sidebar.categoriesCount">分类</small></span>
      </div>
    </section>
    <section class="theme-sidebar-card">
      <div class="theme-sidebar-heading"><i class="ri-dashboard-line" aria-hidden="true"></i><h2 data-i18n="sidebar.categories">文章分类</h2></div>
      <ul class="theme-category-list">${categories}</ul>
    </section>
    <section class="theme-sidebar-card">
      <div class="theme-sidebar-heading"><i class="ri-article-line" aria-hidden="true"></i><h2 data-i18n="sidebar.recent">最近文章</h2></div>
      <ul class="theme-recent-list">${recent}</ul>
    </section>
    <a class="theme-sidebar-card theme-rss-card" href="/rss.xml" data-rss-link>
      <i class="ri-rss-line" aria-hidden="true"></i>
      <span><strong data-i18n="sidebar.feed">订阅更新</strong><small>RSS Feed</small></span>
      <i class="ri-arrow-right-line" aria-hidden="true"></i>
    </a>
  </aside>`;
}

function binaryGlobeHtml() {
  return '<canvas class="avenia-binary-globe" data-binary-globe aria-hidden="true"></canvas>';
}

function homepageHtml(articles) {
  const desc = 'Rowan 的个人刊物，收集持续发生的想法、观察与故事。';
  const categoryCount = new Set(articles.map(article => article.label).filter(Boolean)).size;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
${seoHead('Rowan Notes', desc, '/')}
    <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Blog",
  "name": "Rowan Notes",
  "description": "${desc}",
  "url": "https://blog.858846.xyz",
  "inLanguage": "zh-CN"
}
    </script>
</head>
<body class="min-h-screen flex flex-col theme-anzhiyu home-redesign">
${HOME_NAV}
    <section class="avenia-home-hero" aria-labelledby="home-hero-title">
      <div class="avenia-home-inner">
        <div class="avenia-home-copy">
          <div class="avenia-home-title-block">
            <p class="avenia-home-kicker" data-i18n="home.signal">A PERSONAL PUBLICATION</p>
            <h1 id="home-hero-title"><span class="avenia-title-line" data-i18n="home.heroTitleLead">思绪在</span><span class="avenia-title-line avenia-title-line-offset"><span data-i18n="home.heroTitleMotion">流动</span><span class="avenia-title-caret" aria-hidden="true">_</span></span></h1>
          </div>
          <div class="avenia-home-side">
            <p data-i18n="home.heroText">收集持续发生的想法、观察与故事。</p>
            <a href="/articles" class="avenia-home-cta">
              <span data-i18n="home.explore">浏览全部文章</span><i class="ri-arrow-right-line" aria-hidden="true"></i>
            </a>
          </div>
        </div>
        <div class="avenia-ascii-field" aria-hidden="true">
          ${binaryGlobeHtml()}
        </div>
        <div class="avenia-stats-panel" data-i18n-aria="a11y.publicationStats" aria-label="刊物统计">
          <div class="avenia-stat" data-avenia-stat>
            <strong class="avenia-stat-value" data-stat-value="${articles.length}">0</strong>
            <span class="avenia-stat-label" data-i18n="home.articleCount">篇文章</span>
          </div>
          <div class="avenia-stat" data-avenia-stat>
            <strong class="avenia-stat-value" data-stat-value="${categoryCount}">0</strong>
            <span class="avenia-stat-label" data-i18n="home.categoryCount">个分类</span>
          </div>
          <div class="avenia-stat is-infinite" data-avenia-stat>
            <strong class="avenia-stat-value" aria-label="持续更新">∞</strong>
            <span class="avenia-stat-label" data-i18n="home.ongoing">持续更新</span>
          </div>
        </div>
      </div>
    </section>
${SHARED_FOOTER}
    <script src="/script.js?v=20260905-centered-side-arc"></script>
</body>
</html>`;
}

function articlesPageHtml(articles) {
  const desc = '按发布时间浏览技术实践、项目复盘和持续学习记录。';
  const lightArticles = articles.map(({ content, ...rest }) => rest);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
${seoHead('文章归档 - Rowan Notes', desc, '/articles')}
</head>
<body class="min-h-screen flex flex-col theme-anzhiyu article-archive-page" data-articles="${escapeAttr(JSON.stringify(lightArticles))}">
${SHARED_NAV}
  <main class="flex-1 anzhiyu-main archive-main">
    <header class="archive-heading">
      <div class="archive-heading-copy">
        <p data-i18n="archive.kicker">文章归档</p>
        <h1 data-i18n="archive.title">全部文章</h1>
        <div><span data-i18n="archive.description">按发布时间浏览技术实践、项目复盘和持续学习记录。</span></div>
      </div>
    </header>
    <div class="blog-home-layout">
      <section class="blog-content-column" aria-labelledby="archive-list-title">
        <h2 id="archive-list-title" class="sr-only" data-i18n="archive.title">全部文章</h2>
        <div class="article-cylinder-stage" data-article-cylinder-stage tabindex="-1" aria-label="文章旋转浏览区">
          <div id="articles-container" class="article-stream is-double-column grid gap-6">
            <div class="col-span-full flex flex-col justify-center items-center py-16"><i class="ri-loader-4-line text-2xl animate-spin"></i></div>
          </div>
        </div>
        <div id="pagination-container" class="mt-12"></div>
      </section>
      ${renderThemeSidebar(articles)}
    </div>
  </main>
${SHARED_FOOTER}
    <script src="/script.js?v=20260905-centered-side-arc"></script>
</body>
</html>`;
}

function aboutPageHtml() {
  const description = 'Rowan 的个人介绍：围绕 Cloudflare、AI 工作流、嵌入式实践与技术复盘持续构建。';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
${seoHead('About Rowan - Rowan Notes', description, '/about')}
</head>
<body class="min-h-screen flex flex-col theme-anzhiyu about-page">
${SHARED_NAV}
    <main class="flex-1 about-page-shell">
      <section class="about-author-box" aria-labelledby="about-rowan-name">
        <span class="about-author-tag tag-cloudflare">Cloudflare</span>
        <span class="about-author-tag tag-ai">AI Workflow</span>
        <div class="about-author-avatar" aria-hidden="true"><i class="brand-logo-glyph"></i></div>
        <span class="about-author-tag tag-stm32">STM32</span>
        <span class="about-author-tag tag-web">Web</span>
        <p id="about-rowan-name">Rowan</p>
        <small data-i18n="about.authorSubtitle">持续构建，也持续记录</small>
      </section>

      <section class="about-hello-stage" data-about-hello aria-label="Hello World">
        <span class="about-hello-cursor" aria-hidden="true"></span>
        <span class="about-hello-shapes" aria-hidden="true">
          <i class="about-hello-shape shape-one"></i>
          <i class="about-hello-shape shape-two"></i>
          <i class="about-hello-shape shape-three"></i>
        </span>
        <span class="about-hello-content"><h1>Hello World</h1></span>
      </section>

      <section class="about-author-content about-intro-pair" aria-label="Rowan introduction">
        <article class="about-content-item about-say-hello-card">
          <p class="about-item-tips" data-i18n="about.introTips">你好，很高兴认识你</p>
          <h2><span data-i18n="about.introPrefix">我是</span> <strong>Rowan</strong></h2>
          <p data-i18n="about.introText">把实践做成可交付的系统，也把过程写下来。</p>
        </article>
        <article class="about-content-item about-site-tips-card">
          <p class="about-item-tips" data-i18n="about.siteTips">关于本站</p>
          <h2><span data-i18n="about.siteTitleOne">记录</span><br><span data-i18n="about.siteTitleTwo">技术、工作与</span></h2>
          <div class="about-keyword-mask" aria-live="polite">
            <span class="is-visible" data-about-keyword data-i18n="about.keywordProjects">项目</span>
            <span data-about-keyword data-i18n="about.keywordLearning">学习</span>
            <span data-about-keyword data-i18n="about.keywordPractice">实践</span>
            <span data-about-keyword data-i18n="about.keywordReviews">复盘</span>
          </div>
        </article>
      </section>

      <section class="about-author-content about-skills-career-pair" aria-label="Skills and direction">
        <article class="about-skills-wall about-content-item" tabindex="0">
          <div class="about-skills-copy">
            <p class="about-item-tips" data-i18n="about.skillsKicker">技能</p>
            <h2 data-i18n="about.skillsCreative">开启创造力</h2>
          </div>
          <div class="about-skills-viewport">
            <div class="about-skills-track track-one">
              <span class="about-skill-tile tile-workers"><i class="ri-cloud-line" aria-hidden="true"></i><small>Workers</small></span>
              <span class="about-skill-tile tile-d1"><strong>D1</strong><small>D1</small></span>
              <span class="about-skill-tile tile-kv"><strong>KV</strong><small>KV</small></span>
              <span class="about-skill-tile tile-js"><strong>JS</strong><small>JavaScript</small></span>
              <span class="about-skill-tile tile-node"><strong>Node</strong><small>Node.js</small></span>
            </div>
            <div class="about-skills-track track-two">
              <span class="about-skill-tile tile-ai"><i class="ri-sparkling-2-line" aria-hidden="true"></i><small>AI Workflow</small></span>
              <span class="about-skill-tile tile-git"><i class="ri-git-branch-line" aria-hidden="true"></i><small>Git</small></span>
              <span class="about-skill-tile tile-stm32"><strong>32</strong><small>STM32</small></span>
              <span class="about-skill-tile tile-web"><i class="ri-global-line" aria-hidden="true"></i><small data-i18n="about.skillDeployment">网站部署</small></span>
              <span class="about-skill-tile tile-css"><strong>CSS</strong><small>CSS</small></span>
            </div>
          </div>
        </article>
        <article class="about-career-card about-content-item">
          <div class="about-career-copy">
            <p class="about-item-tips" data-i18n="about.careerTips">生涯</p>
            <h2 data-i18n="about.careerTitle">无限进步</h2>
            <ul>
              <li><span style="--career-color:#4b7cff"></span><strong data-i18n="about.journeyWeb">Web 系统与云端交付</strong></li>
              <li><span style="--career-color:#15c7a3"></span><strong data-i18n="about.journeyDevice">设备与网络现场实践</strong></li>
              <li><span style="--career-color:#ffb547"></span><strong data-i18n="about.journeyEmbedded">嵌入式项目复盘</strong></li>
            </ul>
          </div>
          <div class="about-career-visual" aria-hidden="true"><span></span><span></span><span></span></div>
        </article>
      </section>

      <section class="about-support-grid" aria-label="Digital spaces and current direction">
        <article class="about-content-item about-spaces-card">
          <p class="about-item-tips" data-i18n="about.spacesKicker">线上空间</p>
          <h2 data-i18n="about.spacesTitle">我的数字空间</h2>
          <div class="about-space-links">
            <a class="about-space-link space-main" href="https://858846.xyz"><span class="about-space-icon"><i class="ri-global-line" aria-hidden="true"></i></span><span><strong data-i18n="about.spaceMain">个人主站</strong><small data-i18n="about.spaceMainText">项目、经历与联系入口</small></span></a>
            <a class="about-space-link space-blog" href="/"><span class="about-space-icon"><i class="ri-article-line" aria-hidden="true"></i></span><span><strong data-i18n="about.spaceBlog">博客系统</strong><small data-i18n="about.spaceBlogText">技术笔记与项目复盘</small></span></a>
            <a class="about-space-link space-mail" href="https://mail.858846.xyz"><span class="about-space-icon"><i class="ri-mail-send-line" aria-hidden="true"></i></span><span><strong data-i18n="about.spaceMail">邮件系统</strong><small data-i18n="about.spaceMailText">独立的收发入口</small></span></a>
            <a class="about-space-link space-lab" href="https://lab.858846.xyz"><span class="about-space-icon"><i class="ri-flask-line" aria-hidden="true"></i></span><span><strong data-i18n="about.spaceLab">技术实验室</strong><small data-i18n="about.spaceLabText">持续试验与学习记录</small></span></a>
          </div>
        </article>
        <article class="about-content-item about-now-card">
          <p class="about-item-tips" data-i18n="about.nowKicker">现在</p>
          <h2 data-i18n="about.nowTitle">让每一次实践留下可复用的记录。</h2>
          <p data-i18n="about.nowText">继续完善个人网站，发布实现笔记，让项目复盘保持清晰。</p>
          <div class="about-now-orbit" aria-hidden="true"><span></span><span></span></div>
        </article>
        <article class="about-content-item about-contact-card">
          <div><p class="about-item-tips" data-i18n="about.contactTips">保持联系</p><h2 data-i18n="about.contactTitle">有想法，可以从这里找到我。</h2></div>
          <div class="about-contact-actions">
            <a class="about-primary-action" href="https://858846.xyz/contact"><i class="ri-send-plane-line" aria-hidden="true"></i><span data-i18n="about.contactCta">前往主站联系</span></a>
            <a class="about-secondary-action" href="https://858846.xyz/feedback"><i class="ri-message-3-line" aria-hidden="true"></i><span data-i18n="about.feedbackCta">打开反馈系统</span></a>
          </div>
        </article>
      </section>
    </main>
${SHARED_FOOTER}
    <script src="/script.js?v=20260905-centered-side-arc"></script>
</body>
</html>`;
}

function articlePageHtml(article) {
  const content = article.content || '';
  const desc = (article.excerpt || '').replace(/"/g, '&quot;');
  const title = article.title + ' - Rowan Notes';
  const ogImage = article.img || '';
  const ogImageTag = ogImage ? `<meta property="og:image" content="${escapeAttr(ogImage)}">` : '';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.createDate,
    dateModified: article.updatedAt || article.createDate,
    url: `https://blog.858846.xyz/article/${article.permalink}`,
    inLanguage: 'zh-CN',
    ...(article.authorName ? { author: { '@type': 'Person', name: article.authorName } } : {})
  };

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
${seoHead(title, desc, '/article/' + article.permalink, ogImageTag + `
    <meta property="og:type" content="article">
    <meta property="article:published_time" content="${article.createDate}">`)}
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body class="min-h-screen flex flex-col theme-anzhiyu article-detail-page">
${SHARED_NAV}
    <main class="flex-1 py-10 md:py-14 article-page">
      <div class="article-reading-layout">
        <div class="article-reading-main">
        <article class="article-shell">
            <div class="glass-card article-body-card p-6 md:p-10 mb-8" data-article-permalink="${escapeAttr(article.permalink)}">
                <div class="mb-6 article-header-meta">
                    <span class="category-tag px-3 py-1.5 rounded-xl text-xs font-semibold" data-article-category data-original-category="${escapeAttr(article.label)}">${escapeHtml(article.label)}</span>
                    <time class="text-sm text-gray-500 ml-3" data-article-published-date datetime="${escapeAttr(article.createDate)}">
                        <i class="ri-calendar-line mr-1"></i><span>${new Date(article.createDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </time>
                    ${article.authorName ? `<span class="article-author-name"><i class="ri-user-3-line" aria-hidden="true"></i>${escapeHtml(article.authorName)}</span>` : ''}
                </div>
                <h1 class="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-6 leading-tight">${escapeHtml(article.title)}</h1>
                <div class="article-content markdown-body" data-article-content>${renderMarkdown(content)}</div>
            </div>
            <div class="article-toolbar flex justify-between items-center mb-8" data-article-toolbar>
                <button onclick="toggleBookmark('${escapeAttr(article.permalink)}', '${escapeAttr(article.title)}', '${escapeAttr(article.img || '')}', '${escapeAttr(article.label)}', this)" class="btn-share bookmark-btn w-10 h-10 rounded-xl flex items-center justify-center" type="button" data-bookmark-permalink="${escapeAttr(article.permalink)}" aria-label="收藏文章" title="收藏文章" data-share-hint="收藏文章">
                    <i class="ri-bookmark-line text-accent-primary" aria-hidden="true"></i>
                </button>
                <button onclick="shareArticle('${escapeAttr(article.permalink)}', '${escapeAttr(article.title)}')" class="btn-share w-10 h-10 rounded-xl flex items-center justify-center" type="button" data-i18n-aria="articles.share" aria-label="分享文章" data-share-hint="分享给需要的人" data-share-hint-key="articles.shareHint">
                    <i class="ri-share-forward-line text-accent-primary" aria-hidden="true"></i>
                </button>
            </div>
        </article>
        <section id="comments" class="blog-comments-panel" data-comments data-comment-permalink="${escapeAttr(article.permalink)}" aria-labelledby="comments-title">
            <p class="blog-comments-kicker" data-i18n="comments.kicker">评论</p>
            <h2 id="comments-title" class="blog-comments-title" data-i18n="comments.title">评论</h2>
            <form class="blog-comment-form" data-comment-form>
                <input class="blog-comment-honeypot" type="text" name="website" tabindex="-1" autocomplete="off">
                <input type="hidden" name="parentId" value="">
                <div class="blog-comment-reply-context" data-comment-reply-context hidden role="status">
                    <span><span data-i18n="comments.replyingTo">正在回复</span> <strong data-comment-reply-name></strong></span>
                    <button type="button" data-comment-reply-cancel data-i18n="comments.cancelReply">取消回复</button>
                </div>
                <div class="blog-comment-grid">
                    <label class="blog-comment-label"><span data-i18n="comments.name">昵称</span>
                        <input class="blog-comment-field" name="authorName" maxlength="40" autocomplete="name" required>
                    </label>
                </div>
                <label class="blog-comment-label"><span data-i18n="comments.content">评论内容</span>
                    <textarea class="blog-comment-field" name="content" maxlength="1200" required></textarea>
                </label>
                <div class="blog-comment-actions">
                    <p class="blog-comment-note" data-i18n="comments.note">评论提交后会立即公开显示。</p>
                    <button class="blog-comment-submit" type="submit" data-i18n="comments.submit">提交评论</button>
                </div>
            </form>
            <div class="blog-comments-feed">
                <p class="blog-comments-status" data-comments-status data-i18n="comments.loading">正在加载评论...</p>
                <div class="blog-comments-list" data-comments-list></div>
            </div>
        </section>
        </div>
        <aside class="article-reading-sidebar" data-i18n-aria="a11y.articleSidebar" aria-label="文章辅助导航">
          <section class="theme-sidebar-card article-author-card">
            <div class="theme-profile-brand" aria-hidden="true"><i class="brand-logo-glyph"></i></div>
            <p class="theme-sidebar-kicker">Rowan Notes</p>
            <h2 data-i18n="sidebar.profile">技术、工作与生活记录</h2>
            <p data-i18n="sidebar.profileText">记录 Cloudflare 实践、个人项目、交易复盘和持续学习。</p>
          </section>
          <section class="theme-sidebar-card article-toc-card">
            <div class="theme-sidebar-heading"><i class="ri-article-line" aria-hidden="true"></i><h2 data-i18n="sidebar.toc">文章目录</h2></div>
            <nav class="article-toc" data-article-toc data-i18n-aria="sidebar.toc" aria-label="文章目录">
              <p class="article-toc-empty" data-i18n="sidebar.noToc">正在生成目录...</p>
            </nav>
          </section>
        </aside>
      </div>
    </main>
${SHARED_FOOTER}
    <script src="/script.js?v=20260905-centered-side-arc"></script>
</body>
</html>`;
}

function adminPageHtml(authenticated = false, section = 'dashboard') {
  const adminDashboard = `
            <section class="glass-card p-6 md:p-10 admin-dashboard" data-admin-dashboard>
                <div class="admin-dashboard-heading">
                    <span class="admin-submissions-kicker">Admin workspace</span>
                    <h1>管理后台</h1>
                    <p>请选择需要进入的管理功能。</p>
                </div>
                <div class="admin-management-grid">
                    <a class="admin-management-card admin-submissions-link" href="/admin/submissions">
                        <i class="ri-file-list-3-line" aria-hidden="true"></i>
                        <span>
                            <strong>用户投稿管理</strong>
                            <small>审核待处理文章并发布到博客</small>
                        </span>
                        <i class="ri-arrow-right-line" aria-hidden="true"></i>
                    </a>
                    <a class="admin-management-card admin-customer-service-link" href="/admin/customer-service">
                        <i class="ri-customer-service-2-line" aria-hidden="true"></i>
                        <span>
                            <strong>在线客服管理</strong>
                            <small>查看用户会话、未读消息和实时回复</small>
                        </span>
                        <i class="ri-arrow-right-line" aria-hidden="true"></i>
                    </a>
                </div>
            </section>`;
  const adminSubmissions = `
            <section class="glass-card p-6 md:p-10 admin-submissions" data-admin-submissions>
                <div class="admin-submissions-heading">
                    <div>
                        <span class="admin-submissions-kicker">User submissions</span>
                        <h1>用户投稿管理</h1>
                        <p>这里只显示待审核文章。确认内容无误后，可直接发布到博客。</p>
                    </div>
                    <button class="admin-submissions-refresh" type="button" data-admin-submissions-refresh aria-label="刷新待审核投稿">
                        <i class="ri-refresh-line" aria-hidden="true"></i><span>刷新</span>
                    </button>
                </div>
                <div class="admin-submissions-list" data-admin-submissions-list aria-live="polite"></div>
            </section>`;
  const adminContent = authenticated ? (section === 'submissions' ? adminSubmissions : adminDashboard) : `
            <section class="glass-card p-6 md:p-10 admin-login-card">
                <span class="inline-block bg-pastel-lavender text-accent-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-3">Admin</span>
                <h1 class="text-2xl md:text-3xl font-bold text-gray-800 mb-3">管理后台</h1>
                <p class="text-gray-600 mb-8">请输入管理密码登录。</p>
                <form data-admin-login class="grid gap-4 mb-8">
                    <label class="blog-comment-label">管理密码
                        <input class="blog-comment-field" type="password" name="password" autocomplete="current-password" required>
                    </label>
                    <button class="blog-comment-submit" type="submit">登录</button>
                </form>
                <p class="blog-comments-status" data-admin-status role="status"></p>
            </section>`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
${seoHead('管理后台 - Rowan Notes', '审核用户投稿并管理在线客服。', '/admin/')}
</head>
<body class="min-h-screen flex flex-col theme-anzhiyu admin-page${authenticated ? ' admin-authenticated' : ''}">
${ADMIN_NAV}
    <main class="flex-1 py-10 md:py-16">
        <div class="admin-shell mx-auto px-4 sm:px-6 lg:px-8">
${adminContent}
        </div>
    </main>
${SHARED_FOOTER}
    <script src="/script.js?v=20260905-centered-side-arc"></script>
</body>
</html>`;
}

function adminSubmissionDetailPageHtml(submissionId) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
${seoHead('投稿详情 - Rowan Notes', '审核用户提交的文章。', '/admin/submissions/' + encodeURIComponent(submissionId))}
</head>
<body class="min-h-screen flex flex-col theme-anzhiyu admin-submission-detail-page admin-page admin-authenticated">
${ADMIN_NAV}
    <main class="flex-1 admin-submission-detail-shell" data-admin-submission-detail data-submission-id="${escapeAttr(submissionId)}">
        <div class="admin-submission-detail-nav">
            <a href="/admin/submissions" class="admin-submission-back"><i class="ri-arrow-left-line" aria-hidden="true"></i><span>返回投稿列表</span></a>
            <span class="admin-submissions-kicker">Submission review</span>
        </div>
        <article class="glass-card admin-submission-preview" data-admin-submission-detail-content aria-live="polite">
            <div class="admin-submission-empty">正在加载投稿详情...</div>
        </article>
        <p class="blog-comments-status" data-admin-submission-detail-status role="status"></p>
    </main>
${SHARED_FOOTER}
    <script src="/script.js?v=20260905-centered-side-arc"></script>
</body>
</html>`;
}

function authPageHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
${seoHead('登录 / 注册 - Rowan Notes', '登录或注册 Rowan Notes 普通用户账号。', '/login')}
</head>
<body class="min-h-screen flex flex-col theme-anzhiyu">
${SHARED_NAV}
    <main class="flex-1 py-10 md:py-16 auth-page">
        <section class="auth-shell">
            <div class="auth-copy">
                <p class="auth-kicker" data-i18n="auth.kicker">Reader Account</p>
                <h1 data-i18n="auth.title">登录或创建普通用户账号</h1>
                <p data-i18n="auth.description">普通账号用于保存阅读身份和后续互动功能。管理后台不在前台导航展示，只能通过独立地址访问。</p>
            </div>
            <div class="auth-card glass-card">
                <div class="auth-tabs" role="tablist" aria-label="登录和注册">
                    <button class="auth-tab is-active" type="button" data-auth-tab="login" data-i18n="auth.loginTab">登录</button>
                    <button class="auth-tab" type="button" data-auth-tab="register" data-i18n="auth.registerTab">注册</button>
                </div>
                <form class="auth-form" data-user-login-form>
                    <label class="blog-comment-label"><span data-i18n="auth.email">邮箱</span>
                        <input class="blog-comment-field" name="email" type="email" maxlength="160" autocomplete="email" required>
                    </label>
                    <label class="blog-comment-label"><span data-i18n="auth.password">密码</span>
                        <input class="blog-comment-field" name="password" type="password" minlength="8" maxlength="128" autocomplete="current-password" required>
                    </label>
                    <button class="blog-comment-submit auth-submit" type="submit" data-i18n="auth.loginSubmit">登录</button>
                </form>
                <form class="auth-form hidden" data-user-register-form>
                    <label class="blog-comment-label"><span data-i18n="auth.name">昵称</span>
                        <input class="blog-comment-field" name="displayName" maxlength="40" autocomplete="name" required>
                    </label>
                    <label class="blog-comment-label"><span data-i18n="auth.email">邮箱</span>
                        <input class="blog-comment-field" name="email" type="email" maxlength="160" autocomplete="email" required>
                    </label>
                    <label class="blog-comment-label"><span data-i18n="auth.password">密码</span>
                        <input class="blog-comment-field" name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required>
                    </label>
                    <button class="blog-comment-submit auth-submit" type="submit" data-i18n="auth.registerSubmit">创建账号</button>
                </form>
                <p class="auth-status" data-user-auth-status role="status"></p>
            </div>
        </section>
    </main>
${SHARED_FOOTER}
    <script src="/script.js?v=20260905-centered-side-arc"></script>
</body>
</html>`;
}

function bookmarksPageHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
${seoHead('收藏 - Rowan Notes', '你保存下来稍后阅读的文章。', '/bookmarks')}
</head>
<body class="min-h-screen flex flex-col theme-anzhiyu">
${SHARED_NAV}
    <main class="flex-1 py-10 md:py-16">
        <div class="bookmarks-shell">
            <div class="text-center mb-10">
                <span class="inline-block bg-pastel-peach text-orange-600 px-4 py-1.5 rounded-full text-sm font-semibold mb-3" data-i18n="bookmarks.kicker">你的收藏</span>
                <h1 class="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-3" data-i18n="bookmarks.title">书签</h1>
                <p class="text-gray-600 max-w-xl mx-auto" data-i18n="bookmarks.description">你保存下来稍后阅读的文章</p>
            </div>
            <div id="bookmarks-container" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="col-span-full text-center py-12">
                    <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-pastel-lavender to-pastel-pink mx-auto flex items-center justify-center mb-4">
                        <i class="ri-bookmark-line text-4xl text-accent-primary"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800 mb-2" data-i18n="bookmarks.emptyTitle">暂无书签</h3>
                    <p class="text-gray-500 max-w-md mx-auto mb-6" data-i18n="bookmarks.emptyDescription">点击文章上的书签图标保存喜欢的内容，它们会出现在这里。</p>
                    <a href="/" class="btn-primary text-white px-6 py-3 rounded-xl inline-flex items-center">
                        <i class="ri-arrow-left-line mr-2"></i><span data-i18n="bookmarks.browse">浏览文章</span>
                    </a>
                </div>
            </div>
        </div>
    </main>
${SHARED_FOOTER}
    <script src="/script.js?v=20260905-centered-side-arc"></script>
    <script>document.addEventListener('DOMContentLoaded', renderBookmarksPage);</script>
</body>
</html>`;
}

function rssXml(articles) {
  const items = articles.map(a => `        <item>
            <title><![CDATA[${a.title}]]></title>
            <description><![CDATA[${a.excerpt || ''}]]></description>
            <content:encoded><![CDATA[${(a.content || '').slice(0, 500)}]]></content:encoded>
            <link>https://blog.858846.xyz/article/${a.permalink}</link>
            <guid isPermaLink="true">https://blog.858846.xyz/article/${a.permalink}</guid>
            <pubDate>${new Date(a.createDate).toUTCString()}</pubDate>
            <category><![CDATA[${a.label || 'General'}]]></category>
            <dc:creator><![CDATA[Rowan Notes]]></dc:creator>
        </item>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/rss.xsl"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
    <channel>
        <title><![CDATA[Rowan Notes]]></title>
        <description><![CDATA[技术实践、Cloudflare 部署和个人项目复盘。]]></description>
        <link>https://blog.858846.xyz</link>
        <atom:link href="https://blog.858846.xyz/rss.xml" rel="self" type="application/rss+xml"/>
        <language>zh-CN</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <generator>CF Workers Blog v2</generator>
        <ttl>60</ttl>
${items}
    </channel>
</rss>`;
}

function rssXsl() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" encoding="UTF-8" doctype-system="about:legacy-compat"/>
  <xsl:template match="/">
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title><xsl:value-of select="/rss/channel/title"/> RSS</title>
        <style>
          :root {
            color-scheme: light dark;
            --ink: #1f2937;
            --muted: #657184;
            --paper: rgba(255, 255, 255, 0.86);
            --line: rgba(132, 111, 174, 0.18);
            --accent: #8b78b6;
            --accent-strong: #6f5aa7;
            --wash-a: #f8e5ef;
            --wash-b: #dceefa;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: var(--ink);
            background:
              radial-gradient(circle at 12% 8%, rgba(255,255,255,0.88), transparent 18rem),
              linear-gradient(120deg, var(--wash-a), var(--wash-b));
          }
          .shell { width: min(100% - 2rem, 1120px); margin: 0 auto; padding: 3rem 0 4rem; }
          .hero {
            padding: clamp(2rem, 5vw, 4rem);
            border: 1px solid var(--line);
            border-radius: 28px;
            background: var(--paper);
            box-shadow: 0 28px 80px rgba(80, 65, 120, 0.14);
            backdrop-filter: blur(18px);
          }
          .kicker {
            display: inline-flex;
            align-items: center;
            gap: .5rem;
            margin: 0 0 1rem;
            padding: .46rem .82rem;
            border-radius: 999px;
            background: rgba(139, 120, 182, 0.12);
            color: var(--accent-strong);
            font-size: .78rem;
            font-weight: 800;
            letter-spacing: .08em;
            text-transform: uppercase;
          }
          h1 { margin: 0; font-size: clamp(2.4rem, 7vw, 5rem); line-height: .98; letter-spacing: 0; }
          .lead { max-width: 42rem; margin: 1rem 0 1.6rem; color: var(--muted); font-size: clamp(1rem, 2vw, 1.25rem); line-height: 1.7; }
          .actions { display: flex; flex-wrap: wrap; gap: .8rem; }
          .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 2.8rem;
            padding: .75rem 1.05rem;
            border-radius: 14px;
            border: 1px solid var(--line);
            color: var(--accent-strong);
            background: rgba(255,255,255,.72);
            font-weight: 800;
            text-decoration: none;
          }
          .btn.primary { color: white; background: linear-gradient(135deg, #7d69ad, #9d89c7); box-shadow: 0 14px 30px rgba(111, 90, 167, .22); }
          .meta { margin-top: 1.4rem; color: var(--muted); font-size: .92rem; }
          .list { display: grid; gap: 1rem; margin-top: 1.4rem; }
          .item {
            display: grid;
            gap: .65rem;
            padding: 1.2rem;
            border-radius: 22px;
            border: 1px solid var(--line);
            background: rgba(255,255,255,.76);
            box-shadow: 0 18px 52px rgba(80, 65, 120, .1);
          }
          .item h2 { margin: 0; font-size: clamp(1.2rem, 2.6vw, 1.7rem); line-height: 1.25; }
          .item h2 a { color: var(--ink); text-decoration: none; }
          .item h2 a:hover { color: var(--accent-strong); }
          .item p { margin: 0; color: var(--muted); line-height: 1.7; }
          .item-meta { display: flex; flex-wrap: wrap; gap: .55rem; color: var(--accent-strong); font-size: .84rem; font-weight: 800; }
          .pill { padding: .3rem .58rem; border-radius: 999px; background: rgba(139,120,182,.12); }
          .hint { margin: 1rem 0 0; color: var(--muted); font-size: .9rem; }
          @media (prefers-color-scheme: dark) {
            :root {
              --ink: #f6f2ff;
              --muted: #c9c1d9;
              --paper: rgba(22, 17, 34, 0.86);
              --line: rgba(226, 213, 255, 0.16);
              --accent: #b9a7ee;
              --accent-strong: #d7caff;
              --wash-a: #120d21;
              --wash-b: #102234;
            }
            .btn, .item { background: rgba(255,255,255,.07); }
          }
        </style>
      </head>
      <body>
        <main class="shell">
          <section class="hero">
            <p class="kicker">RSS Feed</p>
            <h1><xsl:value-of select="/rss/channel/title"/></h1>
            <p class="lead"><xsl:value-of select="/rss/channel/description"/></p>
            <div class="actions">
              <a class="btn primary" href="https://blog.858846.xyz/">返回博客首页</a>
              <a class="btn" href="https://blog.858846.xyz/rss.xml">复制或订阅 RSS 地址</a>
            </div>
            <p class="meta">这是给 RSS 阅读器使用的订阅源。浏览器打开时会显示这层可读预览。</p>
          </section>
          <section class="list" aria-label="RSS articles">
            <xsl:for-each select="/rss/channel/item">
              <article class="item">
                <div class="item-meta">
                  <span class="pill"><xsl:value-of select="category"/></span>
                  <span class="pill"><xsl:value-of select="pubDate"/></span>
                </div>
                <h2><a href="{link}"><xsl:value-of select="title"/></a></h2>
                <p><xsl:value-of select="description"/></p>
              </article>
            </xsl:for-each>
          </section>
          <p class="hint">订阅地址：https://blog.858846.xyz/rss.xml</p>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>`;
}

function rssPreviewHtml(articles, language = 'zh') {
  const isEn = language === 'en';
  const copy = isEn ? {
    htmlLang: 'en',
    pageTitle: 'RSS Feed - Rowan Notes',
    metaDescription: 'RSS feed preview for Rowan Notes.',
    lead: 'This is the blog feed preview. Add the RSS URL to your reader to receive new articles automatically.',
    home: 'Back to Blog Home',
    raw: 'View Raw RSS',
    feedPrefix: 'Feed URL:',
    feedUrl: 'https://blog.858846.xyz/rss.xml?format=xml&amp;lang=en',
    aria: 'RSS articles',
    locale: 'en-US'
  } : {
    htmlLang: 'zh-CN',
    pageTitle: 'RSS 订阅 - Rowan Notes',
    metaDescription: 'Rowan Notes 的 RSS 订阅预览页。',
    lead: '这是博客的订阅源预览页。把 RSS 地址添加到阅读器后，就能自动收到最新文章。',
    home: '返回博客首页',
    raw: '查看原始 RSS',
    feedPrefix: '订阅地址：',
    feedUrl: 'https://blog.858846.xyz/rss.xml?format=xml',
    aria: 'RSS articles',
    locale: 'zh-CN'
  };

  const articleCards = articles.map(article => {
    const localized = isEn && ARTICLE_I18N_EN[article.permalink]
      ? { ...article, ...ARTICLE_I18N_EN[article.permalink] }
      : article;
    const title = escapeHtml(localized.title);
    const excerpt = escapeHtml(localized.excerpt || '');
    const label = escapeHtml(article.label || 'General');
    const date = new Date(article.createDate).toLocaleDateString(copy.locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const href = `/article/${escapeAttr(article.permalink)}`;
    return `          <article class="rss-item">
            <div class="rss-item-meta">
              <span>${label}</span>
              <time>${escapeHtml(date)}</time>
            </div>
            <h2><a href="${href}">${title}</a></h2>
            <p>${excerpt}</p>
          </article>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="${copy.htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${copy.pageTitle}</title>
  <meta name="description" content="${copy.metaDescription}">
  <link rel="alternate" type="application/rss+xml" title="Rowan Notes RSS" href="/rss.xml?format=xml${isEn ? '&amp;lang=en' : ''}">
  <style>
    :root {
      color-scheme: light dark;
      --ink: #1f2937;
      --muted: #657184;
      --paper: rgba(255,255,255,.86);
      --line: rgba(132,111,174,.18);
      --accent: #8b78b6;
      --accent-strong: #6f5aa7;
      --wash-a: #f8e5ef;
      --wash-b: #dceefa;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at 12% 8%, rgba(255,255,255,.88), transparent 18rem),
        linear-gradient(120deg, var(--wash-a), var(--wash-b));
    }
    .shell { width: min(100% - 2rem, 1120px); margin: 0 auto; padding: 3rem 0 4rem; }
    .hero, .rss-item {
      border: 1px solid var(--line);
      background: var(--paper);
      box-shadow: 0 28px 80px rgba(80,65,120,.14);
      backdrop-filter: blur(18px);
    }
    .hero { padding: clamp(2rem, 5vw, 4rem); border-radius: 28px; }
    .kicker {
      display: inline-flex;
      margin: 0 0 1rem;
      padding: .46rem .82rem;
      border-radius: 999px;
      background: rgba(139,120,182,.12);
      color: var(--accent-strong);
      font-size: .78rem;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    h1 { margin: 0; font-size: clamp(2.4rem, 7vw, 5rem); line-height: .98; letter-spacing: 0; }
    .lead { max-width: 42rem; margin: 1rem 0 1.6rem; color: var(--muted); font-size: clamp(1rem, 2vw, 1.25rem); line-height: 1.7; }
    .actions { display: flex; flex-wrap: wrap; gap: .8rem; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 2.8rem;
      padding: .75rem 1.05rem;
      border-radius: 14px;
      border: 1px solid var(--line);
      color: var(--accent-strong);
      background: rgba(255,255,255,.72);
      font-weight: 800;
      text-decoration: none;
    }
    .btn.primary { color: white; background: linear-gradient(135deg, #7d69ad, #9d89c7); box-shadow: 0 14px 30px rgba(111,90,167,.22); }
    .feed-url {
      display: inline-flex;
      margin-top: 1rem;
      padding: .68rem .82rem;
      border-radius: 14px;
      color: var(--muted);
      background: rgba(255,255,255,.58);
      border: 1px solid var(--line);
      font-size: .92rem;
      word-break: break-all;
    }
    .list { display: grid; gap: 1rem; margin-top: 1.4rem; }
    .rss-item { display: grid; gap: .65rem; padding: 1.2rem; border-radius: 22px; }
    .rss-item h2 { margin: 0; font-size: clamp(1.2rem, 2.6vw, 1.7rem); line-height: 1.25; }
    .rss-item h2 a { color: var(--ink); text-decoration: none; }
    .rss-item h2 a:hover { color: var(--accent-strong); }
    .rss-item p { margin: 0; color: var(--muted); line-height: 1.7; }
    .rss-item-meta { display: flex; flex-wrap: wrap; gap: .55rem; color: var(--accent-strong); font-size: .84rem; font-weight: 800; }
    .rss-item-meta span, .rss-item-meta time { padding: .3rem .58rem; border-radius: 999px; background: rgba(139,120,182,.12); }
    @media (prefers-color-scheme: dark) {
      :root {
        --ink: #f6f2ff;
        --muted: #c9c1d9;
        --paper: rgba(22,17,34,.86);
        --line: rgba(226,213,255,.16);
        --accent-strong: #d7caff;
        --wash-a: #120d21;
        --wash-b: #102234;
      }
      .btn, .feed-url, .rss-item { background: rgba(255,255,255,.07); }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <p class="kicker">RSS Feed</p>
      <h1>Rowan Notes RSS</h1>
      <p class="lead">${copy.lead}</p>
      <div class="actions">
        <a class="btn primary" href="/">${copy.home}</a>
        <a class="btn" href="/rss.xml?format=xml${isEn ? '&amp;lang=en' : ''}">${copy.raw}</a>
      </div>
      <div class="feed-url">${copy.feedPrefix}${copy.feedUrl}</div>
    </section>
    <section class="list" aria-label="${copy.aria}">
${articleCards}
    </section>
  </main>
</body>
</html>`;
}

function publishPageHtml() {
  const toolbar = [
    ['heading-2', 'H2', '二级标题'],
    ['heading-3', 'H3', '三级标题'],
    ['bold', 'B', '粗体'],
    ['italic', 'I', '斜体'],
    ['quote', '“', '引用'],
    ['ordered-list', '1.', '有序列表'],
    ['unordered-list', '•', '无序列表'],
    ['code', '<>', '代码'],
    ['link', '↗', '链接'],
    ['horizontal-rule', '—', '分隔线'],
    ['image', '▧', '插入图片']
  ].map(([action, symbol, label]) => `
                    <button type="button" data-markdown-action="${action}" title="${label}" aria-label="${label}"><span aria-hidden="true">${symbol}</span></button>`).join('');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
${seoHead('发布文章 - Rowan Notes', '编写并提交文章到 Rowan Notes 审核。', '/publish')}
</head>
<body class="min-h-screen flex flex-col theme-anzhiyu publish-page">
${SHARED_NAV}
    <main class="flex-1 publish-shell" data-publish-editor>
        <header class="publish-heading">
            <div><p class="publish-kicker" data-i18n="publish.kicker">投稿中心</p><h1 data-i18n="publish.title">发布文章</h1></div>
            <p data-i18n="publish.description">保存草稿后提交审核，审核期间内容将锁定。</p>
        </header>
        <form class="publish-form" data-publish-form novalidate>
            <section class="publish-meta-panel">
                <label><span data-i18n="publish.articleTitle">标题</span><input name="title" maxlength="120" required></label>
                <label><span data-i18n="publish.category">分类</span><input name="category" maxlength="50" list="publish-category-options" required></label>
                <datalist id="publish-category-options"><option value="Cloudflare"><option value="Database"><option value="AI Workflow"><option value="Crypto"><option value="Embedded"></datalist>
                <label class="publish-excerpt-field"><span data-i18n="publish.excerpt">摘要</span><textarea name="excerpt" maxlength="240" rows="2" data-i18n-placeholder="publish.excerptPlaceholder" placeholder="留空时将根据正文自动生成"></textarea></label>
                <div class="publish-cover-field"><div class="publish-cover-heading"><span data-i18n="publish.cover">封面图片</span><small data-i18n="publish.coverHint">选择已上传图片，或上传一张新封面</small></div><div class="publish-cover-controls"><select name="coverAssetId" data-cover-select data-i18n-aria="publish.coverSelect" aria-label="选择封面图片"><option value="" data-i18n="publish.noCover">不设置封面</option></select><button class="publish-cover-upload" type="button" data-cover-upload-trigger><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 16.5V19h16v-2.5M12 4v10m0-10L8.5 7.5M12 4l3.5 3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span data-i18n="publish.coverUpload">上传封面</span></button><input class="publish-cover-file" type="file" name="coverImage" accept=".jpg,.jpeg,.png,.webp,.gif" hidden data-cover-upload-input></div><div class="publish-cover-preview" data-cover-preview hidden><img data-cover-preview-image alt=""><span data-i18n="publish.coverPreview">封面预览</span></div></div>
            </section>
            <div class="publish-mobile-modes" role="tablist" aria-label="编辑与预览">
                <button type="button" class="is-active" data-editor-mode="edit" role="tab" aria-selected="true" data-i18n="publish.edit">编辑</button>
                <button type="button" data-editor-mode="preview" role="tab" aria-selected="false" data-i18n="publish.preview">预览</button>
            </div>
            <section class="publish-workspace">
                <div class="publish-editor-column" data-editor-pane="edit">
                    <div class="markdown-toolbar" role="toolbar" aria-label="Markdown 工具栏">${toolbar}
                    </div>
                    <label class="publish-content-label"><span class="sr-only" data-i18n="publish.content">正文</span><textarea name="content" maxlength="30000" data-editor-content required data-i18n-placeholder="publish.contentPlaceholder" placeholder="使用 Markdown 编写正文"></textarea></label>
                </div>
                <article class="publish-preview-column" data-editor-pane="preview" data-editor-preview aria-live="polite">
                    <p class="publish-preview-empty" data-i18n="publish.previewEmpty">正文预览将在这里显示。</p>
                </article>
            </section>
            <section class="publish-attachments">
                <div class="publish-section-title"><div><h2 data-i18n="publish.images">文章图片</h2><p data-i18n="publish.imageRules">最多 5 张，每张不超过 5 MB。</p></div>
                    <label class="publish-upload-button"><i class="ri-upload-cloud-2-line" aria-hidden="true"></i><span data-i18n="publish.upload">上传图片</span><input type="file" name="image" accept=".jpg,.jpeg,.png,.webp,.gif" hidden data-attachment-input></label>
                </div>
                <div class="publish-attachment-list" data-attachment-list></div>
            </section>
            <footer class="publish-actions">
                <p class="publish-save-state" data-publish-save-state role="status" aria-live="polite" data-i18n="publish.unsaved">尚未保存</p>
                <div><button type="button" class="publish-secondary-action" data-save-draft data-i18n="publish.save">保存草稿</button><button type="submit" class="publish-primary-action" data-submit-review data-i18n="publish.submit">提交审核</button></div>
            </footer>
        </form>
    </main>
${SHARED_FOOTER}
    <script src="/script.js?v=20260905-centered-side-arc"></script>
</body>
</html>`;
}

function myArticlesPageHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
${seoHead('我的文章 - Rowan Notes', '查看你的草稿、待审核与已发布文章。', '/my-articles')}
</head>
<body class="min-h-screen flex flex-col theme-anzhiyu my-articles-page">
${SHARED_NAV}
    <main class="flex-1 my-articles-shell" data-my-articles-page>
        <header class="publish-heading"><div><p class="publish-kicker" data-i18n="myArticles.kicker">创作记录</p><h1 data-i18n="myArticles.title">我的文章</h1></div><a href="/publish" class="publish-primary-action" data-i18n="nav.publish">发布文章</a></header>
        <section class="my-article-preview hidden" data-my-article-preview aria-live="polite"></section>
        <div class="my-articles-tabs" role="tablist" aria-label="文章状态">
            <button type="button" class="is-active" role="tab" aria-selected="true" data-my-articles-status="draft" data-i18n="myArticles.draft">草稿</button>
            <button type="button" role="tab" aria-selected="false" data-my-articles-status="pending" data-i18n="myArticles.pending">待审核</button>
            <button type="button" role="tab" aria-selected="false" data-my-articles-status="published" data-i18n="myArticles.published">已发布</button>
            <button type="button" role="tab" aria-selected="false" data-my-articles-status="rejected" data-i18n="myArticles.rejected">未通过</button>
        </div>
        <div class="my-articles-list" data-my-articles-list data-my-articles><p data-i18n="myArticles.loading">正在加载文章...</p></div>
    </main>
${SHARED_FOOTER}
    <script src="/script.js?v=20260905-centered-side-arc"></script>
</body>
</html>`;
}

function notificationsPageHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
${seoHead('我的消息 - Rowan Notes', '查看评论回复、投稿审核和客服回复消息。', '/notifications')}
</head>
<body class="min-h-screen flex flex-col theme-anzhiyu notifications-page">
${SHARED_NAV}
    <main class="flex-1 notifications-shell" data-notifications-page>
        <header class="notifications-heading">
            <div>
                <p class="notifications-kicker" data-i18n="notifications.kicker">我的消息</p>
                <h1 data-i18n="notifications.title">我的消息</h1>
                <p data-notification-summary data-i18n="notifications.subtitle">评论回复、审核结果和客服消息都会出现在这里。</p>
            </div>
            <button type="button" class="notifications-read-all" data-notifications-read-all data-i18n="notifications.readAll">全部已读</button>
        </header>
        <section class="notifications-list" data-notifications-list aria-live="polite" aria-busy="true">
            <p class="notifications-state" data-i18n="notifications.loading">正在加载消息...</p>
        </section>
        <button type="button" class="notifications-load-more hidden" data-notifications-load-more data-i18n="notifications.loadMore">加载更多</button>
        <p class="notifications-status" data-notifications-status role="status" aria-live="polite"></p>
    </main>
${SHARED_FOOTER}
    <script src="/script.js?v=20260905-centered-side-arc"></script>
</body>
</html>`;
}

function sitemapXml(articles) {
  const urls = [
    { loc: 'https://blog.858846.xyz/', changefreq: 'daily', priority: '1.0' },
    { loc: 'https://blog.858846.xyz/articles', changefreq: 'daily', priority: '0.9' },
    { loc: 'https://blog.858846.xyz/about', changefreq: 'monthly', priority: '0.7' },
    { loc: 'https://blog.858846.xyz/bookmarks', changefreq: 'weekly', priority: '0.5' },
    ...articles.map(a => ({ loc: `https://blog.858846.xyz/article/${a.permalink}`, changefreq: 'weekly', priority: '0.8' }))
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `    <url>
        <loc>${u.loc}</loc>
        <changefreq>${u.changefreq}</changefreq>
        <priority>${u.priority}</priority>
    </url>`).join('\n')}
</urlset>`;
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function renderMarkdown(markdown) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let paragraph = [];
  let list = [];
  let orderedList = [];
  let orderedListStart = 1;
  let code = [];
  let inCode = false;

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!list.length) return;
    html.push(`<ul>${list.map(item => `<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`);
    list = [];
  }

  function flushOrderedList() {
    if (!orderedList.length) return;
    const start = orderedListStart > 1 ? ` start="${orderedListStart}"` : '';
    html.push(`<ol${start}>${orderedList.map(item => `<li>${inlineMarkdown(item)}</li>`).join('')}</ol>`);
    orderedList = [];
    orderedListStart = 1;
  }

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        flushOrderedList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      flushOrderedList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      flushOrderedList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const image = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)$/);
    if (image) {
      flushParagraph();
      flushList();
      flushOrderedList();
      const alt = escapeHtml(image[1] || '');
      const src = escapeAttr(image[2] || '');
      const caption = image[3] ? `<figcaption>${inlineMarkdown(image[3])}</figcaption>` : '';
      html.push(`<figure class="article-figure"><img src="${src}" alt="${alt}" loading="lazy">${caption}</figure>`);
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      flushOrderedList();
      list.push(bullet[1]);
      continue;
    }

    const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      flushList();
      if (!orderedList.length) orderedListStart = Number.parseInt(trimmed, 10) || 1;
      orderedList.push(ordered[1]);
      continue;
    }

    const quote = trimmed.match(/^>\s*(.+)$/);
    if (quote) {
      flushParagraph();
      flushList();
      flushOrderedList();
      html.push(`<blockquote><p>${inlineMarkdown(quote[1])}</p></blockquote>`);
      continue;
    }

    flushList();
    flushOrderedList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushOrderedList();
  if (inCode) html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);

  return html.join('\n') || '<p>No content available.</p>';
}

// ─── API Handlers ────────────────────────────────────────────

function userArticleAssetDto(asset) {
  return {
    id: asset.id,
    url: `/media/user-articles/${asset.id}`,
    mimeType: asset.mime_type,
    sizeBytes: asset.size_bytes,
    width: asset.width,
    height: asset.height,
    altText: asset.alt_text || '',
    caption: asset.caption || '',
    createdAt: asset.created_at
  };
}

function userArticleDto(article, assets = []) {
  const effectiveStatus = article.review_status === 'rejected' ? 'rejected' : article.status;
  return {
    id: article.id,
    title: article.title || '',
    permalink: article.permalink || '',
    category: article.category || '',
    excerpt: article.excerpt || '',
    contentMarkdown: article.content_markdown || '',
    coverAssetId: article.cover_asset_id || null,
    publishedPermalink: article.published_permalink || null,
    status: effectiveStatus,
    version: article.version,
    createdAt: article.created_at,
    updatedAt: article.updated_at,
    submittedAt: article.submitted_at || null,
    publishedAt: article.published_at || null,
    reviewedAt: article.reviewed_at || null,
    assets: assets.map(userArticleAssetDto)
  };
}

function userArticleText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeUserArticlePermalink(value) {
  return userArticleText(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+$/g, '');
}

function userArticleVersion(body) {
  return Number.isInteger(body?.version) && body.version > 0 ? body.version : null;
}

function validationErrorResponse(validation) {
  return jsonResponse({ error: validation.code, field: validation.field }, { status: 400 });
}

async function readUserArticleJson(request) {
  const mediaType = (request.headers.get('Content-Type') || '').split(';', 1)[0].trim().toLowerCase();
  if (mediaType !== 'application/json') {
    return {
      body: null,
      response: jsonResponse({ error: 'UNSUPPORTED_MEDIA_TYPE' }, { status: 415 })
    };
  }

  const declaredLength = request.headers.get('Content-Length');
  if (/^\d+$/.test(declaredLength || '') && Number(declaredLength) > USER_ARTICLE_JSON_MAX_BYTES) {
    return {
      body: null,
      response: jsonResponse({ error: 'PAYLOAD_TOO_LARGE' }, { status: 413 })
    };
  }

  const reader = request.body?.getReader();
  const chunks = [];
  let byteLength = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
      byteLength += chunk.byteLength;
      if (byteLength > USER_ARTICLE_JSON_MAX_BYTES) {
        await reader.cancel().catch(() => {});
        return {
          body: null,
          response: jsonResponse({ error: 'PAYLOAD_TOO_LARGE' }, { status: 413 })
        };
      }
      chunks.push(chunk);
    }
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { body: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), response: null };
  } catch {
    return {
      body: null,
      response: jsonResponse({ error: 'INVALID_JSON' }, { status: 400 })
    };
  }
}

function hasOwn(object, field) {
  return object !== null
    && typeof object === 'object'
    && Object.prototype.hasOwnProperty.call(object, field);
}

function validateUserArticleFieldTypes(body) {
  for (const field of [
    'title',
    'permalink',
    'category',
    'excerpt',
    'content',
    'contentMarkdown',
    'content_markdown'
  ]) {
    if (hasOwn(body, field) && typeof body[field] !== 'string') {
      return { error: 'INVALID_FIELD_TYPE', field };
    }
  }
  for (const field of ['coverAssetId', 'cover_asset_id']) {
    if (hasOwn(body, field) && body[field] !== null && typeof body[field] !== 'string') {
      return { error: 'INVALID_FIELD_TYPE', field };
    }
  }
  return null;
}

function firstProvidedValue(body, fields, fallback) {
  for (const field of fields) {
    if (hasOwn(body, field)) return body[field];
  }
  return fallback;
}

async function loadOwnedUserArticle(env, articleId, userId) {
  return env.BLOG_DB.prepare(
    'SELECT * FROM blog_user_articles WHERE id = ? AND user_id = ? LIMIT 1'
  ).bind(articleId, userId).first();
}

async function loadOwnedUserArticleAssets(env, articleId, userId) {
  const { results } = await env.BLOG_DB.prepare(
    `SELECT id, mime_type, size_bytes, width, height, alt_text, caption, created_at
     FROM blog_user_article_assets
     WHERE article_id = ? AND user_id = ?
     ORDER BY created_at ASC`
  ).bind(articleId, userId).all();
  return results || [];
}

async function classifyUserArticleMutationFailure(env, articleId, userId) {
  const current = await loadOwnedUserArticle(env, articleId, userId);
  if (!current) return jsonResponse({ error: 'ARTICLE_NOT_FOUND' }, { status: 404 });
  if (!canUserEditSubmission(current)) {
    return jsonResponse({ error: 'ARTICLE_LOCKED' }, { status: 409 });
  }
  return jsonResponse({ error: 'VERSION_CONFLICT' }, { status: 409 });
}

async function handleCreateUserArticle(request, env) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;

  const now = new Date().toISOString();
  const article = {
    id: crypto.randomUUID(),
    user_id: auth.user.id,
    title: '',
    permalink: '',
    category: '',
    excerpt: '',
    content_markdown: '',
    cover_asset_id: null,
    published_permalink: null,
    status: 'draft',
    version: 1,
    created_at: now,
    updated_at: now,
    submitted_at: null,
    published_at: null
  };
  await env.BLOG_DB.prepare(
    `INSERT INTO blog_user_articles
      (id, user_id, title, permalink, category, excerpt, content_markdown, cover_asset_id, status, version, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?)`
  ).bind(
    article.id,
    article.user_id,
    article.title,
    article.permalink,
    article.category,
    article.excerpt,
    article.content_markdown,
    article.cover_asset_id,
    now,
    now
  ).run();
  return jsonResponse({ article: userArticleDto(article) }, { status: 201 });
}

async function handleListUserArticles(request, env) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;

  const { results } = await env.BLOG_DB.prepare(
    `SELECT * FROM blog_user_articles
     WHERE user_id = ?
     ORDER BY updated_at DESC`
  ).bind(auth.user.id).all();
  return jsonResponse({ articles: (results || []).map(article => userArticleDto(article)) });
}

async function handleGetUserArticle(request, env, articleId) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;

  const article = await loadOwnedUserArticle(env, articleId, auth.user.id);
  if (!article) return jsonResponse({ error: 'ARTICLE_NOT_FOUND' }, { status: 404 });
  const assets = await loadOwnedUserArticleAssets(env, articleId, auth.user.id);
  return jsonResponse({ article: userArticleDto(article, assets) });
}

async function handleDeleteUserArticle(request, env, articleId) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;
  const originResponse = requireSameOrigin(request);
  if (originResponse) return originResponse;

  const article = await loadOwnedUserArticle(env, articleId, auth.user.id);
  if (!article) return jsonResponse({ error: 'ARTICLE_NOT_FOUND' }, { status: 404 });
  if (!canUserEditSubmission(article)) {
    return jsonResponse({ error: 'ARTICLE_LOCKED' }, { status: 409 });
  }

  const assets = await loadOwnedUserArticleAssets(env, articleId, auth.user.id);
  if (assets.length && !env.BLOG_MEDIA) return mediaStorageUnavailable();

  const queuedKeys = [];
  try {
    for (const asset of assets) {
      await createUserArticleMediaCleanupIntent(env, {
        objectKey: asset.object_key,
        assetId: asset.id,
        articleId,
        userId: auth.user.id
      });
      queuedKeys.push(asset.object_key);
    }
    const { results } = await env.BLOG_DB.prepare(
      `DELETE FROM blog_user_articles
       WHERE id = ? AND user_id = ? AND status = 'draft'
       RETURNING id`
    ).bind(articleId, auth.user.id).all();
    if (!results?.[0]) {
      for (const objectKey of queuedKeys) {
        await removeUserArticleMediaCleanupIntent(env, objectKey).catch(() => {});
      }
      return classifyUserArticleMutationFailure(env, articleId, auth.user.id);
    }
  } catch {
    for (const objectKey of queuedKeys) {
      await removeUserArticleMediaCleanupIntent(env, objectKey).catch(() => {});
    }
    return mediaDatabaseUnavailable();
  }

  for (const asset of assets) {
    await activateUserArticleMediaCleanup(env, asset.object_key, 'DRAFT_DELETED');
    if (await deleteUserArticleMediaWithRetry(env, asset.object_key)) {
      await removeUserArticleMediaCleanupIntent(env, asset.object_key).catch(() => {});
    }
  }
  return jsonResponse({ ok: true });
}

async function handleUpdateUserArticle(request, env, articleId) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;
  const parsed = await readUserArticleJson(request);
  if (parsed.response) return parsed.response;
  const body = parsed.body;
  const invalidField = validateUserArticleFieldTypes(body);
  if (invalidField) return jsonResponse(invalidField, { status: 400 });
  const version = userArticleVersion(body);
  if (!version) return jsonResponse({ error: 'INVALID_VERSION', field: 'version' }, { status: 400 });

  const article = await loadOwnedUserArticle(env, articleId, auth.user.id);
  if (!article) return jsonResponse({ error: 'ARTICLE_NOT_FOUND' }, { status: 404 });
  if (!canUserEditSubmission(article)) {
    return jsonResponse({ error: 'ARTICLE_LOCKED' }, { status: 409 });
  }
  if (article.version !== version) {
    return jsonResponse({ error: 'VERSION_CONFLICT' }, { status: 409 });
  }

  const assets = await loadOwnedUserArticleAssets(env, articleId, auth.user.id);
  const title = userArticleText(firstProvidedValue(body, ['title'], article.title));
  const category = userArticleText(firstProvidedValue(body, ['category'], article.category));
  const excerpt = userArticleText(firstProvidedValue(body, ['excerpt'], article.excerpt));
  const contentMarkdown = userArticleText(firstProvidedValue(
    body,
    ['content_markdown', 'contentMarkdown', 'content'],
    article.content_markdown
  ));
  const validation = validateSubmission({
    title,
    category,
    excerpt,
    content: contentMarkdown,
    imageCount: assets.length
  });
  if (validation) return validationErrorResponse(validation);

  const hasCover = hasOwn(body, 'coverAssetId') || hasOwn(body, 'cover_asset_id');
  const coverAssetId = hasCover
    ? userArticleText(firstProvidedValue(body, ['coverAssetId', 'cover_asset_id'], '')) || null
    : article.cover_asset_id;
  if (coverAssetId && !assets.some(asset => asset.id === coverAssetId)) {
    return jsonResponse({ error: 'INVALID_COVER_ASSET', field: 'coverAssetId' }, { status: 400 });
  }

  const requestedPermalink = hasOwn(body, 'permalink')
    ? body.permalink
    : article.permalink;
  const permalink = normalizeUserArticlePermalink(requestedPermalink)
    || normalizeUserArticlePermalink(title);
  const now = new Date().toISOString();
  const { results } = await env.BLOG_DB.prepare(
    `UPDATE blog_user_articles
     SET title = ?, permalink = ?, category = ?, excerpt = ?, content_markdown = ?,
         cover_asset_id = ?, version = version + 1, updated_at = ?
     WHERE id = ? AND user_id = ? AND status = 'draft' AND version = ?
     RETURNING *`
  ).bind(
    title,
    permalink,
    category,
    excerpt,
    contentMarkdown,
    coverAssetId,
    now,
    articleId,
    auth.user.id,
    version
  ).all();
  const updated = results?.[0];
  if (!updated) {
    return classifyUserArticleMutationFailure(env, articleId, auth.user.id);
  }
  return jsonResponse({ article: userArticleDto(updated, assets) });
}

async function handleSubmitUserArticle(request, env, articleId) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;
  const parsed = await readUserArticleJson(request);
  if (parsed.response) return parsed.response;
  const body = parsed.body;
  const version = userArticleVersion(body);
  if (!version) return jsonResponse({ error: 'INVALID_VERSION', field: 'version' }, { status: 400 });

  const article = await loadOwnedUserArticle(env, articleId, auth.user.id);
  if (!article) return jsonResponse({ error: 'ARTICLE_NOT_FOUND' }, { status: 404 });
  if (!canUserEditSubmission(article)) {
    return jsonResponse({ error: 'ARTICLE_LOCKED' }, { status: 409 });
  }
  if (article.version !== version) {
    return jsonResponse({ error: 'VERSION_CONFLICT' }, { status: 409 });
  }

  const assets = await loadOwnedUserArticleAssets(env, articleId, auth.user.id);
  const validation = validateSubmission({
    title: article.title,
    category: article.category,
    excerpt: article.excerpt,
    content: article.content_markdown,
    imageCount: assets.length
  }, { requireComplete: true });
  if (validation) return validationErrorResponse(validation);
  if (article.cover_asset_id && !assets.some(asset => asset.id === article.cover_asset_id)) {
    return jsonResponse({ error: 'INVALID_COVER_ASSET', field: 'coverAssetId' }, { status: 400 });
  }

  const fallbackSuffix = String(article.id).replace(/[^a-z0-9]/gi, '').slice(-8).toLowerCase() || 'draft';
  const permalink = normalizeUserArticlePermalink(article.permalink)
    || normalizeUserArticlePermalink(article.title)
    || `article-${fallbackSuffix}`;
  const now = new Date().toISOString();
  const { results } = await env.BLOG_DB.prepare(
    `UPDATE blog_user_articles
     SET permalink = ?, status = 'pending', submitted_at = ?, updated_at = ?, version = version + 1
     WHERE id = ? AND user_id = ? AND status = 'draft' AND version = ?
     RETURNING *`
  ).bind(permalink, now, now, articleId, auth.user.id, version).all();
  const submitted = results?.[0];
  if (!submitted) {
    return classifyUserArticleMutationFailure(env, articleId, auth.user.id);
  }
  return jsonResponse({ article: userArticleDto(submitted, assets) });
}

function mediaDatabaseUnavailable() {
  return jsonResponse({ error: 'MEDIA_DATABASE_UNAVAILABLE' }, { status: 503 });
}

function mediaStorageUnavailable() {
  return jsonResponse({ error: 'MEDIA_STORAGE_UNAVAILABLE' }, { status: 503 });
}

function requireSameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (origin && origin === new URL(request.url).origin) return null;
  return jsonResponse({ error: 'ORIGIN_NOT_ALLOWED' }, { status: 403 });
}

function normalizeImageMimeType(value) {
  const mimeType = String(value || '').split(';', 1)[0].trim().toLowerCase();
  if (mimeType === 'image/jpg' || mimeType === 'image/pjpeg') return 'image/jpeg';
  return mimeType;
}

function imageExtension(mimeType) {
  return ({
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp'
  })[mimeType] || '';
}

function hasValidImageExtension(filename, mimeType) {
  const extension = String(filename || '').match(/\.([^.]+)$/)?.[1]?.toLowerCase() || '';
  if (mimeType === 'image/jpeg') return extension === 'jpg' || extension === 'jpeg';
  return extension === imageExtension(mimeType);
}

async function checkUserArticleStorageQuota(env, userId, incomingBytes) {
  const usage = await env.BLOG_DB.prepare(
    `SELECT
       COALESCE(SUM(size_bytes), 0) AS total_bytes,
       COALESCE(SUM(CASE WHEN user_id = ? THEN size_bytes ELSE 0 END), 0) AS user_bytes
     FROM blog_user_article_assets`
  ).bind(userId).first();
  const totalBytes = Number(usage?.total_bytes || 0);
  const userBytes = Number(usage?.user_bytes || 0);
  return {
    allowed: totalBytes + incomingBytes <= ARTICLE_LIMITS.totalStorageBytes
      && userBytes + incomingBytes <= ARTICLE_LIMITS.userStorageBytes,
    totalBytes,
    userBytes
  };
}

async function loadOwnedDraftForAssetMutation(env, articleId, userId) {
  const article = await loadOwnedUserArticle(env, articleId, userId);
  if (!article) return { article: null, response: jsonResponse({ error: 'ARTICLE_NOT_FOUND' }, { status: 404 }) };
  if (!canUserEditSubmission(article)) {
    return { article: null, response: jsonResponse({ error: 'ARTICLE_LOCKED' }, { status: 409 }) };
  }
  return { article, response: null };
}

async function loadOwnedUserArticleAsset(env, articleId, assetId, userId) {
  return env.BLOG_DB.prepare(
    `SELECT id, article_id, user_id, object_key, mime_type, size_bytes,
            width, height, alt_text, caption, created_at
     FROM blog_user_article_assets
     WHERE id = ? AND article_id = ? AND user_id = ?
     LIMIT 1`
  ).bind(assetId, articleId, userId).first();
}

async function classifyAssetMutationFailure(env, articleId, userId, draftError) {
  const article = await loadOwnedUserArticle(env, articleId, userId);
  if (!article) return jsonResponse({ error: 'ARTICLE_NOT_FOUND' }, { status: 404 });
  if (!canUserEditSubmission(article)) {
    return jsonResponse({ error: 'ARTICLE_LOCKED' }, { status: 409 });
  }
  return jsonResponse({ error: draftError }, { status: draftError === 'IMAGE_LIMIT_REACHED' ? 409 : 404 });
}

async function restoreUserArticleMedia(env, objectKey, backup) {
  if (!backup) return true;
  try {
    await env.BLOG_MEDIA.put(objectKey, backup.bytes, {
      httpMetadata: backup.httpMetadata,
      customMetadata: backup.customMetadata
    });
    return true;
  } catch {
    return false;
  }
}

async function deleteUserArticleMediaWithRetry(env, objectKey, attempts = 3) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await env.BLOG_MEDIA.delete(objectKey);
      return true;
    } catch {}
  }
  return false;
}

function cleanupRetryAt(attempts, now = Date.now()) {
  const delaySeconds = Math.min(24 * 60 * 60, 60 * (2 ** Math.min(attempts, 10)));
  return new Date(now + delaySeconds * 1000).toISOString();
}

async function createUserArticleMediaCleanupIntent(env, item) {
  const now = new Date().toISOString();
  const gracePeriod = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await env.BLOG_DB.prepare(
    `INSERT INTO blog_user_article_media_cleanup
      (object_key, asset_id, article_id, user_id, queued_at, attempts,
       next_attempt_at, last_attempt_at, last_error)
     VALUES (?, ?, ?, ?, ?, 0, ?, NULL, ?)`
  ).bind(
    item.objectKey,
    item.assetId,
    item.articleId,
    item.userId,
    now,
    gracePeriod,
    'UPLOAD_IN_PROGRESS'
  ).run();
}

async function removeUserArticleMediaCleanupIntent(env, objectKey) {
  await env.BLOG_DB.prepare(
    'DELETE FROM blog_user_article_media_cleanup WHERE object_key = ?'
  ).bind(objectKey).run();
}

async function activateUserArticleMediaCleanup(env, objectKey, lastError) {
  const now = new Date().toISOString();
  await env.BLOG_DB.prepare(
    `UPDATE blog_user_article_media_cleanup
     SET next_attempt_at = ?, last_error = ?
     WHERE object_key = ?`
  ).bind(now, lastError, objectKey).run();
}

async function reconcileUserArticleMediaCleanup(env, limit = 3) {
  let queued;
  const now = new Date().toISOString();
  try {
    const { results } = await env.BLOG_DB.prepare(
      `SELECT object_key, asset_id, article_id, user_id, attempts
       FROM blog_user_article_media_cleanup
       WHERE next_attempt_at <= ?
       ORDER BY next_attempt_at ASC, queued_at ASC
       LIMIT ?`
    ).bind(now, limit).all();
    queued = results || [];
  } catch {
    return;
  }

  for (const item of queued) {
    let referenced;
    try {
      referenced = await env.BLOG_DB.prepare(
        'SELECT id FROM blog_user_article_assets WHERE object_key = ? LIMIT 1'
      ).bind(item.object_key).first();
    } catch {
      continue;
    }

    if (referenced) {
      try {
        await env.BLOG_DB.prepare(
          'DELETE FROM blog_user_article_media_cleanup WHERE object_key = ?'
        ).bind(item.object_key).run();
      } catch {}
      continue;
    }

    try {
      await env.BLOG_MEDIA.delete(item.object_key);
    } catch {
      try {
        const attempts = Number(item.attempts || 0) + 1;
        await env.BLOG_DB.prepare(
          `UPDATE blog_user_article_media_cleanup
           SET attempts = ?, next_attempt_at = ?, last_attempt_at = ?, last_error = ?
           WHERE object_key = ?`
        ).bind(
          attempts,
          cleanupRetryAt(attempts),
          new Date().toISOString(),
          'R2_DELETE_FAILED',
          item.object_key
        ).run();
      } catch {}
      continue;
    }

    try {
      await env.BLOG_DB.prepare(
        'DELETE FROM blog_user_article_media_cleanup WHERE object_key = ?'
      ).bind(item.object_key).run();
    } catch {}
  }
}

async function readBoundedMultipartFormData(request) {
  const reader = request.body?.getReader();
  if (!reader) {
    return { form: null, response: jsonResponse({ error: 'INVALID_MULTIPART' }, { status: 400 }) };
  }
  const chunks = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
      byteLength += chunk.byteLength;
      if (byteLength > ARTICLE_LIMITS.imageBytes + USER_ARTICLE_MULTIPART_OVERHEAD_BYTES) {
        await reader.cancel().catch(() => {});
        return { form: null, response: jsonResponse({ error: 'IMAGE_TOO_LARGE' }, { status: 413 }) };
      }
      chunks.push(chunk);
    }
  } catch {
    return { form: null, response: jsonResponse({ error: 'INVALID_MULTIPART' }, { status: 400 }) };
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const response = new Response(bytes, {
      headers: { 'Content-Type': request.headers.get('Content-Type') || '' }
    });
    return { form: await response.formData(), response: null };
  } catch {
    return { form: null, response: jsonResponse({ error: 'INVALID_MULTIPART' }, { status: 400 }) };
  }
}

function readUint32BigEndian(bytes, offset) {
  return ((bytes[offset] * 0x1000000)
    + (bytes[offset + 1] << 16)
    + (bytes[offset + 2] << 8)
    + bytes[offset + 3]) >>> 0;
}

function bytesLabel(bytes, offset, length) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function hasValidJpegStructure(bytes) {
  if (bytes.length < 8 || bytes[0] !== 0xff || bytes[1] !== 0xd8
      || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) return false;
  let offset = 2;
  let hasFrame = false;
  while (offset < bytes.length - 2) {
    if (bytes[offset] !== 0xff) return false;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    if (marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 1;
      continue;
    }
    if (offset + 2 >= bytes.length) return false;
    const segmentLength = (bytes[offset + 1] << 8) | bytes[offset + 2];
    if (segmentLength < 2 || offset + 1 + segmentLength > bytes.length) return false;
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7)
        || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      if (segmentLength < 7) return false;
      const height = (bytes[offset + 4] << 8) | bytes[offset + 5];
      const width = (bytes[offset + 6] << 8) | bytes[offset + 7];
      if (!width || !height) return false;
      hasFrame = true;
    }
    if (marker === 0xda) return hasFrame;
    offset += segmentLength + 1;
  }
  return false;
}

function hasValidPngStructure(bytes) {
  if (bytes.length < 33) return false;
  let offset = 8;
  let hasHeader = false;
  while (offset + 12 <= bytes.length) {
    const length = readUint32BigEndian(bytes, offset);
    const type = bytesLabel(bytes, offset + 4, 4);
    const next = offset + 12 + length;
    if (next > bytes.length) return false;
    if (!hasHeader) {
      if (type !== 'IHDR' || length !== 13) return false;
      if (!readUint32BigEndian(bytes, offset + 8) || !readUint32BigEndian(bytes, offset + 12)) return false;
      hasHeader = true;
    }
    if (type === 'IEND') return hasHeader && length === 0 && next === bytes.length;
    offset = next;
  }
  return false;
}

function hasValidGifStructure(bytes) {
  if (bytes.length < 15 || bytes[bytes.length - 1] !== 0x3b) return false;
  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  return width > 0 && height > 0 && bytes.includes(0x2c, 13);
}

function hasValidWebpStructure(bytes) {
  if (bytes.length < 20 || bytesLabel(bytes, 0, 4) !== 'RIFF' || bytesLabel(bytes, 8, 4) !== 'WEBP') {
    return false;
  }
  if (readUint32BigEndian(Uint8Array.from([bytes[7], bytes[6], bytes[5], bytes[4]]), 0) + 8 !== bytes.length) {
    return false;
  }
  const chunkType = bytesLabel(bytes, 12, 4);
  if (!['VP8 ', 'VP8L', 'VP8X'].includes(chunkType)) return false;
  const chunkLength = bytes[16] | (bytes[17] << 8) | (bytes[18] << 16) | (bytes[19] << 24);
  return chunkLength > 0 && 20 + chunkLength + (chunkLength % 2) <= bytes.length;
}

function hasValidImageStructure(bytes, mimeType) {
  if (mimeType === 'image/jpeg') return hasValidJpegStructure(bytes);
  if (mimeType === 'image/png') return hasValidPngStructure(bytes);
  if (mimeType === 'image/gif') return hasValidGifStructure(bytes);
  if (mimeType === 'image/webp') return hasValidWebpStructure(bytes);
  return false;
}

async function handleUploadUserArticleAsset(request, env, articleId) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;
  const originResponse = requireSameOrigin(request);
  if (originResponse) return originResponse;
  if (!env.BLOG_MEDIA) return mediaStorageUnavailable();
  await reconcileUserArticleMediaCleanup(env);

  let existingAssets;
  try {
    const draft = await loadOwnedDraftForAssetMutation(env, articleId, auth.user.id);
    if (draft.response) return draft.response;
    existingAssets = await loadOwnedUserArticleAssets(env, articleId, auth.user.id);
  } catch {
    return mediaDatabaseUnavailable();
  }
  if (existingAssets.length >= ARTICLE_LIMITS.images) {
    return jsonResponse({ error: 'IMAGE_LIMIT_REACHED' }, { status: 409 });
  }

  const mediaType = (request.headers.get('Content-Type') || '').toLowerCase();
  if (!mediaType.startsWith('multipart/form-data;')) {
    return jsonResponse({ error: 'UNSUPPORTED_MEDIA_TYPE' }, { status: 415 });
  }
  const declaredLength = request.headers.get('Content-Length');
  if (/^\d+$/.test(declaredLength || '')
      && Number(declaredLength) > ARTICLE_LIMITS.imageBytes + USER_ARTICLE_MULTIPART_OVERHEAD_BYTES) {
    return jsonResponse({ error: 'IMAGE_TOO_LARGE' }, { status: 413 });
  }

  const parsedMultipart = await readBoundedMultipartFormData(request);
  if (parsedMultipart.response) return parsedMultipart.response;
  const form = parsedMultipart.form;
  const images = form.getAll('image');
  const file = images[0];
  if (images.length !== 1 || !file || typeof file.stream !== 'function' || typeof file.size !== 'number') {
    return jsonResponse({ error: 'IMAGE_REQUIRED' }, { status: 400 });
  }
  if (file.size > ARTICLE_LIMITS.imageBytes) {
    return jsonResponse({ error: 'IMAGE_TOO_LARGE' }, { status: 413 });
  }

  try {
    const quota = await checkUserArticleStorageQuota(env, auth.user.id, file.size);
    if (!quota.allowed) {
      return jsonResponse({ error: 'STORAGE_QUOTA_REACHED' }, { status: 507 });
    }
  } catch {
    return mediaDatabaseUnavailable();
  }

  const imageBytes = new Uint8Array(await file.arrayBuffer());
  const detectedMime = detectImageType(imageBytes.subarray(0, 16));
  if (!detectedMime || !imageExtension(detectedMime)) {
    return jsonResponse({ error: 'INVALID_IMAGE_TYPE' }, { status: 400 });
  }
  const declaredMime = normalizeImageMimeType(file.type);
  if (declaredMime !== detectedMime) {
    return jsonResponse({ error: 'MIME_MISMATCH' }, { status: 400 });
  }
  if (!hasValidImageExtension(file.name, detectedMime)) {
    return jsonResponse({ error: 'INVALID_FILE_EXTENSION' }, { status: 400 });
  }
  if (!hasValidImageStructure(imageBytes, detectedMime)) {
    return jsonResponse({ error: 'INVALID_IMAGE_STRUCTURE' }, { status: 400 });
  }

  const assetId = crypto.randomUUID();
  const objectKey = `user-articles/${auth.user.id}/${articleId}/${assetId}.${imageExtension(detectedMime)}`;
  try {
    await createUserArticleMediaCleanupIntent(env, {
      objectKey,
      assetId,
      articleId,
      userId: auth.user.id
    });
  } catch {
    return mediaDatabaseUnavailable();
  }
  try {
    await env.BLOG_MEDIA.put(objectKey, file.stream(), {
      httpMetadata: { contentType: detectedMime },
      customMetadata: { articleId, userId: auth.user.id }
    });
  } catch {
    try {
      await removeUserArticleMediaCleanupIntent(env, objectKey);
    } catch {}
    return mediaStorageUnavailable();
  }

  const createdAt = new Date().toISOString();
  let inserted;
  try {
    const { results } = await env.BLOG_DB.prepare(
      `INSERT INTO blog_user_article_assets
        (id, article_id, user_id, object_key, mime_type, size_bytes, created_at)
       SELECT ?, ?, ?, ?, ?, ?, ?
       FROM blog_user_articles AS article
       WHERE article.id = ? AND article.user_id = ? AND article.status = 'draft'
         AND (
         SELECT COUNT(*)
         FROM blog_user_article_assets
         WHERE article_id = article.id AND user_id = article.user_id
       ) < ?
       RETURNING id, mime_type, size_bytes, width, height, alt_text, caption, created_at`
    ).bind(
      assetId,
      articleId,
      auth.user.id,
      objectKey,
      detectedMime,
      file.size,
      createdAt,
      articleId,
      auth.user.id,
      ARTICLE_LIMITS.images
    ).all();
    inserted = results?.[0];
  } catch {
    if (!await deleteUserArticleMediaWithRetry(env, objectKey)) {
      try {
        await activateUserArticleMediaCleanup(env, objectKey, 'D1_INSERT_FAILED_R2_DELETE_FAILED');
      } catch {}
      return jsonResponse({ error: 'MEDIA_CLEANUP_FAILED' }, { status: 503 });
    }
    try {
      await removeUserArticleMediaCleanupIntent(env, objectKey);
    } catch {}
    return mediaDatabaseUnavailable();
  }

  if (!inserted) {
    if (!await deleteUserArticleMediaWithRetry(env, objectKey)) {
      try {
        await activateUserArticleMediaCleanup(env, objectKey, 'D1_GATE_REJECTED_R2_DELETE_FAILED');
      } catch {}
      return jsonResponse({ error: 'MEDIA_CLEANUP_FAILED' }, { status: 503 });
    }
    try {
      await removeUserArticleMediaCleanupIntent(env, objectKey);
    } catch {}
    try {
      return await classifyAssetMutationFailure(
        env,
        articleId,
        auth.user.id,
        'IMAGE_LIMIT_REACHED'
      );
    } catch {
      return mediaDatabaseUnavailable();
    }
  }

  try {
    await removeUserArticleMediaCleanupIntent(env, objectKey);
  } catch {
    // The reconciler verifies the live asset reference before removing stale intent rows.
  }

  return jsonResponse({ asset: userArticleAssetDto(inserted) }, { status: 201 });
}

async function handleUpdateUserArticleAsset(request, env, articleId, assetId) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;
  const originResponse = requireSameOrigin(request);
  if (originResponse) return originResponse;
  if (!env.BLOG_MEDIA) return mediaStorageUnavailable();
  await reconcileUserArticleMediaCleanup(env);

  let current;
  try {
    const draft = await loadOwnedDraftForAssetMutation(env, articleId, auth.user.id);
    if (draft.response) return draft.response;
    current = await loadOwnedUserArticleAsset(env, articleId, assetId, auth.user.id);
    if (!current) return jsonResponse({ error: 'ASSET_NOT_FOUND' }, { status: 404 });
  } catch {
    return mediaDatabaseUnavailable();
  }

  const parsed = await readUserArticleJson(request);
  if (parsed.response) return parsed.response;
  const body = parsed.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonResponse({ error: 'INVALID_FIELD_TYPE' }, { status: 400 });
  }
  for (const field of ['altText', 'caption']) {
    if (hasOwn(body, field) && typeof body[field] !== 'string') {
      return jsonResponse({ error: 'INVALID_FIELD_TYPE', field }, { status: 400 });
    }
  }
  const unexpectedField = Object.keys(body).find(field => field !== 'altText' && field !== 'caption');
  if (unexpectedField) {
    return jsonResponse({ error: 'INVALID_FIELD', field: unexpectedField }, { status: 400 });
  }
  if (hasOwn(body, 'altText') && Array.from(body.altText).length > 160) {
    return jsonResponse({ error: 'ALT_TEXT_TOO_LONG', field: 'altText' }, { status: 400 });
  }
  if (hasOwn(body, 'caption') && Array.from(body.caption).length > 300) {
    return jsonResponse({ error: 'CAPTION_TOO_LONG', field: 'caption' }, { status: 400 });
  }

  try {
    const altText = hasOwn(body, 'altText') ? body.altText.trim() : current.alt_text;
    const caption = hasOwn(body, 'caption') ? body.caption.trim() : current.caption;
    const { results } = await env.BLOG_DB.prepare(
      `UPDATE blog_user_article_assets
       SET alt_text = ?, caption = ?
       WHERE id = ? AND article_id = ? AND user_id = ?
         AND EXISTS (
           SELECT 1
           FROM blog_user_articles AS article
           WHERE article.id = ? AND article.user_id = ? AND article.status = 'draft'
         )
       RETURNING id, mime_type, size_bytes, width, height, alt_text, caption, created_at`
    ).bind(
      altText,
      caption,
      assetId,
      articleId,
      auth.user.id,
      articleId,
      auth.user.id
    ).all();
    const updated = results?.[0];
    if (!updated) {
      return await classifyAssetMutationFailure(env, articleId, auth.user.id, 'ASSET_NOT_FOUND');
    }
    return jsonResponse({ asset: userArticleAssetDto(updated) });
  } catch {
    return mediaDatabaseUnavailable();
  }
}

async function handleDeleteUserArticleAsset(request, env, articleId, assetId) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;
  const originResponse = requireSameOrigin(request);
  if (originResponse) return originResponse;
  if (!env.BLOG_MEDIA) return mediaStorageUnavailable();
  await reconcileUserArticleMediaCleanup(env);

  let asset;
  try {
    const draft = await loadOwnedDraftForAssetMutation(env, articleId, auth.user.id);
    if (draft.response) return draft.response;
    asset = await loadOwnedUserArticleAsset(env, articleId, assetId, auth.user.id);
  } catch {
    return mediaDatabaseUnavailable();
  }
  if (!asset) return jsonResponse({ error: 'ASSET_NOT_FOUND' }, { status: 404 });

  let backup = null;
  try {
    const stored = await env.BLOG_MEDIA.get(asset.object_key);
    if (stored) {
      const bytes = new Uint8Array(await stored.arrayBuffer());
      if (bytes.byteLength > ARTICLE_LIMITS.imageBytes) return mediaStorageUnavailable();
      backup = {
        bytes,
        httpMetadata: stored.httpMetadata || { contentType: asset.mime_type },
        customMetadata: stored.customMetadata || {}
      };
    }
    await env.BLOG_MEDIA.delete(asset.object_key);
  } catch {
    return mediaStorageUnavailable();
  }
  try {
    const { results } = await env.BLOG_DB.prepare(
      `DELETE FROM blog_user_article_assets
       WHERE id = ? AND article_id = ? AND user_id = ?
         AND EXISTS (
           SELECT 1
           FROM blog_user_articles AS article
           WHERE article.id = ? AND article.user_id = ? AND article.status = 'draft'
         )
       RETURNING id`
    ).bind(assetId, articleId, auth.user.id, articleId, auth.user.id).all();
    if (!results?.[0]) {
      const currentArticle = await loadOwnedUserArticle(env, articleId, auth.user.id);
      if (!currentArticle) {
        return jsonResponse({ error: 'ARTICLE_NOT_FOUND' }, { status: 404 });
      }
      if (canUserEditSubmission(currentArticle)) {
        const currentAsset = await loadOwnedUserArticleAsset(env, articleId, assetId, auth.user.id);
        if (!currentAsset) {
          return jsonResponse({ error: 'ASSET_NOT_FOUND' }, { status: 404 });
        }
      }
      if (!await restoreUserArticleMedia(env, asset.object_key, backup)) {
        return mediaStorageUnavailable();
      }
      return await classifyAssetMutationFailure(env, articleId, auth.user.id, 'ASSET_NOT_FOUND');
    }
  } catch {
    if (!await restoreUserArticleMedia(env, asset.object_key, backup)) {
      return mediaStorageUnavailable();
    }
    return mediaDatabaseUnavailable();
  }
  return jsonResponse({ ok: true });
}

async function handleGetUserArticleMedia(request, env, assetId) {
  if (!env.BLOG_DB) return mediaDatabaseUnavailable();
  if (!env.BLOG_MEDIA) return mediaStorageUnavailable();

  const mediaCache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(request.url, { method: 'GET' });
  if (mediaCache) {
    const cached = await mediaCache.match(cacheKey);
    if (cached) return cached;
  }

  let asset;
  try {
    asset = await env.BLOG_DB.prepare(
      `SELECT asset.object_key, asset.mime_type,
              article.status AS article_status, article.user_id AS article_user_id
       FROM blog_user_article_assets AS asset
       JOIN blog_user_articles AS article ON article.id = asset.article_id
       WHERE asset.id = ?
       LIMIT 1`
    ).bind(assetId).first();
  } catch {
    return mediaDatabaseUnavailable();
  }
  if (!asset) return jsonResponse({ error: 'MEDIA_NOT_FOUND' }, { status: 404 });

  const isPublished = asset.article_status === 'published';
  if (!isPublished) {
    let allowed = await isAdminRequest(request, env);
    if (!allowed) {
      const tokenData = await verifyUserToken(parseCookies(request)[USER_COOKIE_NAME], env);
      if (tokenData?.id === asset.article_user_id) {
        try {
          allowed = Boolean(await env.BLOG_DB.prepare(
            'SELECT id FROM blog_users WHERE id = ? LIMIT 1'
          ).bind(tokenData.id).first());
        } catch {
          return mediaDatabaseUnavailable();
        }
      }
    }
    if (!allowed) return jsonResponse({ error: 'MEDIA_NOT_FOUND' }, { status: 404 });
  }

  let object;
  try {
    object = await env.BLOG_MEDIA.get(asset.object_key);
  } catch {
    return mediaStorageUnavailable();
  }
  if (!object) return jsonResponse({ error: 'MEDIA_NOT_FOUND' }, { status: 404 });

  const response = new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || asset.mime_type,
      'Cache-Control': isPublished ? 'public, max-age=31536000, immutable' : 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
  if (isPublished && mediaCache) {
    await mediaCache.put(cacheKey, response.clone());
  }
  return response;
}

async function handleGetArticles(request, env) {
  const url = new URL(request.url);
  const paginate = url.searchParams.get('paginate') === 'true';
  const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize')) || 9));

  const allArticles = await getAllArticles(env);

  if (paginate) {
    const totalArticles = allArticles.length;
    const totalPages = Math.max(1, Math.ceil(totalArticles / pageSize));
    const start = (page - 1) * pageSize;
    const articles = allArticles.slice(start, start + pageSize).map(({ content, ...rest }) => rest);
    return jsonResponse({
      articles,
      pagination: {
        page,
        pageSize,
        totalPages,
        totalArticles,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages
      }
    });
  }
  return jsonResponse({ articles: allArticles.map(({ content, ...rest }) => rest) });
}

async function handleArticlePage(request, env, permalink) {
  const article = await getArticle(env, permalink);
  if (!article) return htmlResponse(notFoundHtml(), { status: 404 });
  return htmlResponse(articlePageHtml(article), {
    headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' }
  });
}

async function handleAdminLogin(request, env) {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  const body = await request.json().catch(() => ({}));
  const password = normalizeText(body.password, 200);
  const adminPassword = normalizeText(env.ADMIN_PASSWORD || env.CONTACT_VIEW_CODE, 200);
  if (!adminPassword || password !== adminPassword) {
    return jsonResponse({ error: 'Invalid password' }, { status: 401 });
  }
  const token = await createAdminToken(env);
  if (!token) return jsonResponse({ error: 'Server config error' }, { status: 500 });
  return jsonResponse({ ok: true }, {
    headers: { 'Set-Cookie': adminCookie(token) }
  });
}

async function handleAdminLogout() {
  return jsonResponse({ ok: true }, {
    headers: { 'Set-Cookie': `${ADMIN_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0` }
  });
}

async function handleAdminSession(request, env) {
  return jsonResponse({ authenticated: await isAdminRequest(request, env) });
}

async function handleAdminCreateArticle(request, env) {
  const authError = await requireAdmin(request, env);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const title = normalizeText(body.title, 200);
  const excerpt = normalizeText(body.excerpt, 500);
  const content = normalizeText(body.content, 50000);
  const label = normalizeText(body.label, 50) || 'General';
  const img = normalizeText(body.img, 500);
  const generatedSlug = title.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  const permalink = normalizeText(body.permalink, 100) || generatedSlug || 'article-' + Date.now();

  if (!title || !content) {
    return jsonResponse({ error: 'Title and content are required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const article = { title, excerpt: excerpt || content.slice(0, 200), content, label, img, permalink, createDate: now, updatedAt: now };

  await env.BLOG_KV.put(`article:${permalink}`, JSON.stringify(article));

  const index = await getArticleIndex(env);
  if (!index.includes(permalink)) {
    index.unshift(permalink);
    await saveArticleIndex(env, index);
  }

  return jsonResponse({ ok: true, article });
}

async function handleSearchArticles(request, env) {
  const query = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 80);
  if (query.length < 2) return jsonResponse({ query, results: [] }, { headers: { 'Cache-Control': 'no-store' } });

  const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const articles = await getAllArticles(env);
  const results = articles.map(article => {
    const fields = {
      title: String(article.title || '').toLocaleLowerCase(),
      excerpt: String(article.excerpt || '').toLocaleLowerCase(),
      label: String(article.label || '').toLocaleLowerCase(),
      content: String(article.content || '').toLocaleLowerCase()
    };
    let score = 0;
    for (const term of terms) {
      if (fields.title.includes(term)) score += 12;
      if (fields.label.includes(term)) score += 8;
      if (fields.excerpt.includes(term)) score += 5;
      if (fields.content.includes(term)) score += 2;
    }
    if (!score) return null;
    const plainContent = String(article.content || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/[#>*_`\[\]()\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return {
      title: article.title,
      excerpt: article.excerpt || plainContent.slice(0, 150),
      label: article.label || 'Notes',
      permalink: article.permalink,
      createDate: article.createDate,
      score
    };
  }).filter(Boolean).sort((a, b) => b.score - a.score || String(b.createDate).localeCompare(String(a.createDate))).slice(0, 12);

  return jsonResponse({ query, results }, { headers: { 'Cache-Control': 'no-store' } });
}

async function loadAdminSubmission(env, articleId) {
  return env.BLOG_DB.prepare(
    `SELECT article.*, user.display_name AS author_name
     FROM blog_user_articles AS article
     JOIN blog_users AS user ON user.id = article.user_id
     WHERE article.id = ?
     LIMIT 1`
  ).bind(articleId).first();
}

function adminSubmissionDto(article, assets = [], includeContent = false) {
  const dto = {
    ...userArticleDto(article, assets),
    authorName: article.author_name || ''
  };
  if (!includeContent) delete dto.contentMarkdown;
  return dto;
}

async function handleAdminListSubmissions(request, env) {
  const authError = await requireAdmin(request, env);
  if (authError) return authError;
  if (!env.BLOG_DB) return jsonResponse({ error: 'USER_DATABASE_UNAVAILABLE' }, { status: 503 });

  const status = new URL(request.url).searchParams.get('status') || 'pending';
  if (status !== 'pending') {
    return jsonResponse({ error: 'INVALID_STATUS' }, { status: 400 });
  }
  const { results } = await env.BLOG_DB.prepare(
    `SELECT article.*, user.display_name AS author_name
     FROM blog_user_articles AS article
     JOIN blog_users AS user ON user.id = article.user_id
     WHERE article.status = 'pending' AND COALESCE(article.review_status, '') = ''
     ORDER BY article.submitted_at DESC, article.updated_at DESC`
  ).all();
  return jsonResponse({ submissions: (results || []).map(article => adminSubmissionDto(article)) });
}

async function handleAdminGetSubmission(request, env, articleId) {
  const authError = await requireAdmin(request, env);
  if (authError) return authError;
  if (!env.BLOG_DB) return jsonResponse({ error: 'USER_DATABASE_UNAVAILABLE' }, { status: 503 });

  const article = await loadAdminSubmission(env, articleId);
  if (!article) return jsonResponse({ error: 'ARTICLE_NOT_FOUND' }, { status: 404 });
  const assets = await loadOwnedUserArticleAssets(env, article.id, article.user_id);
  return jsonResponse({ submission: adminSubmissionDto(article, assets, true) });
}

async function findPublishedSubmissionArticle(env, submissionId) {
  const index = await getArticleIndex(env);
  for (const permalink of index) {
    const article = await getArticle(env, permalink);
    if (article?.sourceSubmissionId === submissionId) return article;
  }
  return null;
}

async function uniquePublishedPermalink(env, requested, submissionId) {
  const fallback = `article-${String(submissionId).replace(/[^a-z0-9]/gi, '').slice(-8).toLowerCase() || Date.now()}`;
  const base = normalizeUserArticlePermalink(requested) || fallback;
  let candidate = base;
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const existing = await getArticle(env, candidate);
    if (!existing || existing.sourceSubmissionId === submissionId) return candidate;
    candidate = `${base.slice(0, Math.max(1, 96 - String(suffix).length))}-${suffix}`;
  }
  return `${base.slice(0, 80)}-${Date.now()}`;
}

async function markSubmissionPublished(env, articleId, permalink, publishedAt) {
  const { results } = await env.BLOG_DB.prepare(
    `UPDATE blog_user_articles
     SET status = 'published', published_permalink = ?, published_at = ?, updated_at = ?, version = version + 1
     WHERE id = ? AND status = 'pending' AND COALESCE(review_status, '') = ''
     RETURNING *`
  ).bind(permalink, publishedAt, publishedAt, articleId).all();
  return results?.[0] || null;
}

async function handleAdminPublishSubmission(request, env, ctx, articleId) {
  const authError = await requireAdmin(request, env);
  if (authError) return authError;
  if (!env.BLOG_DB) return jsonResponse({ error: 'USER_DATABASE_UNAVAILABLE' }, { status: 503 });
  if (!env.BLOG_KV) return jsonResponse({ error: 'ARTICLE_STORAGE_UNAVAILABLE' }, { status: 503 });

  let submission = await loadAdminSubmission(env, articleId);
  if (!submission) return jsonResponse({ error: 'ARTICLE_NOT_FOUND' }, { status: 404 });
  if (submission.status === 'published' && submission.published_permalink) {
    queueBackgroundTask(ctx, createNotification(env, {
      userId: submission.user_id,
      type: 'submission_approved',
      sourceId: submission.id,
      payload: { articleTitle: submission.title, articlePermalink: submission.published_permalink, submissionId: submission.id },
      href: `/article/${submission.published_permalink}`,
      ctx
    }), 'submission approval notification');
    return jsonResponse({ ok: true, url: `/article/${submission.published_permalink}` });
  }
  if (submission.status !== 'pending' || submission.review_status === 'rejected') {
    return jsonResponse({ error: 'ARTICLE_NOT_PENDING' }, { status: 409 });
  }

  const assets = await loadOwnedUserArticleAssets(env, submission.id, submission.user_id);
  const publishedAt = new Date().toISOString();
  let published = await findPublishedSubmissionArticle(env, submission.id);
  if (!published) {
    const permalink = await uniquePublishedPermalink(env, submission.permalink || submission.title, submission.id);
    const cover = assets.find(asset => asset.id === submission.cover_asset_id);
    published = buildPublishedArticle({
      ...submission,
      permalink,
      authorName: submission.author_name,
      coverUrl: cover ? `/media/user-articles/${cover.id}` : ''
    }, publishedAt);
    published.assets = assets.map(userArticleAssetDto);
    await env.BLOG_KV.put(`article:${permalink}`, JSON.stringify(published));
    const index = await getArticleIndex(env);
    const deduplicated = index.filter(item => item !== permalink);
    deduplicated.unshift(permalink);
    await saveArticleIndex(env, deduplicated);
  }

  const updated = await markSubmissionPublished(env, submission.id, published.permalink, publishedAt);
  if (!updated) {
    submission = await loadAdminSubmission(env, articleId);
    if (submission?.status !== 'published' || submission.published_permalink !== published.permalink) {
      return jsonResponse({ error: 'PUBLISH_CONFLICT' }, { status: 409 });
    }
  }
  queueBackgroundTask(ctx, createNotification(env, {
    userId: submission.user_id,
    type: 'submission_approved',
    sourceId: submission.id,
    payload: { articleTitle: submission.title, articlePermalink: published.permalink, submissionId: submission.id },
    href: `/article/${published.permalink}`,
    ctx
  }), 'submission approval notification');
  return jsonResponse({ ok: true, url: `/article/${published.permalink}`, article: published });
}

async function handleAdminRejectSubmission(request, env, ctx, articleId) {
  const authError = await requireAdmin(request, env);
  if (authError) return authError;
  if (!env.BLOG_DB) return jsonResponse({ error: 'USER_DATABASE_UNAVAILABLE' }, { status: 503 });

  const reviewedAt = new Date().toISOString();
  const { results } = await env.BLOG_DB.prepare(
    `UPDATE blog_user_articles
     SET review_status = 'rejected', reviewed_at = ?, updated_at = ?, version = version + 1
     WHERE id = ? AND status = 'pending' AND COALESCE(review_status, '') = ''
     RETURNING *`
  ).bind(reviewedAt, reviewedAt, articleId).all();
  const updated = results?.[0];
  if (!updated) {
    const article = await loadAdminSubmission(env, articleId);
    if (!article) return jsonResponse({ error: 'ARTICLE_NOT_FOUND' }, { status: 404 });
    if (article.review_status === 'rejected') {
      queueBackgroundTask(ctx, createNotification(env, {
        userId: article.user_id,
        type: 'submission_rejected',
        sourceId: article.id,
        payload: { articleTitle: article.title, submissionId: article.id },
        href: '/my-articles?status=rejected',
        ctx
      }), 'submission rejection notification');
      return jsonResponse({ ok: true, submission: adminSubmissionDto(article, [], true) });
    }
    return jsonResponse({ error: 'ARTICLE_NOT_PENDING' }, { status: 409 });
  }
  queueBackgroundTask(ctx, createNotification(env, {
    userId: updated.user_id,
    type: 'submission_rejected',
    sourceId: updated.id,
    payload: { articleTitle: updated.title, submissionId: updated.id },
    href: '/my-articles?status=rejected',
    ctx
  }), 'submission rejection notification');
  return jsonResponse({ ok: true, submission: adminSubmissionDto(updated, [], true) });
}

async function handleUserRegister(request, env) {
  if (!env.BLOG_DB) return jsonResponse({ error: 'User database unavailable' }, { status: 503 });
  if (!getSessionSecret(env)) return jsonResponse({ error: 'Server config error' }, { status: 500 });
  const body = await request.json().catch(() => ({}));
  const displayName = normalizeText(body.displayName, 40);
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');

  if (!displayName || !isValidEmail(email) || password.length < 8 || password.length > 128) {
    return jsonResponse({ error: '请填写昵称、有效邮箱和至少 8 位密码。' }, { status: 400 });
  }

  const existing = await env.BLOG_DB.prepare('SELECT id FROM blog_users WHERE email = ? LIMIT 1').bind(email).first();
  if (existing) return jsonResponse({ error: '这个邮箱已经注册。' }, { status: 409 });

  const user = {
    id: crypto.randomUUID(),
    email,
    display_name: displayName,
    created_at: new Date().toISOString()
  };
  const passwordHash = await hashPassword(password);

  await env.BLOG_DB.prepare(
    'INSERT INTO blog_users (id, email, display_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(user.id, user.email, user.display_name, passwordHash, user.created_at).run();

  const token = await createUserToken(user, env);
  if (!token) return jsonResponse({ error: 'Server config error' }, { status: 500 });
  return jsonResponse({ ok: true, user: publicUser(user) }, {
    headers: { 'Set-Cookie': userCookie(token) }
  });
}

async function handleUserLogin(request, env) {
  if (!env.BLOG_DB) return jsonResponse({ error: 'User database unavailable' }, { status: 503 });
  if (!getSessionSecret(env)) return jsonResponse({ error: 'Server config error' }, { status: 500 });
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  if (!isValidEmail(email) || !password) {
    return jsonResponse({ error: '邮箱或密码不正确。' }, { status: 401 });
  }

  const user = await env.BLOG_DB.prepare(
    'SELECT id, email, display_name, password_hash, created_at FROM blog_users WHERE email = ? LIMIT 1'
  ).bind(email).first();
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return jsonResponse({ error: '邮箱或密码不正确。' }, { status: 401 });
  }

  const token = await createUserToken(user, env);
  if (!token) return jsonResponse({ error: 'Server config error' }, { status: 500 });
  return jsonResponse({ ok: true, user: publicUser(user) }, {
    headers: { 'Set-Cookie': userCookie(token) }
  });
}

async function handleUserLogout() {
  return jsonResponse({ ok: true }, {
    headers: { 'Set-Cookie': `${USER_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0` }
  });
}

async function handleUserSession(request, env) {
  const user = await getCurrentUser(request, env);
  return jsonResponse({ authenticated: Boolean(user), user });
}

// ─── Comments API (D1-backed) ────────────────────────────────

async function ensureBlogCommentsSchema(env) {
  if (blogCommentsSchemaReady) return;
  if (!env.BLOG_DB) throw new Error('Missing BLOG_DB binding');
  await env.BLOG_DB.prepare(`CREATE TABLE IF NOT EXISTS blog_comments (
    id TEXT PRIMARY KEY,
    article_permalink TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_email TEXT DEFAULT '',
    content TEXT NOT NULL,
    parent_id TEXT,
    user_id TEXT,
    status TEXT NOT NULL DEFAULT 'approved',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`).run();
  await env.BLOG_DB.prepare('CREATE INDEX IF NOT EXISTS idx_blog_comments_article ON blog_comments(article_permalink)').run();
  await env.BLOG_DB.prepare('CREATE INDEX IF NOT EXISTS idx_blog_comments_status ON blog_comments(status)').run();
  await env.BLOG_DB.prepare('CREATE INDEX IF NOT EXISTS idx_blog_comments_created ON blog_comments(created_at DESC)').run();
  await env.BLOG_DB.prepare('CREATE INDEX IF NOT EXISTS idx_blog_comments_thread ON blog_comments(article_permalink, parent_id, created_at)').run();
  await env.BLOG_DB.prepare('CREATE INDEX IF NOT EXISTS idx_blog_comments_user ON blog_comments(user_id, created_at DESC)').run();
  blogCommentsSchemaReady = true;
}

async function handleGetComments(request, env, permalink) {
  if (!env.BLOG_DB) return jsonResponse({ comments: [] });
  try {
    await ensureBlogCommentsSchema(env);
    const { results } = await env.BLOG_DB.prepare(
      `SELECT id, parent_id, author_name, content, created_at
       FROM blog_comments
       WHERE article_permalink = ? AND status = 'approved'
       ORDER BY created_at ASC LIMIT 200`
    ).bind(permalink).all();
    return jsonResponse({ comments: results || [] });
  } catch (e) {
    return jsonResponse({ error: 'Comments unavailable' }, { status: 503 });
  }
}

async function handlePostComment(request, env, ctx, permalink) {
  if (!env.BLOG_DB) return jsonResponse({ error: 'Comments unavailable' }, { status: 503 });
  try {
    await ensureBlogCommentsSchema(env);
    const body = await request.json().catch(() => ({}));
    const authorName = normalizeText(body.authorName, 40);
    const authorEmail = normalizeText(body.authorEmail, 160);
    const content = normalizeText(body.content, 1200);
    const requestedParentId = normalizeText(body.parentId, 64);
    const honeypot = body.website;

    if (honeypot) return jsonResponse({ ok: true }); // Silently accept bot submissions
    if (!authorName || !content) return jsonResponse({ error: 'Name and content are required' }, { status: 400 });

    const currentUser = await getCurrentUser(request, env);
    let parentId = null;
    let parentUserId = '';
    if (requestedParentId) {
      const parent = await env.BLOG_DB.prepare(
        `SELECT id, parent_id, user_id FROM blog_comments
         WHERE id = ? AND article_permalink = ? AND status = 'approved' LIMIT 1`
      ).bind(requestedParentId, permalink).first();
      if (!parent || parent.parent_id) {
        return jsonResponse({ error: 'Reply target is unavailable' }, { status: 400 });
      }
      parentId = parent.id;
      parentUserId = parent.user_id || '';
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await env.BLOG_DB.prepare(
      'INSERT INTO blog_comments (id, article_permalink, user_id, author_name, author_email, content, parent_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, permalink, currentUser?.id || null, authorName, authorEmail, content, parentId, 'approved', createdAt).run();

    const stored = await env.BLOG_DB.prepare(
      'SELECT id FROM blog_comments WHERE id = ? LIMIT 1'
    ).bind(id).first();

    const article = await getArticle(env, permalink);
    const articleTitle = article?.title || permalink;
    const notifiedUsers = new Set();
    if (parentUserId && parentUserId !== currentUser?.id) {
      notifiedUsers.add(parentUserId);
      queueBackgroundTask(ctx, createNotification(env, {
        userId: parentUserId,
        type: 'comment_reply',
        sourceId: id,
        payload: { actorName: authorName, articleTitle, articlePermalink: permalink, commentId: id },
        href: `/article/${encodeURIComponent(permalink)}#comment-${id}`,
        ctx
      }), 'comment reply notification');
    }

    if (article?.sourceSubmissionId) {
      const owner = await env.BLOG_DB.prepare(
        'SELECT user_id FROM blog_user_articles WHERE id = ? LIMIT 1'
      ).bind(article.sourceSubmissionId).first();
      const ownerId = owner?.user_id || '';
      if (ownerId && ownerId !== currentUser?.id && !notifiedUsers.has(ownerId)) {
        queueBackgroundTask(ctx, createNotification(env, {
          userId: ownerId,
          type: 'article_comment',
          sourceId: id,
          payload: { actorName: authorName, articleTitle, articlePermalink: permalink, commentId: id },
          href: `/article/${encodeURIComponent(permalink)}#comment-${id}`,
          ctx
        }), 'article comment notification');
      }
    }

    return jsonResponse({
      ok: true,
      stored: Boolean(stored),
      comment: { id, parent_id: parentId, author_name: authorName, content, created_at: createdAt }
    });
  } catch (e) {
    return jsonResponse({ error: 'Unable to save comment' }, { status: 503 });
  }
}

// ─── 404 Page ─────────────────────────────────────────────────

function notFoundHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
${seoHead('Page Not Found - Rowan Notes', 'The page you are looking for does not exist.', '/404')}
</head>
<body class="min-h-screen flex flex-col theme-anzhiyu">
${SHARED_NAV}
    <main class="flex-1 flex items-center justify-center py-20">
        <div class="text-center px-4">
            <div class="w-24 h-24 rounded-3xl bg-gradient-to-br from-pastel-lavender to-pastel-pink mx-auto flex items-center justify-center mb-6 floating">
                <i class="ri-emotion-sad-line text-5xl text-accent-primary"></i>
            </div>
            <h1 class="text-4xl md:text-5xl font-bold text-gray-800 mb-4">404</h1>
            <p class="text-gray-600 text-lg mb-8 max-w-md mx-auto">Oops! The page you're looking for doesn't exist or has been moved.</p>
            <div class="flex flex-wrap justify-center gap-4">
                <a href="/" class="btn-primary text-white px-6 py-3 rounded-xl inline-flex items-center">
                    <i class="ri-home-4-line mr-2"></i><span data-i18n="nav.backHome">Back to Home</span>
                </a>
                <a href="/bookmarks" class="btn-secondary px-6 py-3 rounded-xl inline-flex items-center">
                    <i class="ri-bookmark-line mr-2"></i><span data-i18n="nav.bookmarks">Bookmarks</span>
                </a>
            </div>
        </div>
    </main>
${SHARED_FOOTER}
    <script src="/script.js?v=20260905-centered-side-arc"></script>
</body>
</html>`;
}

function customerServiceAdminHtml() {
  return `<!doctype html><html lang="zh-CN"><head>${seoHead('在线客服管理 - Rowan Notes', '管理访客咨询会话', '/admin/customer-service')}<link rel="stylesheet" href="/customer-service-admin.css?v=20260809-fluid-workspace"></head><body class="theme-anzhiyu admin-page">
${ADMIN_NAV}<main class="cs-admin" data-cs-admin><aside class="cs-admin-sidebar"><header><div><span class="cs-eyebrow">CUSTOMER SERVICE</span><h1>在线客服</h1></div><span class="cs-live-dot"></span></header><div class="cs-admin-tools"><label><i class="ri-search-line"></i><input data-cs-search placeholder="搜索访客名称或 ID"></label><div class="cs-admin-filters"><button class="active" data-filter="all">全部</button><button data-filter="unread">未读</button><button data-filter="pending">待回复</button><button data-filter="closed">已结束</button></div></div><div class="cs-session-list" data-cs-session-list><p class="cs-empty">正在载入会话...</p></div></aside><section class="cs-admin-chat"><div class="cs-admin-placeholder" data-cs-placeholder><i class="ri-chat-3-line"></i><h2>选择一个会话</h2><p>用户消息会实时显示在这里。</p></div><div class="cs-admin-conversation" data-cs-conversation hidden><header><button class="cs-mobile-back" data-cs-back type="button" aria-label="返回会话列表"><i class="ri-arrow-left-line" aria-hidden="true"></i></button><div><h2 data-cs-title></h2><p data-cs-meta></p></div><button data-cs-status></button></header><button class="cs-load-older" data-cs-load-older hidden>加载更早消息</button><div class="cs-admin-messages" data-cs-messages></div><button class="cs-admin-new" data-cs-admin-new hidden>有新消息 <i class="ri-arrow-down-line"></i></button><form class="cs-admin-composer" data-cs-form><button type="button" data-cs-emoji aria-label="选择表情" title="选择表情"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke-width="2"/><path d="M8.5 10h.01M15.5 10h.01M8.5 14.5c1.9 1.8 5.1 1.8 7 0" stroke-width="2" stroke-linecap="round"/></svg></button><textarea data-cs-input maxlength="2000" rows="1" placeholder="输入回复，Enter 发送"></textarea><button type="submit" aria-label="发送消息" title="发送消息"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m4 4 17 8-17 8 3-8-3-8Z" stroke-width="2" stroke-linejoin="round"/><path d="M7 12h14" stroke-width="2" stroke-linecap="round"/></svg></button><div class="cs-emoji-panel" data-cs-emoji-panel hidden></div></form></div></section></main><script src="/customer-service-admin.js?v=20260803-chat-read-receipts" defer></script></body></html>`;
}

async function handleListNotifications(request, env) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;
  const url = new URL(request.url);
  const result = await listNotifications(env, auth.user.id, {
    cursor: url.searchParams.get('cursor'),
    limit: url.searchParams.get('limit')
  });
  const unreadCount = await unreadNotificationCount(env, auth.user.id);
  return jsonResponse({ ...result, unreadCount });
}

async function handleUnreadNotificationCount(request, env) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;
  return jsonResponse({ unreadCount: await unreadNotificationCount(env, auth.user.id) });
}

async function handleMarkNotificationRead(request, env) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'INVALID_JSON' }, { status: 400 });
  }
  const id = normalizeText(payload?.id, 100);
  if (!id) return jsonResponse({ error: 'NOTIFICATION_ID_REQUIRED' }, { status: 400 });
  const updated = await markNotificationRead(env, auth.user.id, id);
  if (!updated.found) return jsonResponse({ error: 'NOTIFICATION_NOT_FOUND' }, { status: 404 });
  return jsonResponse({ ok: true, unreadCount: await unreadNotificationCount(env, auth.user.id) });
}

async function handleMarkAllNotificationsRead(request, env) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;
  const result = await markAllNotificationsRead(env, auth.user.id);
  return jsonResponse({ ok: true, updated: result.updated, readAt: result.readAt, unreadCount: 0 });
}

// ─── Main Fetch Handler ───────────────────────────────────────

export default {
  async scheduled(_controller, env, ctx) {
    if (!env.BLOG_DB || !env.BLOG_MEDIA) return;
    ctx.waitUntil(reconcileUserArticleMediaCleanup(env, 25));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    if (pathname.startsWith('/api/customer-service/') || pathname.startsWith('/api/admin/customer-service/')) {
      return handleCustomerServiceRequest(request, env, ctx, { currentUser: await getCurrentUser(request, env), isAdmin: await isAdminRequest(request, env) });
    }

    // ── API Routes ──
    if ((pathname === '/api/articles' || pathname === '/api/posts') && method === 'GET') {
      return handleGetArticles(request, env);
    }

    if (pathname === '/api/search' && method === 'GET') {
      return handleSearchArticles(request, env);
    }

    if (pathname === '/api/admin/login' && method === 'POST') {
      return handleAdminLogin(request, env);
    }

    if (pathname === '/api/admin/logout' && method === 'POST') {
      return handleAdminLogout();
    }

    if (pathname === '/api/admin/session' && method === 'GET') {
      return handleAdminSession(request, env);
    }

    if (pathname === '/api/admin/articles' && method === 'POST') {
      return handleAdminCreateArticle(request, env);
    }

    if (pathname === '/api/admin/submissions' && method === 'GET') {
      return handleAdminListSubmissions(request, env);
    }

    const adminSubmissionMatch = pathname.match(/^\/api\/admin\/submissions\/([^/]+)$/);
    if (adminSubmissionMatch && method === 'GET') {
      return handleAdminGetSubmission(request, env, decodeURIComponent(adminSubmissionMatch[1]));
    }

    const adminSubmissionPublishMatch = pathname.match(/^\/api\/admin\/submissions\/([^/]+)\/publish$/);
    if (adminSubmissionPublishMatch && method === 'POST') {
      return handleAdminPublishSubmission(request, env, ctx, decodeURIComponent(adminSubmissionPublishMatch[1]));
    }

    const adminSubmissionRejectMatch = pathname.match(/^\/api\/admin\/submissions\/([^/]+)\/reject$/);
    if (adminSubmissionRejectMatch && method === 'POST') {
      return handleAdminRejectSubmission(request, env, ctx, decodeURIComponent(adminSubmissionRejectMatch[1]));
    }

    if (pathname === '/api/auth/register' && method === 'POST') {
      return handleUserRegister(request, env);
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      return handleUserLogin(request, env);
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      return handleUserLogout();
    }

    if (pathname === '/api/auth/session' && method === 'GET') {
      return handleUserSession(request, env);
    }

    if (pathname === '/api/notifications' && method === 'GET') {
      return handleListNotifications(request, env);
    }

    if (pathname === '/api/notifications/unread-count' && method === 'GET') {
      return handleUnreadNotificationCount(request, env);
    }

    if (pathname === '/api/notifications/read' && method === 'POST') {
      return handleMarkNotificationRead(request, env);
    }

    if (pathname === '/api/notifications/read-all' && method === 'POST') {
      return handleMarkAllNotificationsRead(request, env);
    }

    if (pathname === '/api/user/articles' && method === 'POST') {
      return handleCreateUserArticle(request, env);
    }

    if (pathname === '/api/user/articles' && method === 'GET') {
      return handleListUserArticles(request, env);
    }

    if (pathname === '/api/user/articles') {
      return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
    }

    const userArticleSubmitMatch = pathname.match(/^\/api\/user\/articles\/([^/]+)\/submit$/);
    if (userArticleSubmitMatch) {
      if (method === 'POST') {
        return handleSubmitUserArticle(request, env, decodeURIComponent(userArticleSubmitMatch[1]));
      }
      return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
    }

    const userArticleAssetMatch = pathname.match(/^\/api\/user\/articles\/([^/]+)\/assets\/([^/]+)$/);
    if (userArticleAssetMatch) {
      const articleId = decodeURIComponent(userArticleAssetMatch[1]);
      const assetId = decodeURIComponent(userArticleAssetMatch[2]);
      if (method === 'PUT') return handleUpdateUserArticleAsset(request, env, articleId, assetId);
      if (method === 'DELETE') return handleDeleteUserArticleAsset(request, env, articleId, assetId);
      return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
    }

    const userArticleAssetsMatch = pathname.match(/^\/api\/user\/articles\/([^/]+)\/assets$/);
    if (userArticleAssetsMatch) {
      if (method === 'POST') {
        return handleUploadUserArticleAsset(request, env, decodeURIComponent(userArticleAssetsMatch[1]));
      }
      return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
    }

    const userArticleMatch = pathname.match(/^\/api\/user\/articles\/([^/]+)$/);
    if (userArticleMatch) {
      const articleId = decodeURIComponent(userArticleMatch[1]);
      if (method === 'GET') return handleGetUserArticle(request, env, articleId);
      if (method === 'PUT') return handleUpdateUserArticle(request, env, articleId);
      if (method === 'DELETE') return handleDeleteUserArticle(request, env, articleId);
      return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
    }

    const userArticleMediaMatch = pathname.match(/^\/media\/user-articles\/([^/]+)$/);
    if (userArticleMediaMatch) {
      if (method === 'GET') {
        return handleGetUserArticleMedia(request, env, decodeURIComponent(userArticleMediaMatch[1]));
      }
      return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
    }

    // Comments API
    const commentMatch = pathname.match(/^\/api\/comments\/article\/(.+)$/);
    if (commentMatch) {
      const permalink = decodeURIComponent(commentMatch[1]);
      if (method === 'GET') return handleGetComments(request, env, permalink);
      if (method === 'POST') return handlePostComment(request, env, ctx, permalink);
    }

    // ── Dynamic Pages ──
    if (pathname === '/') {
      const articles = await getAllArticles(env);
      // Strip heavy content field for SSR data — client fetches content on demand
      const lightArticles = articles.map(({ content, ...rest }) => rest);
      return htmlResponse(homepageHtml(lightArticles), {
        headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' }
      });
    }

    if (pathname === '/rss.xml') {
      const articles = await getAllArticles(env);
      const language = url.searchParams.get('lang') === 'en' ? 'en' : 'zh';
      const accept = request.headers.get('Accept') || '';
      const wantsRawXml = url.searchParams.get('format') === 'xml' ||
        accept.includes('application/rss+xml') ||
        accept.includes('application/atom+xml') ||
        accept.includes('application/feed+json');
      if (!wantsRawXml && accept.includes('text/html')) {
        return htmlResponse(rssPreviewHtml(articles, language), {
          headers: {
            'Cache-Control': 'no-store',
            'Vary': 'Accept'
          }
        });
      }
      return new Response(rssXml(articles), {
        headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'Vary': 'Accept' }
      });
    }

    if (pathname === '/articles' || pathname === '/articles/') {
      const articles = await getAllArticles(env);
      return htmlResponse(articlesPageHtml(articles), {
        headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' }
      });
    }

    if (pathname === '/about' || pathname === '/about/') {
      return htmlResponse(aboutPageHtml(), {
        headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' }
      });
    }

    if (pathname === '/rss.xsl') {
      return new Response(rssXsl(), {
        headers: { 'Content-Type': 'text/xsl; charset=utf-8', 'Cache-Control': 'public, max-age=86400' }
      });
    }

    if (pathname === '/rss') {
      const articles = await getAllArticles(env);
      const language = url.searchParams.get('lang') === 'en' ? 'en' : 'zh';
      return htmlResponse(rssPreviewHtml(articles, language), {
        headers: { 'Cache-Control': 'public, max-age=300' }
      });
    }

    if (pathname === '/sitemap.xml') {
      const articles = await getAllArticles(env);
      return new Response(sitemapXml(articles), {
        headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' }
      });
    }

    const articleMatch = pathname.match(/^\/article\/(.+)$/);
    if (articleMatch) {
      return handleArticlePage(request, env, decodeURIComponent(articleMatch[1]));
    }

    if (pathname === '/bookmarks') {
      return htmlResponse(bookmarksPageHtml(), {
        headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' }
      });
    }

    if (pathname === '/notifications' || pathname === '/notifications/') {
      const user = await getCurrentUser(request, env);
      if (!user) {
        return Response.redirect(`${url.origin}/login?returnTo=${encodeURIComponent('/notifications')}`, 302);
      }
      return htmlResponse(notificationsPageHtml(), {
        headers: { 'Cache-Control': 'private, no-store' }
      });
    }

    if (pathname === '/login' || pathname === '/login/' || pathname === '/register' || pathname === '/register/') {
      return htmlResponse(authPageHtml(), {
        headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' }
      });
    }

    if (pathname === '/publish' || pathname === '/publish/' || pathname === '/my-articles' || pathname === '/my-articles/') {
      const user = await getCurrentUser(request, env);
      if (!user) {
        const returnTo = pathname.startsWith('/my-articles') ? '/my-articles' : '/publish';
        return Response.redirect(`${url.origin}/login?returnTo=${encodeURIComponent(returnTo)}`, 302);
      }
      return htmlResponse(pathname.startsWith('/my-articles') ? myArticlesPageHtml() : publishPageHtml(), {
        headers: { 'Cache-Control': 'private, no-store' }
      });
    }

    if (pathname === '/admin' || pathname === '/admin/') {
      const authenticated = await isAdminRequest(request, env);
      return htmlResponse(adminPageHtml(authenticated), {
        headers: { 'Cache-Control': 'private, no-store' }
      });
    }

    if (pathname === '/admin/submissions' || pathname === '/admin/submissions/') {
      if (!(await isAdminRequest(request, env))) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${url.origin}/admin/?returnTo=${encodeURIComponent('/admin/submissions')}`,
            'Cache-Control': 'private, no-store'
          }
        });
      }
      return htmlResponse(adminPageHtml(true, 'submissions'), {
        headers: { 'Cache-Control': 'private, no-store' }
      });
    }

    const adminSubmissionPageMatch = pathname.match(/^\/admin\/submissions\/([^/]+)\/?$/);
    if (adminSubmissionPageMatch) {
      if (!(await isAdminRequest(request, env))) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${url.origin}/admin/?returnTo=${encodeURIComponent(pathname)}`,
            'Cache-Control': 'private, no-store'
          }
        });
      }
      return htmlResponse(adminSubmissionDetailPageHtml(decodeURIComponent(adminSubmissionPageMatch[1])), {
        headers: { 'Cache-Control': 'private, no-store' }
      });
    }

    if (pathname === '/admin/customer-service' || pathname === '/admin/customer-service/') {
      if (!(await isAdminRequest(request, env))) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${url.origin}/admin/?returnTo=${encodeURIComponent('/admin/customer-service')}`,
            'Cache-Control': 'private, no-store'
          }
        });
      }
      return htmlResponse(customerServiceAdminHtml(), { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const legacyRedirects = {
      '/home.html': 'https://blog.858846.xyz/',
      '/posts': 'https://blog.858846.xyz/articles',
      '/posts.html': 'https://blog.858846.xyz/articles',
      '/about.html': 'https://858846.xyz/#about',
      '/feedback.html': 'https://858846.xyz/#feedback'
    };
    if (legacyRedirects[pathname]) {
      return Response.redirect(legacyRedirects[pathname], 301);
    }

    // ── Static Assets via ASSETS binding ──
    try {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status === 404) {
        throw new Error('Asset not found');
      }

      // Add cache headers for static assets
      const contentType = assetResponse.headers.get('Content-Type') || '';
      const newHeaders = new Headers(assetResponse.headers);

      if (contentType.includes('css') || contentType.includes('javascript')) {
        newHeaders.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      } else if (contentType.includes('image') || contentType.includes('font')) {
        newHeaders.set('Cache-Control', 'public, max-age=604800, immutable');
      }

      return new Response(assetResponse.body, {
        status: assetResponse.status,
        statusText: assetResponse.statusText,
        headers: newHeaders
      });
    } catch {
      // Asset not found
    }

    // ── 404 Fallback ──
    return htmlResponse(notFoundHtml(), { status: 404 });
  }
};




