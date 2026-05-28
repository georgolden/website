import { defineMiddleware } from 'astro:middleware';

// In dev, prevent the browser from reusing cached HTML across server
// restarts or after Vite re-prebundles. Cached HTML can reference chunk URLs
// (`?v=<hash>`) that Vite has since invalidated, returning
// `504 Outdated Optimize Dep` and breaking soft reload — only Ctrl+Shift+R
// recovers. `no-store` forbids the browser from caching the response at all.
export const onRequest = defineMiddleware(async (ctx, next) => {
  const res = await next();
  if (import.meta.env.DEV && res.headers.get('content-type')?.startsWith('text/html')) {
    res.headers.set('Cache-Control', 'no-store, must-revalidate');
    res.headers.delete('ETag');
    res.headers.delete('Last-Modified');
  }
  return res;
});
