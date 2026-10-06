import { shouldAttachAuth, shouldRedirectToLogin } from '~/utils/apiAuth'
import { useAuthUser } from '~/composables/useAuth'

// Sicherheitsnetz für den Wegfall des demo-user-Rückfalls im Backend: jeder Aufruf der eigenen API (useFetch, $fetch)
// trägt das Token, auch wenn eine Stelle vergessen hat, Header zu setzen. Explizit gesetzte Authorization-Header bleiben unverändert.
export default defineNuxtPlugin(() => {
  const apiBase = String(useRuntimeConfig().public.apiBase || '')
  let cached: { token: string; at: number } | null = null
  const getToken = async () => {
    if (cached && Date.now() - cached.at < 15_000) return cached.token
    const { idToken } = await useAuthUser()
    cached = { token: idToken || '', at: Date.now() }
    return cached.token
  }
  const orig: any = (globalThis as any).$fetch
  ;(globalThis as any).$fetch = orig.create({
    async onRequest({ request, options }: any) {
      const url = typeof request === 'string' ? request : request?.url
      if (!shouldAttachAuth(url, apiBase, options.headers)) return
      const token = await getToken()
      if (!token) return
      const headers = new Headers(options.headers || {})
      headers.set('Authorization', `Bearer ${token}`)
      options.headers = headers
    },
    async onResponseError({ request, response, options }: any) {
      const url = typeof request === 'string' ? request : request?.url
      const isApi = apiBase ? String(url).startsWith(apiBase) : String(url).startsWith('/api/')
      if (!isApi) return
      const sent = new Headers(options?.headers || {}).has('authorization')
      if (shouldRedirectToLogin(response?.status, response?._data?.message, sent, window.location.pathname)) {
        cached = null
        await navigateTo('/login?reason=expired')
      }
    },
  })
})
