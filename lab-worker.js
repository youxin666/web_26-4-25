export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const assetResponse = await env.ASSETS.fetch(request);
    const headers = new Headers(assetResponse.headers);

    if (url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
      headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    } else if (url.pathname.endsWith('.html') || url.pathname === '/') {
      headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    }

    return new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers,
    });
  },
};
