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
      title: 'Plexora — Eine Lizenz. Alles drin.',
      meta: [
        { name: 'theme-color',   content: '#6C3FE8' },
        { name: 'description',   content: 'Plexora ist die All-in-One Business Platform für kleine und mittlere Unternehmen. CRM, Projekte, Finanzen, HR, Support und mehr — eine Lizenz, alles drin.' },
        { name: 'keywords',      content: 'Business Software, CRM, Projektverwaltung, Finanzen, HR Software, KMU Software, SaaS, Deutschland, All-in-One' },
        { name: 'author',        content: 'Plexora' },
        { name: 'robots',        content: 'index, follow' },
        // Open Graph
        { property: 'og:type',        content: 'website' },
        { property: 'og:url',         content: 'https://www.plexora.eu/' },
        { property: 'og:title',       content: 'Plexora — Eine Lizenz. Alles drin.' },
        { property: 'og:description', content: 'All-in-One Business Platform für KMU. CRM, Projekte, Finanzen, HR, Support — eine Lizenz, alles drin.' },
        { property: 'og:site_name',   content: 'Plexora' },
        { property: 'og:locale',      content: 'de_DE' },
        // Twitter Card
        { name: 'twitter:card',        content: 'summary_large_image' },
        { name: 'twitter:title',       content: 'Plexora — Eine Lizenz. Alles drin.' },
        { name: 'twitter:description', content: 'All-in-One Business Platform für KMU. CRM, Projekte, Finanzen, HR, Support — eine Lizenz, alles drin.' },
      ],
      link: [
        { rel: 'canonical', href: 'https://www.plexora.eu/' },
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
    anthropicApiKey: "",
    encryptionKey: "",
    googleClientId: "",
    googleClientSecret: "",
    authEnforce: "",
    newsletterCronSecret: "",
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
