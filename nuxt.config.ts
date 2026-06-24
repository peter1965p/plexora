export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  modules: ["@pinia/nuxt"],
  css: ["~/assets/css/main.css"],
  nitro: {
    preset: "static",
    prerender: {
      crawlLinks: false,
      routes: ['/', '/impressum', '/datenschutz', '/agb', '/kaufen'],
    }
  },
  app: {
    head: {
      titleTemplate: '%s — Plexora',
      meta: [
        { name: 'theme-color', content: '#6C3FE8' },
      ],
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Space+Grotesk:wght@400;500;600;700&family=Exo+2:wght@400;500;600;700&display=swap",
        },
        {
          rel: "stylesheet",
          href: "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css",
        },
      ],
    },
  },
  runtimeConfig: {
    awsAccessKeyId: "",
    awsSecretAccessKey: "",
    stripeSecretKey: "",
    sesFromEmail: "",
    sesSesRegion: "",
    awsRegion: "",
    resendApiKey: "",
    adminEmail: "",
    public: {
      apiBase: "",
      stripePublishableKey: "",
      awsRegion: "",
      awsUserPoolId: "",
      awsClientId: "",
    },
  },
  vite: {
    optimizeDeps: {
      include: ["@vue/devtools-core", "@vue/devtools-kit", "aws-amplify"],
    },
  },
});
// bereits vorhanden - nur Build Output Directory wichtig
