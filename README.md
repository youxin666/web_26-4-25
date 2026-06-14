# Cloudflare Personal Showcase Site

这是一个部署在 Cloudflare Workers 上的个人展示网站。网站从早期简历页扩展为长期维护的个人主页，重点用于展示文章、项目作品、技术实验室、联系方式、反馈系统、后台管理和少量 AI 交互工具。

当前设计方向参考现代博客主题的卡片化信息流：主页负责建立整体印象，文章页沉淀技术记录，简历只是其中一个栏目，不再是整个网站的唯一主体。

## 功能概览

- 个人展示首页：展示站点定位、文章入口、网站作品、项目经历、简历速览和联系方式。
- 文章与技术记录：将 Cloudflare 部署、D1 数据库、AI 岗位匹配、STM32 项目等内容整理成帖子入口。
- 网站作品案例：展示本站如何从静态页面演进为带反馈、邀约、后台和 AI 工具的线上作品。
- 简历相关栏目：保留工作经历、项目经历、技能证书、联系方式与面试邀约系统。
- 反馈系统：访客可提交建议或评论，公开评论区只展示可公开字段。
- 后台管理系统：管理员登录后查看反馈、邀约、岗位匹配记录和状态。
- 邮箱系统入口：跳转到 `mail.<YOUR_DOMAIN>`。
- 技术实验室入口：跳转到 `lab.<YOUR_DOMAIN>`。
- AI 岗位匹配器：作为简历模块中的交互工具，支持 JD 分析和记录保存。

## Cloudflare 免费额度策略

为了适合 Cloudflare Workers 免费额度，站点采用静态优先：

- 文章默认写成静态 HTML 页面，不从数据库读取。
- 首页、文章页、项目页、简历页都走静态资源缓存。
- D1 只用于反馈、面试邀约、岗位匹配记录等必要写入数据。
- JS 动效在浏览器本地执行，不额外调用 API。
- CSS / JS 使用版本号参数，避免浏览器长期缓存旧资源。
- 后续如果文章数量增加，优先继续增加静态页面；只有评论、统计、登录后台这类数据功能才接入数据库。

## 技术栈

- HTML / CSS / JavaScript
- Cloudflare Workers
- Cloudflare Workers Static Assets
- Cloudflare D1
- Cloudflare Workers AI
- Wrangler

## 项目结构

```text
.
├── public/
│   ├── intro.html          # 出场动画页
│   ├── home.html           # 个人展示首页
│   ├── index.html          # 首页副本
│   ├── about.html          # 关于本站、架构和联系入口
│   ├── posts.html          # 文章与技术记录列表
│   ├── immerse.html        # 工作经历详情
│   ├── release.html        # 项目经历详情
│   ├── rest.html           # 技能、证书与教育经历
│   ├── player.html         # 联系方式与简历资料
│   ├── interview.html      # 面试邀约系统
│   ├── admin.html          # 后台管理页面
│   ├── feedback.html       # 反馈系统页面
│   ├── styles.css          # 全站样式
│   ├── intro.css           # 出场动画样式
│   ├── script.js           # 通用交互与动效
│   ├── feedback.js         # 反馈提交与评论读取
│   ├── interview.js        # 面试邀约提交逻辑
│   ├── admin.js            # 后台登录与数据管理逻辑
│   ├── job-match.js        # AI 岗位匹配器前端逻辑
│   └── contact-reveal.js   # 联系方式查看码交互
├── migrations/
│   ├── 0001_create_feedback.sql
│   ├── 0002_create_interview_requests.sql
│   ├── 0003_add_feedback_status.sql
│   └── 0004_create_job_match_reports.sql
├── worker.js               # Workers API 与静态资源服务
├── wrangler.toml           # Cloudflare Worker 配置
└── README.md
```

## 页面路由

| 路径 | 说明 |
| --- | --- |
| `/` | 出场动画页 |
| `/home` | 个人展示首页 |
| `/about` | 关于本站 |
| `/posts` | 文章与技术记录 |
| `/immerse` | 工作经历详情 |
| `/release` | 项目经历详情 |
| `/rest` | 技能证书与教育经历 |
| `/player` | 联系方式 |
| `/interview` | 面试邀约系统 |
| `/admin` | 后台管理系统 |
| `/feedback` | 反馈系统 |
| `https://mail.<YOUR_DOMAIN>` | 邮箱系统 |
| `https://lab.<YOUR_DOMAIN>` | 技术实验室 |

## Worker API

| API | 方法 | 说明 |
| --- | --- | --- |
| `/api/feedback` | `GET` | 读取公开反馈列表 |
| `/api/feedback` | `POST` | 提交反馈 |
| `/api/interview` | `POST` | 提交面试邀约 |
| `/api/admin/login` | `POST` | 管理员登录 |
| `/api/admin/logout` | `POST` | 管理员退出 |
| `/api/admin/session` | `GET` | 检查管理员会话 |
| `/api/admin/summary` | `GET` | 读取后台统计 |
| `/api/admin/feedback` | `GET` | 读取后台反馈列表 |
| `/api/admin/interviews` | `GET` | 读取后台邀约列表 |
| `/api/admin/interview-status` | `PATCH` | 更新邀约状态 |
| `/api/admin/job-matches` | `GET` | 读取岗位匹配记录 |
| `/api/job-match` | `POST` | 根据 JD 生成岗位匹配报告 |
| `/api/job-match-record` | `POST` | 保存岗位匹配报告 |
| `/api/contact-reveal` | `POST` | 使用查看码读取完整电话或邮箱 |

## 数据库

D1 用于保存需要留存的数据，文章内容不依赖 D1。

数据库配置见 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "FEEDBACK_DB"
database_name = "<D1_DATABASE_NAME>"
database_id = "<D1_DATABASE_ID>"
```

初始化表结构：

```bash
wrangler d1 execute <D1_DATABASE_NAME> --remote --file migrations/0001_create_feedback.sql
wrangler d1 execute <D1_DATABASE_NAME> --remote --file migrations/0002_create_interview_requests.sql
wrangler d1 execute <D1_DATABASE_NAME> --remote --file migrations/0003_add_feedback_status.sql
wrangler d1 execute <D1_DATABASE_NAME> --remote --file migrations/0004_create_job_match_reports.sql
```

## Secrets 配置

完整联系方式、查看码、后台密码和模型密钥不写入前端源码，使用 Worker secrets。

```bash
wrangler secret put CONTACT_VIEW_CODE
wrangler secret put CONTACT_PHONE
wrangler secret put CONTACT_EMAIL
wrangler secret put ADMIN_PASSWORD
wrangler secret put ADMIN_SESSION_SECRET
wrangler secret put AI_MATCH_API_KEY
```

可选环境变量：

```text
AI_MATCH_BASE_URL
AI_MATCH_ENDPOINT
AI_MATCH_MODEL
```

当前 `wrangler.toml` 已启用 Workers AI：

```toml
[ai]
binding = "AI"
```

## 本地预览

纯静态页面可以直接用本地 HTTP 服务预览：

```bash
python -m http.server 8000 -d public
```

访问：

```text
http://localhost:8000
```

如果需要验证 Worker API，使用 Wrangler：

```bash
wrangler dev
```

## 部署

部署到 Cloudflare Workers：

```bash
wrangler deploy
```

当前项目使用自定义域名，不启用 `workers.dev`：

```toml
workers_dev = false
```

静态资源配置：

```toml
[assets]
directory = "./public"
binding = "ASSETS"
run_worker_first = true
```

## 内容维护

- 新增文章：优先在 `public/posts.html` 增加文章卡片，文章成熟后再拆成独立 HTML。
- 更新首页：修改 `public/home.html` 后同步 `public/index.html`。
- 更新视觉样式：修改 `public/styles.css`。
- 更新反馈、联系方式、AI 匹配等接口逻辑：修改 `worker.js`。
- 新增 D1 表结构：在 `migrations/` 下新增 SQL 文件。
- 修改 CSS 或 JS 后建议更新 HTML 中的版本参数，避免浏览器缓存旧资源。

## 隐私策略

- 首页和联系方式页默认只展示半隐藏手机号和邮箱。
- 完整联系方式仅在输入查看码后通过 Worker API 返回。
- 完整联系方式不应写入 HTML、JS、README 或 Git 历史。

## 线上地址

- 主站：`https://<YOUR_DOMAIN>`
- 邮箱系统：`https://mail.<YOUR_DOMAIN>`
- 技术实验室：`https://lab.<YOUR_DOMAIN>`
