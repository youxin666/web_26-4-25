const FEEDBACK_CATEGORIES = new Set(['网站建议', '简历内容', '项目交流', '招聘沟通', '其他']);

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
