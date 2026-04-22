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
  compatibilityDate: '2025-07-15',
  vite: {
    plugins: [
      // @ts-expect-error: Remove when tailwindcss fix this
      tailwindcss(),
    ],
  },
  echarts: {
    charts: ['LineChart'],
    components: ['TooltipComponent', 'LegendComponent', 'GridComponent'],
  },
  eslint: {
    config: {
      stylistic: true,
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
