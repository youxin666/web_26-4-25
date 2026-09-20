const FEEDBACK_CATEGORIES = new Set(['网站建议', '内容建议', '项目交流', '招聘沟通', '其他']);
const INTERVIEW_CHANNELS = new Set(['电话沟通', '微信沟通', '邮件沟通', '线上面试', '线下面试']);
const FEEDBACK_STATUSES = new Set(['new', 'read', 'closed']);
const INTERVIEW_STATUSES = new Set(['new', 'contacted', 'scheduled', 'closed']);
const ADMIN_COOKIE_NAME = 'resume_admin_session';
const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

const RESUME_CONTEXT = `
姓名：罗文辉。求职城市：广州。期望薪资：5-7K。
教育：五邑大学本科，电子信息工程，2023-2025；广东轻工职业技术大学大专，汽车智能技术，2020-2023。
证书：低压电工证、驾驶证 C1、大学英语四级、大学英语六级、计算机二级。
工作经历：
1. 广州番禺云启信息科技有限公司，AI 辅助网站开发与云端部署，2026.04-2026.05。使用 Vibe Coding 方式完成个人简历网站改版，基于 Cloudflare Workers 部署静态站，配置自定义域名 858846.xyz，使用 Cloudflare D1 存储反馈数据，开发邮箱系统入口、反馈系统和 AI 岗位匹配器。
2. 胜通和科技有限公司佛山第一分公司，智慧家庭工程师，2025.06-2025.10。负责中国电信家庭宽带、互联网电视、家用智能产品安装调试及维护，用户家中局域网搭建、网络优化和业务推介。
3. 中国进出口商品交易会，维保电工，2025.03-2025.06。负责场地巡查、机房设备设施检查、安全隐患记录上报、设备故障协同处理。
4. 广州白云国际会议中心国际会堂有限公司，维保电工，2023.04-2023.09。负责空调设备及弱电机房检查维护，会议室照明开启和设备运行监督。
5. 鸣点教育，课程顾问，2022.07-2022.08。负责课程咨询、考试数据整理、自媒体运营和客户沟通。
项目：
1. 基于 STM32 的多功能家庭门禁系统，项目负责人，2024.12-2025.05。完成需求调研、模块架构、STM32 硬件电路和 PCB、指纹识别、RFID、密码键盘、OLED、OneNET 云平台、手机 APP 远程控制、测试优化。
2. 基于 STM32 的四足机器人，项目成员，2024.06-2024.07。涉及 STM32、SG90、PCA9685、蓝牙模块、OLED、步态规划、3D 打印结构。
技能：电工与设备维护、弱电机房巡检、家庭宽带安装维护、局域网搭建、网络优化、电子设计与调试、STM32、Keil、Proteus、EDA、PCB 绘制、OLED、RFID、指纹模块、OneNET、Cloudflare Workers、Cloudflare D1、自定义域名配置、反馈系统、邮箱系统入口、AI 岗位匹配器、办公软件、AIGC 工具。
`;

function jsonResponse(payload, init = {}) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');

  return new Response(JSON.stringify(payload), {
    ...init,
    headers,
  });
}

function normalizeText(value, maxLength) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function requestForAsset(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url.toString(), request);
}

function base64UrlEncode(value) {
  const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : new TextEncoder().encode(String(value));
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

function parseCookies(request) {
  const header = request.headers.get('Cookie') || '';
  return Object.fromEntries(header.split(';').map((item) => {
    const [name, ...rest] = item.trim().split('=');
    return [name, rest.join('=')];
  }).filter(([name]) => name));
}

function getAdminPassword(env) {
  return normalizeText(env.ADMIN_PASSWORD || env.CONTACT_VIEW_CODE, 200);
}

function getAdminSecret(env) {
  return normalizeText(env.ADMIN_SESSION_SECRET || env.ADMIN_PASSWORD || env.CONTACT_VIEW_CODE, 240);
}

async function signAdminPayload(payload, env) {
  const secret = getAdminSecret(env);
  if (!secret) return '';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return base64UrlEncode(signature);
}

async function createAdminToken(env) {
  const payload = base64UrlEncode(JSON.stringify({
    role: 'admin',
    exp: Date.now() + ADMIN_SESSION_MAX_AGE * 1000,
  }));
  const signature = await signAdminPayload(payload, env);
  return `${payload}.${signature}`;
}

async function verifyAdminToken(token, env) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return false;
  const expected = await signAdminPayload(payload, env);
  if (signature !== expected) return false;

  try {
    const data = JSON.parse(base64UrlDecode(payload));
    return data.role === 'admin' && Number(data.exp) > Date.now();
  } catch {
    return false;
  }
}

async function isAdminRequest(request, env) {
  const token = parseCookies(request)[ADMIN_COOKIE_NAME];
  return verifyAdminToken(token, env);
}

function adminCookie(value, maxAge = ADMIN_SESSION_MAX_AGE) {
  return `${ADMIN_COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

async function requireAdmin(request, env) {
  if (await isAdminRequest(request, env)) {
    return null;
  }
  return jsonResponse({ error: '管理员未登录' }, { status: 401 });
}

function clampScore(value) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}

function scoreByKeywords(text, keywords) {
  const lower = text.toLowerCase();
  const hits = keywords.filter((keyword) => lower.includes(keyword.toLowerCase())).length;
  if (hits === 0) return 28;
  const ratio = hits / Math.max(1, keywords.length);
  return Math.min(96, Math.round(40 + (ratio * 60)));
}

function normalizeMatchResult(result, isAiPowered) {
  const dimensionScores = result?.dimensionScores || {};
  const normalizedScores = {
    education: clampScore(dimensionScores.education),
    experience: clampScore(dimensionScores.experience),
    technical: clampScore(dimensionScores.technical),
    maintenance: clampScore(dimensionScores.maintenance),
    communication: clampScore(dimensionScores.communication),
  };
  const average = Math.round(Object.values(normalizedScores).reduce((sum, value) => sum + value, 0) / 5);
  const overallScore = clampScore(result?.overallScore || average);

  return {
    overallScore,
    matchLevel: normalizeText(result?.matchLevel, 16) || (overallScore >= 82 ? '高度匹配' : overallScore >= 68 ? '较匹配' : '需进一步确认'),
    dimensionScores: normalizedScores,
    dimensionLabels: {
      education: normalizeText(result?.dimensionLabels?.education, 12) || '学历要求',
      experience: normalizeText(result?.dimensionLabels?.experience, 12) || '相关经验',
      technical: normalizeText(result?.dimensionLabels?.technical, 12) || '核心技能',
      maintenance: normalizeText(result?.dimensionLabels?.maintenance, 12) || '行业与场景',
      communication: normalizeText(result?.dimensionLabels?.communication, 12) || '协作与表达',
    },
    highlights: Array.isArray(result?.highlights) ? result.highlights.map((item) => normalizeText(item, 90)).filter(Boolean).slice(0, 4) : [],
    gaps: Array.isArray(result?.gaps) ? result.gaps.map((item) => normalizeText(item, 90)).filter(Boolean).slice(0, 4) : [],
    summary: normalizeText(result?.summary, 260) || '已根据当前岗位描述与候选人公开简历逐项对照，建议结合未明确的信息进一步沟通。',
    isAiPowered,
  };
}

function buildLocalMatch(jobDescription) {
  const jd = jobDescription.toLowerCase();
  const asks = (...keywords) => keywords.some((keyword) => jd.includes(keyword.toLowerCase()));
  const isAiRole = asks('ai', '人工智能', '大语言模型', 'llm', 'prompt', '对话语料', '数据标注');
  const isCreativeRole = asks('二次元', '游戏', '角色', '人设', '世界观', 'vtuber', '剧本');
  const isMaintenanceRole = asks('维护', '巡检', '弱电', '电工', '机房', '设备故障', '宽带');
  const isCloudRole = asks('cloudflare', 'worker', '前端', '网站', 'javascript', '数据库', 'd1');

  const education = asks('本科') ? 88 : asks('大专') ? 92 : 72;
  const experience = isAiRole ? 46 : isMaintenanceRole ? 82 : isCloudRole ? 74 : 52;
  const technical = isAiRole ? (asks('prompt') ? 48 : 55) : isMaintenanceRole ? 78 : isCloudRole ? 82 : 55;
  const maintenance = isCreativeRole ? 22 : isMaintenanceRole ? 88 : isCloudRole ? 76 : 45;
  const communication = asks('沟通', '协作', '客户', '反馈', '文档', '表达') ? 76 : 62;
  const scores = { education, experience, technical, maintenance, communication };
  const overallScore = Math.round((education * 0.16) + (experience * 0.26) + (technical * 0.24) + (maintenance * 0.2) + (communication * 0.14));

  let highlights;
  let gaps;
  let summary;
  if (isAiRole) {
    highlights = [
      '候选人有 AIGC 工具、AI 岗位匹配器及 Cloudflare 全栈网站实践，可作为接触 AI 应用工作流的项目证明。',
      asks('反馈', '日志', '数据') ? '候选人开发过反馈系统并使用 D1 存储数据，与岗位要求的反馈整理和数据记录存在可迁移经验。' : '候选人具备电子信息工程本科背景和独立项目交付经验。',
      asks('沟通', '协作', '表达') ? '课程顾问和智慧家庭工程经历包含客户沟通，能够支撑岗位所需的表达与协作能力。' : '候选人有公开网站与项目作品，可用于进一步核验实际交付能力。',
    ];
    gaps = [
      asks('prompt') ? '公开简历未明确展示 Prompt 模板、评测集或数据标注规范的直接产出，需要补充案例。' : '公开简历对大语言模型相关工作的深度描述不足，需要进一步核验。',
      isCreativeRole ? 'JD 强调二次元/游戏内容、角色人设和圈层语言，公开简历未体现直接行业经验。' : '岗位要求的具体业务领域经验在公开简历中未明确体现。',
      asks('日语', 'n2', 'vtuber', '同人', '剧本杀', '跑团') ? '日语 N2、同人创作、剧本杀、跑团或 VTuber 运营等加分项未在公开简历中体现。' : '部分加分能力缺少公开证据，建议在面试中确认。',
      asks('python', 'sql') ? 'JD 提到 Python / SQL 数据分析，公开简历尚未列出这两项技能。' : '同岗经验年限和实际职责边界仍需确认。',
    ];
    summary = `该岗位核心是${isCreativeRole ? '二次元/游戏角色对话训练、Prompt 与语料评测' : 'AI 应用、Prompt 与数据评测'}。候选人的 AI 应用项目、反馈系统和沟通经历具备部分可迁移性，但缺少角色内容设计、评测集/标注规范及部分工具技能的直接证据，当前属于可尝试但需补充作品证明的匹配。`;
  } else if (isMaintenanceRole) {
    highlights = ['具备低压电工证以及弱电机房、场地巡检和设备维护经历。', '有家庭宽带、智能产品安装调试和网络优化经验。', '电子信息工程背景与嵌入式项目可支撑基础故障分析。'];
    gaps = ['特定行业平台或大型系统经验需要进一步确认。', '如岗位要求多年同岗经验，当前履历仍需核验年限与项目深度。'];
    summary = '该岗位与候选人的设备维护、弱电巡检、智慧家庭工程及电子技术背景存在直接交集，建议进一步核验具体设备类型和现场处置深度。';
  } else {
    highlights = [isCloudRole ? '候选人完成过 Cloudflare Workers、D1、反馈系统和个人网站部署，与 JD 的网站及云端实践存在交集。' : '候选人具备电子信息工程本科背景和多个可展示项目。', '候选人有客户沟通、数据整理和独立交付经历。'];
    gaps = ['公开简历未覆盖 JD 中全部专用工具与行业经验，需要逐项确认。', '同岗工作年限和成果指标缺少直接证据。'];
    summary = '本地预评估已按当前 JD 与公开简历进行对照；候选人存在部分可迁移经验，但岗位专用能力仍需通过作品或面试验证。';
  }

  return normalizeMatchResult({
    overallScore,
    dimensionScores: scores,
    dimensionLabels: { education: '学历要求', experience: '相关经验', technical: '核心技能', maintenance: '行业与场景', communication: '协作与表达' },
    highlights,
    gaps,
    summary,
  }, false);
}

function extractJson(content) {
  const trimmed = String(content || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('模型返回不是有效 JSON');
    return JSON.parse(match[0]);
  }
}

function createMatchPrompt(jobDescription) {
  return `候选人公开简历：\n${RESUME_CONTEXT}\n\n岗位 JD：\n${jobDescription}\n\n必须只分析上述这份 JD，不得套用其他岗位模板。亮点必须同时得到 JD 和简历证据支持；简历未提及的要求应放入差距。请输出 JSON：{"overallScore":0-100,"matchLevel":"高度匹配/较匹配/需进一步确认/不太匹配","dimensionScores":{"education":0-100,"experience":0-100,"technical":0-100,"maintenance":0-100,"communication":0-100},"dimensionLabels":{"education":"学历要求","experience":"相关经验","technical":"核心技能","maintenance":"行业与场景","communication":"协作与表达"},"highlights":["最多4条"],"gaps":["最多4条"],"summary":"120字以内总结"}`;
}

function modelErrorDetails(error) {
  return normalizeText(error?.message || error?.name || 'unknown error', 180);
}

function extractModelText(answer) {
  const content = answer?.response || answer?.result?.response || answer?.text || answer?.output_text || answer?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((item) => typeof item === 'string' ? item : item?.text || item?.content || '').join('');
  return '';
}

async function callMatchModel(jobDescription, env) {
  const baseUrl = normalizeText(env.AI_MATCH_BASE_URL, 300).replace(/\/+$/, '');
  const apiKey = env.AI_MATCH_API_KEY;
  const endpoint = normalizeText(env.AI_MATCH_ENDPOINT || '/v1/chat/completions', 120);
  const model = normalizeText(env.AI_MATCH_MODEL || 'default', 120);

  if (!baseUrl || !apiKey) {
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 900,
        stream: false,
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: '你是招聘岗位匹配分析助手。只输出 JSON，不要输出 Markdown。评分必须客观，不能夸大。不要展示模型名称。',
          },
          {
            role: 'user',
            content: createMatchPrompt(jobDescription),
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn('[job-match] external model HTTP failure', { status: response.status });
      return null;
    }

    const data = await response.json();
    const content = extractModelText(data) || data.content;
    if (!normalizeText(content, 20)) {
      console.warn('[job-match] external model returned empty content');
      return null;
    }
    return normalizeMatchResult(extractJson(content), true);
  } catch (error) {
    console.warn('[job-match] external model failure', { error: modelErrorDetails(error) });
    return null;
  }
}

async function callCloudflareMatchModel(jobDescription, env) {
  if (!env.AI) {
    return null;
  }

  try {
    const answer = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: '你是招聘岗位匹配分析助手。只输出 JSON，不要输出 Markdown。评分必须客观，不能夸大。不要展示模型名称。',
        },
        {
          role: 'user',
          content: createMatchPrompt(jobDescription),
        },
      ],
    });
    const content = extractModelText(answer);
    if (!normalizeText(content, 20)) {
      console.warn('[job-match] Cloudflare AI returned empty content');
      return null;
    }
    return normalizeMatchResult(extractJson(content), true);
  } catch (error) {
    console.warn('[job-match] Cloudflare AI failure', { error: modelErrorDetails(error) });
    return null;
  }
}

async function handleFeedback(request, env) {
  if (!env.FEEDBACK_DB) {
    return jsonResponse({ error: '反馈数据库未配置' }, { status: 500 });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (request.method === 'GET') {
    const { results } = await env.FEEDBACK_DB.prepare(
      `SELECT id, name, category, rating, comment, created_at
       FROM feedback
       WHERE is_public = 1
       ORDER BY created_at DESC
       LIMIT 50`
    ).all();

    return jsonResponse({ items: results || [] });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: '不支持的请求方法' }, { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: '请求内容不是有效 JSON' }, { status: 400 });
  }

  if (normalizeText(payload.website, 120)) {
    return jsonResponse({ ok: true });
  }

  const id = crypto.randomUUID();
  const name = normalizeText(payload.name, 40) || '访客';
  const category = FEEDBACK_CATEGORIES.has(payload.category) ? payload.category : '其他';
  const comment = normalizeText(payload.comment, 600);
  const contact = normalizeText(payload.contact, 80) || null;
  const ratingValue = Number.parseInt(payload.rating, 10);
  const rating = Number.isInteger(ratingValue) && ratingValue >= 1 && ratingValue <= 5 ? ratingValue : 5;

  if (comment.length < 6) {
    return jsonResponse({ error: '反馈内容至少需要 6 个字' }, { status: 400 });
  }

  await env.FEEDBACK_DB.prepare(
    `INSERT INTO feedback (id, name, category, rating, comment, contact)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, name, category, rating, comment, contact).run();

  const created = await env.FEEDBACK_DB.prepare(
    `SELECT id, name, category, rating, comment, created_at
     FROM feedback
     WHERE id = ?`
  ).bind(id).first();

  return jsonResponse({ ok: true, item: created }, { status: 201 });
}

async function handleInterview(request, env) {
  if (!env.FEEDBACK_DB) {
    return jsonResponse({ error: '邀约数据库未配置' }, { status: 500 });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const code = normalizeText(url.searchParams.get('code'), 60);
    const expectedCode = normalizeText(env.CONTACT_VIEW_CODE, 60);

    if (!expectedCode || code !== expectedCode) {
      return jsonResponse({ error: '无权查看邀约列表' }, { status: 403 });
    }

    const { results } = await env.FEEDBACK_DB.prepare(
      `SELECT id, company, position, recruiter, contact, interview_time, channel, message, status, created_at
       FROM interview_requests
       ORDER BY created_at DESC
       LIMIT 50`
    ).all();

    return jsonResponse({ items: results || [] });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: '不支持的请求方法' }, { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: '请求内容不是有效 JSON' }, { status: 400 });
  }

  if (normalizeText(payload.website, 120)) {
    return jsonResponse({ ok: true });
  }

  const company = normalizeText(payload.company, 80);
  const position = normalizeText(payload.position, 80);
  const recruiter = normalizeText(payload.recruiter, 50);
  const contact = normalizeText(payload.contact, 100);
  const interviewTime = normalizeText(payload.interviewTime, 80) || null;
  const channel = INTERVIEW_CHANNELS.has(payload.channel) ? payload.channel : '电话沟通';
  const message = normalizeText(payload.message, 600) || null;

  if (company.length < 2) {
    return jsonResponse({ error: '请填写公司或团队名称' }, { status: 400 });
  }

  if (position.length < 2) {
    return jsonResponse({ error: '请填写岗位名称' }, { status: 400 });
  }

  if (recruiter.length < 2) {
    return jsonResponse({ error: '请填写联系人称呼' }, { status: 400 });
  }

  if (contact.length < 5) {
    return jsonResponse({ error: '请填写有效联系方式' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  await env.FEEDBACK_DB.prepare(
    `INSERT INTO interview_requests (id, company, position, recruiter, contact, interview_time, channel, message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, company, position, recruiter, contact, interviewTime, channel, message).run();

  return jsonResponse({
    ok: true,
    item: {
      id,
      company,
      position,
      recruiter,
      interview_time: interviewTime,
      channel,
      created_at: new Date().toISOString(),
    },
  }, { status: 201 });
}

async function handleAdminLogin(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: '不支持的请求方法' }, { status: 405 });
  }

  const expectedPassword = getAdminPassword(env);
  if (!expectedPassword) {
    return jsonResponse({ error: '管理员密码暂未配置' }, { status: 503 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: '请求内容不是有效 JSON' }, { status: 400 });
  }

  const password = normalizeText(payload.password, 200);
  if (password !== expectedPassword) {
    return jsonResponse({ error: '管理员密码错误' }, { status: 403 });
  }

  const token = await createAdminToken(env);
  return jsonResponse({ ok: true }, {
    headers: {
      'Set-Cookie': adminCookie(token),
    },
  });
}

async function handleAdminLogout() {
  return jsonResponse({ ok: true }, {
    headers: {
      'Set-Cookie': adminCookie('', 0),
    },
  });
}

async function handleAdminSession(request, env) {
  return jsonResponse({ authenticated: await isAdminRequest(request, env) });
}

async function handleAdminSummary(request, env) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  const feedbackCount = await env.FEEDBACK_DB.prepare('SELECT COUNT(*) AS count FROM feedback').first();
  const newFeedbackCount = await env.FEEDBACK_DB.prepare("SELECT COUNT(*) AS count FROM feedback WHERE status = 'new'").first();
  const feedbackAverage = await env.FEEDBACK_DB.prepare('SELECT ROUND(AVG(rating), 1) AS average FROM feedback').first();
  const interviewCount = await env.FEEDBACK_DB.prepare('SELECT COUNT(*) AS count FROM interview_requests').first();
  const newInterviewCount = await env.FEEDBACK_DB.prepare("SELECT COUNT(*) AS count FROM interview_requests WHERE status = 'new'").first();
  const matchReportCount = await env.FEEDBACK_DB.prepare('SELECT COUNT(*) AS count FROM job_match_reports').first();
  const latestFeedback = await env.FEEDBACK_DB.prepare('SELECT created_at FROM feedback ORDER BY created_at DESC LIMIT 1').first();
  const latestInterview = await env.FEEDBACK_DB.prepare('SELECT created_at FROM interview_requests ORDER BY created_at DESC LIMIT 1').first();
  const latestMatchReport = await env.FEEDBACK_DB.prepare('SELECT created_at FROM job_match_reports ORDER BY created_at DESC LIMIT 1').first();

  return jsonResponse({
    feedbackCount: feedbackCount?.count || 0,
    newFeedbackCount: newFeedbackCount?.count || 0,
    feedbackAverage: feedbackAverage?.average || 0,
    interviewCount: interviewCount?.count || 0,
    newInterviewCount: newInterviewCount?.count || 0,
    matchReportCount: matchReportCount?.count || 0,
    latestFeedback: latestFeedback?.created_at || null,
    latestInterview: latestInterview?.created_at || null,
    latestMatchReport: latestMatchReport?.created_at || null,
  });
}

async function handleAdminFeedback(request, env) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const status = normalizeText(url.searchParams.get('status'), 20);
  const query = normalizeText(url.searchParams.get('q'), 80);
  const filters = [];
  const values = [];

  if (FEEDBACK_STATUSES.has(status)) {
    filters.push('status = ?');
    values.push(status);
  }

  if (query) {
    filters.push('(name LIKE ? OR category LIKE ? OR comment LIKE ? OR contact LIKE ?)');
    const likeQuery = `%${query}%`;
    values.push(likeQuery, likeQuery, likeQuery, likeQuery);
  }

  const statement = env.FEEDBACK_DB.prepare(
    `SELECT id, name, category, rating, comment, contact, created_at, is_public, status
     FROM feedback
     ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
     ORDER BY created_at DESC
     LIMIT 200`
  );
  const { results } = values.length ? await statement.bind(...values).all() : await statement.all();

  return jsonResponse({ items: results || [] });
}

async function handleAdminInterviews(request, env) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const status = normalizeText(url.searchParams.get('status'), 20);
  const query = normalizeText(url.searchParams.get('q'), 80);
  const filters = [];
  const values = [];

  if (INTERVIEW_STATUSES.has(status)) {
    filters.push('status = ?');
    values.push(status);
  }

  if (query) {
    filters.push('(company LIKE ? OR position LIKE ? OR recruiter LIKE ? OR contact LIKE ? OR message LIKE ?)');
    const likeQuery = `%${query}%`;
    values.push(likeQuery, likeQuery, likeQuery, likeQuery, likeQuery);
  }

  const statement = env.FEEDBACK_DB.prepare(
    `SELECT id, company, position, recruiter, contact, interview_time, channel, message, status, created_at
     FROM interview_requests
     ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
     ORDER BY created_at DESC
     LIMIT 200`
  );
  const { results } = values.length ? await statement.bind(...values).all() : await statement.all();

  return jsonResponse({ items: results || [] });
}

async function handleAdminJobMatches(request, env) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const query = normalizeText(url.searchParams.get('q'), 80);
  const filters = [];
  const values = [];

  if (query) {
    filters.push('(job_description LIKE ? OR match_level LIKE ? OR summary LIKE ? OR highlights LIKE ? OR gaps LIKE ?)');
    const likeQuery = `%${query}%`;
    values.push(likeQuery, likeQuery, likeQuery, likeQuery, likeQuery);
  }

  const statement = env.FEEDBACK_DB.prepare(
    `SELECT id, job_description, overall_score, match_level, dimension_scores, highlights, gaps, summary, is_ai_powered, created_at
     FROM job_match_reports
     ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
     ORDER BY created_at DESC
     LIMIT 200`
  );
  const { results } = values.length ? await statement.bind(...values).all() : await statement.all();

  return jsonResponse({ items: results || [] });
}

async function handleAdminInterviewStatus(request, env) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  if (request.method !== 'PATCH') {
    return jsonResponse({ error: '不支持的请求方法' }, { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: '请求内容不是有效 JSON' }, { status: 400 });
  }

  const id = normalizeText(payload.id, 80);
  const status = normalizeText(payload.status, 20);
  if (!id || !INTERVIEW_STATUSES.has(status)) {
    return jsonResponse({ error: '邀约状态参数无效' }, { status: 400 });
  }

  await env.FEEDBACK_DB.prepare(
    'UPDATE interview_requests SET status = ? WHERE id = ?'
  ).bind(status, id).run();

  return jsonResponse({ ok: true });
}

async function handleAdminFeedbackStatus(request, env) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  if (request.method !== 'PATCH') {
    return jsonResponse({ error: '不支持的请求方法' }, { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: '请求内容不是有效 JSON' }, { status: 400 });
  }

  const id = normalizeText(payload.id, 80);
  const status = normalizeText(payload.status, 20);
  if (!id || !FEEDBACK_STATUSES.has(status)) {
    return jsonResponse({ error: '反馈状态参数无效' }, { status: 400 });
  }

  await env.FEEDBACK_DB.prepare(
    'UPDATE feedback SET status = ? WHERE id = ?'
  ).bind(status, id).run();

  return jsonResponse({ ok: true });
}

async function handleAdminFeedbackVisibility(request, env) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  if (request.method !== 'PATCH') {
    return jsonResponse({ error: '不支持的请求方法' }, { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: '请求内容不是有效 JSON' }, { status: 400 });
  }

  const id = normalizeText(payload.id, 80);
  if (!id) {
    return jsonResponse({ error: '反馈 ID 无效' }, { status: 400 });
  }

  await env.FEEDBACK_DB.prepare(
    'UPDATE feedback SET is_public = ? WHERE id = ?'
  ).bind(payload.isPublic ? 1 : 0, id).run();

  return jsonResponse({ ok: true });
}

async function handleAdminFeedbackDelete(request, env) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  if (request.method !== 'DELETE') {
    return jsonResponse({ error: '不支持的请求方法' }, { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: '请求内容不是有效 JSON' }, { status: 400 });
  }

  const id = normalizeText(payload.id, 80);
  if (!id) {
    return jsonResponse({ error: '反馈 ID 无效' }, { status: 400 });
  }

  await env.FEEDBACK_DB.prepare('DELETE FROM feedback WHERE id = ?').bind(id).run();
  return jsonResponse({ ok: true });
}

async function handleAdminInterviewDelete(request, env) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  if (request.method !== 'DELETE') {
    return jsonResponse({ error: '不支持的请求方法' }, { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: '请求内容不是有效 JSON' }, { status: 400 });
  }

  const id = normalizeText(payload.id, 80);
  if (!id) {
    return jsonResponse({ error: '邀约 ID 无效' }, { status: 400 });
  }

  await env.FEEDBACK_DB.prepare('DELETE FROM interview_requests WHERE id = ?').bind(id).run();
  return jsonResponse({ ok: true });
}

async function handleAdminJobMatchDelete(request, env) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  if (request.method !== 'DELETE') {
    return jsonResponse({ error: '不支持的请求方法' }, { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: '请求内容不是有效 JSON' }, { status: 400 });
  }

  const id = normalizeText(payload.id, 80);
  if (!id) {
    return jsonResponse({ error: '匹配记录 ID 无效' }, { status: 400 });
  }

  await env.FEEDBACK_DB.prepare('DELETE FROM job_match_reports WHERE id = ?').bind(id).run();
  return jsonResponse({ ok: true });
}

async function handleJobMatch(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: '不支持的请求方法' }, { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: '请求内容不是有效 JSON' }, { status: 400 });
  }

  const jobDescription = normalizeText(payload.jobDescription, 6000);
  if (jobDescription.length < 20) {
    return jsonResponse({ error: '请粘贴更完整的岗位描述' }, { status: 400 });
  }

  const aiResult = await callMatchModel(jobDescription, env);
  const cloudflareResult = aiResult || await callCloudflareMatchModel(jobDescription, env);
  return jsonResponse({ result: cloudflareResult || buildLocalMatch(jobDescription) });
}

async function handleJobMatchRecord(request, env) {
  if (!env.FEEDBACK_DB) {
    return jsonResponse({ error: '匹配记录数据库未配置' }, { status: 500 });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: '不支持的请求方法' }, { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: '请求内容不是有效 JSON' }, { status: 400 });
  }

  const jobDescription = normalizeText(payload.jobDescription, 6000);
  if (jobDescription.length < 20) {
    return jsonResponse({ error: '岗位 JD 内容不足，无法保存' }, { status: 400 });
  }

  const result = normalizeMatchResult(payload.result || {}, Boolean(payload.result?.isAiPowered));
  const id = crypto.randomUUID();

  await env.FEEDBACK_DB.prepare(
    `INSERT INTO job_match_reports (id, job_description, overall_score, match_level, dimension_scores, highlights, gaps, summary, is_ai_powered)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    jobDescription,
    result.overallScore,
    result.matchLevel,
    JSON.stringify(result.dimensionScores),
    JSON.stringify(result.highlights),
    JSON.stringify(result.gaps),
    result.summary,
    result.isAiPowered ? 1 : 0
  ).run();

  const created = await env.FEEDBACK_DB.prepare(
    `SELECT id, overall_score, match_level, created_at
     FROM job_match_reports
     WHERE id = ?`
  ).bind(id).first();

  return jsonResponse({ ok: true, item: created }, { status: 201 });
}

async function handleContactReveal(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: '不支持的请求方法' }, { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: '请求内容不是有效 JSON' }, { status: 400 });
  }

  const type = normalizeText(payload.type, 20);
  const code = normalizeText(payload.code, 60);
  const expectedCode = normalizeText(env.CONTACT_VIEW_CODE, 60);

  if (!expectedCode) {
    return jsonResponse({ error: '查看码暂未配置' }, { status: 503 });
  }

  if (code !== expectedCode) {
    return jsonResponse({ error: '查看码错误' }, { status: 403 });
  }

  if (type === 'name') {
    const name = normalizeText(env.CONTACT_NAME || '罗文辉', 40);
    if (!name) {
      return jsonResponse({ error: '姓名暂未配置' }, { status: 503 });
    }
    return jsonResponse({ value: name });
  }

  if (type === 'phone') {
    const phone = normalizeText(env.CONTACT_PHONE, 40);
    if (!phone) {
      return jsonResponse({ error: '手机号暂未配置' }, { status: 503 });
    }
    return jsonResponse({ value: phone });
  }

  if (type === 'email') {
    const email = normalizeText(env.CONTACT_EMAIL, 80);
    if (!email) {
      return jsonResponse({ error: '邮箱暂未配置' }, { status: 503 });
    }
    return jsonResponse({ value: email });
  }

  return jsonResponse({ error: '未知联系方式类型' }, { status: 400 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/feedback') {
      try {
        return await handleFeedback(request, env);
      } catch (error) {
        return jsonResponse({ error: '反馈服务暂时不可用' }, { status: 500 });
      }
    }

    if (path === '/api/interview') {
      try {
        return await handleInterview(request, env);
      } catch (error) {
        return jsonResponse({ error: '面试邀约服务暂时不可用' }, { status: 500 });
      }
    }

    if (path === '/api/admin/login') {
      try {
        return await handleAdminLogin(request, env);
      } catch (error) {
        return jsonResponse({ error: '管理员登录服务暂时不可用' }, { status: 500 });
      }
    }

    if (path === '/api/admin/logout') {
      return handleAdminLogout();
    }

    if (path === '/api/admin/session') {
      return handleAdminSession(request, env);
    }

    if (path === '/api/admin/summary') {
      try {
        return await handleAdminSummary(request, env);
      } catch (error) {
        return jsonResponse({ error: '后台统计暂时不可用' }, { status: 500 });
      }
    }

    if (path === '/api/admin/feedback') {
      try {
        return await handleAdminFeedback(request, env);
      } catch (error) {
        return jsonResponse({ error: '反馈数据暂时不可用' }, { status: 500 });
      }
    }

    if (path === '/api/admin/interviews') {
      try {
        return await handleAdminInterviews(request, env);
      } catch (error) {
        return jsonResponse({ error: '邀约数据暂时不可用' }, { status: 500 });
      }
    }

    if (path === '/api/admin/interview-status') {
      try {
        return await handleAdminInterviewStatus(request, env);
      } catch (error) {
        return jsonResponse({ error: '邀约状态更新失败' }, { status: 500 });
      }
    }

    if (path === '/api/admin/job-matches') {
      try {
        return await handleAdminJobMatches(request, env);
      } catch (error) {
        return jsonResponse({ error: '岗位匹配记录暂时不可用' }, { status: 500 });
      }
    }

    if (path === '/api/admin/feedback-status') {
      try {
        return await handleAdminFeedbackStatus(request, env);
      } catch (error) {
        return jsonResponse({ error: '反馈状态更新失败' }, { status: 500 });
      }
    }

    if (path === '/api/admin/feedback-visibility') {
      try {
        return await handleAdminFeedbackVisibility(request, env);
      } catch (error) {
        return jsonResponse({ error: '反馈公开状态更新失败' }, { status: 500 });
      }
    }

    if (path === '/api/admin/feedback-delete') {
      try {
        return await handleAdminFeedbackDelete(request, env);
      } catch (error) {
        return jsonResponse({ error: '反馈删除失败' }, { status: 500 });
      }
    }

    if (path === '/api/admin/interview-delete') {
      try {
        return await handleAdminInterviewDelete(request, env);
      } catch (error) {
        return jsonResponse({ error: '邀约删除失败' }, { status: 500 });
      }
    }

    if (path === '/api/admin/job-match-delete') {
      try {
        return await handleAdminJobMatchDelete(request, env);
      } catch (error) {
        return jsonResponse({ error: '匹配记录删除失败' }, { status: 500 });
      }
    }

    if (path === '/api/job-match') {
      try {
        return await handleJobMatch(request, env);
      } catch (error) {
        return jsonResponse({ error: error.message || '岗位匹配服务暂时不可用' }, { status: 500 });
      }
    }

    if (path === '/api/job-match-record') {
      try {
        return await handleJobMatchRecord(request, env);
      } catch (error) {
        return jsonResponse({ error: '匹配记录保存失败' }, { status: 500 });
      }
    }

    if (path === '/api/contact-reveal') {
      try {
        return await handleContactReveal(request, env);
      } catch (error) {
        return jsonResponse({ error: '联系方式查看服务暂时不可用' }, { status: 500 });
      }
    }

    if (path === '/posts' || path === '/posts.html') {
      return Response.redirect('https://blog.858846.xyz/', 301);
    }

    const assetRequest = path === '/'
      ? requestForAsset(request, '/intro')
      : path === '/home'
        ? requestForAsset(request, '/home')
        : path === '/about'
          ? requestForAsset(request, '/about')
        : path === '/works'
          ? requestForAsset(request, '/works')
        : request;
    const assetResponse = await env.ASSETS.fetch(assetRequest);

    if (assetResponse.status === 404) {
      return assetResponse;
    }

    const body = await assetResponse.arrayBuffer();
    const headers = new Headers(assetResponse.headers);

    const assetPath = new URL(assetRequest.url).pathname;

    if (assetPath.endsWith('.css') || assetPath.endsWith('.js')) {
      headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    } else if (assetPath.endsWith('.html') || path === '/' || path === '/home' || path === '/about' || path === '/works') {
      headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    }

    return new Response(body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers,
    });
  },
};
