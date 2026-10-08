import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Ende-zu-Ende-Läufe mit echtem Browser (Brave, headless) und dem Dev-Server von nexora-nuxt. Nicht Teil von "npm test" (braucht Internet für das Cloudflare-Widget):
//   npx vitest run --config vitest.e2e.config.ts
export default defineConfig({
  test: { environment: 'node', include: ['tests/e2e/**/*.e2e.ts'], testTimeout: 300_000, hookTimeout: 300_000, fileParallelism: false },
  resolve: { alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) } },
})
