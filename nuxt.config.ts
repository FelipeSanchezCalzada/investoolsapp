import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    'shadcn-nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/color-mode',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    'nuxt-echarts',
    '@nuxtjs/i18n',
  ],
  ssr: false,
  devtools: { enabled: true },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
    pageTransition: {
      name: 'page',
      mode: 'out-in',
    },
  },
  css: [
    '~/assets/css/tailwind.css',
    '~/assets/css/main.css',
  ],
  colorMode: {
    classSuffix: '',
  },
  // `nuxt-echarts` enables `componentIslands`, which makes Nuxt force `ssr: true`
  // internally and breaks the SPA i18n message loading. Islands are unused here.
  experimental: {
    componentIslands: false,
  },
  compatibilityDate: '2025-07-15',
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  echarts: {
    charts: ['LineChart'],
    components: ['TooltipComponent', 'LegendComponent', 'GridComponent', 'MarkLineComponent'],
  },
  eslint: {
    config: {
      stylistic: true,
    },
  },
  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'es',
    locales: [
      { code: 'es', language: 'es-ES', name: 'Español', file: 'es.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      redirectOn: 'root',
      fallbackLocale: 'es',
    },
  },
  pinia: {
    storesDirs: [
      // 'stores',
      // 'db',
    ],
  },
  shadcn: {
    prefix: '',
    componentDir: '@/components/ui',
  },
})
