export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  modules: ["@pinia/nuxt"],
  css: ["~/assets/css/main.css"],
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
    awsAccessKeyId: process.env.NUXT_AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.NUXT_AWS_SECRET_ACCESS_KEY,
    awsRegion: process.env.NUXT_AWS_REGION,
    public: {
      awsRegion: process.env.NUXT_PUBLIC_AWS_REGION,
      awsUserPoolId: process.env.NUXT_PUBLIC_AWS_USER_POOL_ID,
      awsClientId: process.env.NUXT_PUBLIC_AWS_CLIENT_ID,
    },
  },
  vite: {
    optimizeDeps: {
      include: ["@vue/devtools-core", "@vue/devtools-kit", "aws-amplify"],
    },
  },
});
