// @ts-check
import { defineConfig } from 'astro/config';
import solidJs from '@astrojs/solid-js';
import sitemap from '@astrojs/sitemap';

import react from '@astrojs/react';

export default defineConfig({
  site: 'https://gostudio.dev',
  integrations: [solidJs({exclude: ['**/islands/Hero*']}), sitemap(), react({ include: ['**/islands/Hero*'] })],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'de', 'et', 'fi', 'sv', 'fr', 'it', 'uk', 'ru'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
