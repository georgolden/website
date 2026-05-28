// @ts-check
import { defineConfig } from 'astro/config';
import solidJs from '@astrojs/solid-js';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://gostudio.dev',
  integrations: [solidJs(), sitemap()],
  vite: {
    server: {
      allowedHosts: ['georgoldenburger.com'],
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
