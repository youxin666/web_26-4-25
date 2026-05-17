const FEEDBACK_CATEGORIES = new Set(['网站建议', '简历内容', '项目交流', '招聘沟通', '其他']);

const RESUME_CONTEXT = `
姓名：罗文辉。求职城市：广州。期望薪资：5-7K。
教育：五邑大学本科，电子信息工程，2023-2025；广东轻工职业技术大学大专，汽车智能技术，2020-2023。
证书：低压电工证、驾驶证 C1、大学英语四级、大学英语六级、计算机 CCT 二级证、计算机二级。
工作经历：
1. 胜通和科技有限公司佛山第一分公司，智慧家庭工程师，2025.06-2025.10。负责中国电信家庭宽带、互联网电视、家用智能产品安装调试及维护，用户家中局域网搭建、网络优化和业务推介。
2. 中国进出口商品交易会，维保电工，2025.03-2025.06。负责场地巡查、机房设备设施检查、安全隐患记录上报、设备故障协同处理。
3. 广州白云国际会议中心国际会堂有限公司，维保电工，2023.04-2023.09。负责空调设备及弱电机房检查维护，会议室照明开启和设备运行监督。
4. 鸣点教育，课程顾问，2022.07-2022.08。负责课程咨询、考试数据整理、自媒体运营和客户沟通。
项目：
1. 基于 STM32 的多功能家庭门禁系统，项目负责人，2024.12-2025.05。完成需求调研、模块架构、STM32 硬件电路和 PCB、指纹识别、RFID、密码键盘、OLED、OneNET 云平台、手机 APP 远程控制、测试优化。
2. 基于 STM32 的四足机器人，项目成员，2024.06-2024.07。涉及 STM32、SG90、PCA9685、蓝牙模块、OLED、步态规划、3D 打印结构。
技能：电工与设备维护、弱电机房巡检、家庭宽带安装维护、局域网搭建、网络优化、电子设计与调试、STM32、Keil、Proteus、EDA、PCB 绘制、OLED、RFID、指纹模块、OneNET、办公软件、AIGC 工具。
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
    highlights: Array.isArray(result?.highlights) ? result.highlights.map((item) => normalizeText(item, 90)).filter(Boolean).slice(0, 4) : [],
    gaps: Array.isArray(result?.gaps) ? result.gaps.map((item) => normalizeText(item, 90)).filter(Boolean).slice(0, 4) : [],
    summary: normalizeText(result?.summary, 260) || '候选人具备现场维护、设备调试和嵌入式项目基础，可结合岗位要求进一步沟通。',
    isAiPowered,
  };
}

function buildLocalMatch(jobDescription) {
  const education = scoreByKeywords(jobDescription, ['本科', '大专', '电子', '信息工程', '英语', '证书']);
  const experience = scoreByKeywords(jobDescription, ['维护', '巡检', '安装', '调试', '现场', '设备', '网络', '客户']);
  const technical = scoreByKeywords(jobDescription, ['STM32', '单片机', 'PCB', '电路', '嵌入式', 'RFID', 'OLED', '云平台', 'APP']);
  const maintenance = scoreByKeywords(jobDescription, ['电工', '弱电', '机房', '空调', '故障', '安全', '宽带', '局域网']);
  const communication = scoreByKeywords(jobDescription, ['沟通', '服务', '客户', '协调', '文档', '记录', '上报', '学习']);
  const scores = { education, experience, technical, maintenance, communication };
  const overallScore = Math.round((education * 0.16) + (experience * 0.26) + (technical * 0.24) + (maintenance * 0.2) + (communication * 0.14));

  return normalizeMatchResult({
    overallScore,
    dimensionScores: scores,
    highlights: [
      '具备低压电工证和弱电机房、场地巡检、设备维护相关经历。',
      '有家庭宽带、互联网电视、智能产品安装调试和网络优化经验。',
      '完成过 STM32 门禁系统和四足机器人项目，覆盖硬件、外设驱动和系统测试。',
    ],
    gaps: [
      '如果岗位强调特定行业平台或大型系统经验，需要进一步确认项目深度。',
      '如果 JD 要求多年同岗经验，当前经历更偏现场维护与初中级技术支持。',
    ],
    summary: '从 JD 关键词看，候选人与设备维护、弱电电工、智慧家庭工程、电子技术支持和嵌入式基础岗位匹配度较高，适合进入面试进一步核验现场处理能力。',
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

async function callMatchModel(jobDescription, env) {
  const baseUrl = normalizeText(env.AI_MATCH_BASE_URL, 300).replace(/\/+$/, '');
  const apiKey = env.AI_MATCH_API_KEY;
  const endpoint = normalizeText(env.AI_MATCH_ENDPOINT || '/v1/chat/completions', 120);
  const model = normalizeText(env.AI_MATCH_MODEL || 'default', 120);

  if (!baseUrl || !apiKey) {
    return null;
  }

  const response = await fetch(`${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: '你是招聘岗位匹配分析助手。只输出 JSON，不要输出 Markdown。评分必须客观，不能夸大。不要展示模型名称。',
        },
        {
          role: 'user',
          content: `候选人公开简历：\n${RESUME_CONTEXT}\n\n岗位 JD：\n${jobDescription}\n\n请输出 JSON：{"overallScore":0-100,"matchLevel":"高度匹配/较匹配/需进一步确认/不太匹配","dimensionScores":{"education":0-100,"experience":0-100,"technical":0-100,"maintenance":0-100,"communication":0-100},"highlights":["最多4条"],"gaps":["最多4条"],"summary":"120字以内总结"}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error('AI 匹配服务暂时不可用');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || data.output_text || data.content;
  return normalizeMatchResult(extractJson(content), true);
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
  return jsonResponse({ result: aiResult || buildLocalMatch(jobDescription) });
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

    if (path === '/api/job-match') {
      try {
        return await handleJobMatch(request, env);
      } catch (error) {
        return jsonResponse({ error: error.message || '岗位匹配服务暂时不可用' }, { status: 500 });
      }
    }

    const assetResponse = await env.ASSETS.fetch(request);

    if (assetResponse.status === 404) {
      return assetResponse;
    }

    const body = await assetResponse.arrayBuffer();
    const headers = new Headers(assetResponse.headers);

    if (path.endsWith('.css') || path.endsWith('.js')) {
      headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    } else if (path.endsWith('.html') || path === '/') {
      headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    }

    return new Response(body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers,
    });
  },
};
