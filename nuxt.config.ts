export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  modules: ["@pinia/nuxt"],
  css: ["~/assets/css/main.css"],
  nitro: {
    preset: "aws-lambda",
  },
  app: {
    head: {
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Inter:wght@400;500;600&display=swap",
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
