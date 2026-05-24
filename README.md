# Cloudflare Resume Site

这是一个部署在 Cloudflare Workers 上的简历网站项目，可绑定自定义域名。项目从原静态页面改造为工程化简历站，包含工作经历、项目经历、技能证书、联系方式、面试邀约系统、反馈系统、后台管理系统、邮箱系统入口和 AI 岗位匹配器。

网站重点展示电子信息工程背景、维保电工与智慧家庭工程经历、STM32 项目、Cloudflare 部署实践，以及面向 HR 的岗位匹配能力。

## 功能概览

- 个人简历首页：个人优势、工作经历、项目经历、教育证书、联系方式入口。
- 工作经历详情页：按卡片展示详细职责和项目化工作内容。
- 项目经历详情页：展示 STM32 门禁系统、四足机器人等嵌入式项目。
- 技能教育页：展示教育背景、资格证书和专业技能。
- 联系方式页：公开半隐藏联系方式，完整电话和邮箱通过查看码接口读取。
- 面试邀约系统：HR 可提交公司、岗位、联系人、沟通方式和备注，数据写入数据库。
- 反馈系统：访客可提交反馈，数据写入 Cloudflare D1。
- 后台管理系统：管理员密码登录后查看反馈、面试邀约和统计概览。
- 邮箱系统入口：跳转至 `mail.<YOUR_DOMAIN>`。
- AI 岗位匹配器：HR 粘贴 JD 后生成匹配分数、亮点、差距和总结。

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
│   ├── index.html          # 简历首页
│   ├── immerse.html        # 工作经历详情
│   ├── release.html        # 项目经历详情
│   ├── rest.html           # 技能、证书与教育经历
│   ├── player.html         # 联系方式与求职意向
│   ├── interview.html      # HR 面试邀约系统
│   ├── admin.html          # 后台管理页面
│   ├── feedback.html       # 反馈系统页面
│   ├── styles.css          # 全站样式
│   ├── script.js           # 通用交互与动效
│   ├── feedback.js         # 反馈提交与评论读取
│   ├── interview.js        # 面试邀约提交逻辑
│   ├── admin.js            # 后台登录与数据管理逻辑
│   ├── job-match.js        # AI 岗位匹配器前端逻辑
│   └── contact-reveal.js   # 联系方式查看码交互
├── migrations/
│   ├── 0001_create_feedback.sql
│   └── 0002_create_interview_requests.sql
├── worker.js               # Workers API 与静态资源服务
├── wrangler.toml           # Cloudflare Worker 配置
└── README.md
```

## 页面路由

| 路径 | 说明 |
| --- | --- |
| `/` | 简历首页 |
| `/immerse` | 工作经历详情 |
| `/release` | 项目经历详情 |
| `/rest` | 技能证书与教育经历 |
| `/player` | 联系方式 |
| `/interview` | 面试邀约系统 |
| `/admin` | 后台管理系统 |
| `/feedback` | 反馈系统 |
| `https://mail.<YOUR_DOMAIN>` | 邮箱系统 |

## Worker API

| API | 方法 | 说明 |
| --- | --- | --- |
| `/api/feedback` | `GET` | 读取公开反馈列表 |
| `/api/feedback` | `POST` | 提交反馈 |
| `/api/interview` | `POST` | 提交面试邀约 |
| `/api/interview` | `GET` | 使用查看码读取邀约列表 |
| `/api/admin/login` | `POST` | 管理员登录 |
| `/api/admin/logout` | `POST` | 管理员退出 |
| `/api/admin/session` | `GET` | 检查管理员会话 |
| `/api/admin/summary` | `GET` | 读取后台统计 |
| `/api/admin/feedback` | `GET` | 读取后台反馈列表 |
| `/api/admin/interviews` | `GET` | 读取后台邀约列表 |
| `/api/admin/interview-status` | `PATCH` | 更新邀约状态 |
| `/api/job-match` | `POST` | 根据 JD 生成岗位匹配报告 |
| `/api/contact-reveal` | `POST` | 使用查看码读取完整电话或邮箱 |

## 数据库

反馈系统使用 Cloudflare D1。

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
```

## Secrets 配置

完整联系方式和查看码不写入前端源码，使用 Worker secrets。

```bash
wrangler secret put CONTACT_VIEW_CODE
wrangler secret put CONTACT_PHONE
wrangler secret put CONTACT_EMAIL
wrangler secret put ADMIN_PASSWORD
wrangler secret put ADMIN_SESSION_SECRET
```

`ADMIN_PASSWORD` 用于后台登录。`ADMIN_SESSION_SECRET` 用于签名后台登录会话，建议设置为随机长字符串。

AI 岗位匹配器支持 OpenAI-compatible API。若未配置或调用失败，会尝试 Cloudflare Workers AI，再退回本地规则预评估。

```bash
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

## 维护说明

- 更新页面内容主要修改 `public/*.html`。
- 更新视觉样式主要修改 `public/styles.css`。
- 更新反馈、联系方式、AI 匹配等接口逻辑修改 `worker.js`。
- 新增 D1 表结构变更时，在 `migrations/` 下新增 SQL 文件。
- 完整手机号、邮箱、查看码等敏感信息只通过 Cloudflare secrets 配置。
- 修改 CSS 或 JS 后建议更新 HTML 中的版本参数，避免浏览器缓存旧资源。

## 隐私策略

- 首页和联系方式页默认只展示半隐藏手机号和邮箱。
- 完整联系方式仅在输入查看码后通过 Worker API 返回。
- 完整联系方式不应写入 HTML、JS、README 或 Git 历史。

## 线上地址

- 主站：`https://<YOUR_DOMAIN>`
- 邮箱系统：`https://mail.<YOUR_DOMAIN>`
