import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Tests laufen unabhängig von Nuxt/Nitro: reine Logik, Repository-Schicht und Handler mit Stubs.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) },
  },
})
