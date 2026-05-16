export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Serve assets from the ASSETS binding
    const assetResponse = await env.ASSETS.fetch(request);

    if (assetResponse.status === 404) {
      return assetResponse;
    }

    // Read the body as ArrayBuffer so we can construct a new Response
    const body = await assetResponse.arrayBuffer();
    const headers = new Headers(assetResponse.headers);

    // Set cache headers based on file type
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
