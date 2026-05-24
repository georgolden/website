// @ts-check
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';
import solidJs from '@astrojs/solid-js';
import sitemap from '@astrojs/sitemap';

// HMR over a reverse proxy (e.g. https://georgoldenburger.com -> localhost:3001).
// Set HMR_HOST + optional HMR_CLIENT_PORT to make the browser-side websocket
// connect through the public hostname instead of localhost.
const hmrHost = process.env.HMR_HOST;
const hmr = hmrHost
  ? {
    host: hmrHost,
    protocol: 'wss',
    clientPort: Number(process.env.HMR_CLIENT_PORT) || 443,
  }
  : undefined;

export default defineConfig({
  site: 'https://gostudio.dev',
  integrations: [solidJs({ exclude: ['**/islands/Hero*'] }), sitemap(), react({ include: ['**/islands/Hero*'] })],
  // Bind to all interfaces. Default `[::1]` is IPv6-only, so the HMR
  // WebSocket fails when the browser resolves `localhost` to IPv4 — and
  // it also breaks tunneling tools (cloudflared, ngrok) which connect
  // over IPv4.
  server: { host: true, port: 3001 },
  // The dev toolbar piggybacks on the HMR WebSocket. When HMR is wobbly it
  // throws `Cannot read properties of undefined (reading 'send')` on every
  // page nav. We don't need the toolbar.
  devToolbar: { enabled: false },
  vite: {
    resolve: {
      // Single Solid instance across the whole dep graph.
      dedupe: ['solid-js', 'solid-js/web', 'solid-js/store'],
    },
    // Pre-bundle every Solid entry point eagerly AND pre-crawl every island
    // + page on cold start so Vite seals the dep graph before the browser
    // makes its first request. Without this, the first navigation discovers
    // a new import, Vite re-optimizes, and any HTML the browser already
    // cached now points at chunk URLs that 504 "Outdated Optimize Dep" —
    // which is what was making soft reloads fail (only hard reload worked).
    optimizeDeps: {
      include: [
        'solid-js',
        'solid-js/web',
        'solid-js/store',
        'solid-js/h',
        'solid-js/html',
      ],
      entries: [
        'src/pages/**/*.astro',
        'src/islands/*.tsx',
        'src/components/*.astro',
        'src/layouts/*.astro',
      ],
    },
    server: {
      allowedHosts: ['georgoldenburger.com'],
      // Warm the module graph at startup so the first browser request
      // doesn't trigger a re-prebundle storm.
      warmup: {
        clientFiles: [
          './src/islands/*.tsx',
          './src/pages/**/*.astro',
          './src/layouts/*.astro',
        ],
      },
      ...(hmr ? { hmr } : {}),
    },
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'de', 'et', 'fi', 'sv', 'fr', 'it', 'uk', 'ru'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
