export function useApiUrl(path: string): string {
  const config = useRuntimeConfig()
  const base = config.public.apiBase || ''
  return `${base}${path}`
}

export async function useUserApiUrl(path: string): Promise<string> {
  if (import.meta.server) return useApiUrl(path)
  const { useAuthUser } = await import('~/composables/useAuth')
  const { userId } = await useAuthUser()
  const sep = path.includes('?') ? '&' : '?'
  return `${useApiUrl(path)}${sep}userId=${encodeURIComponent(userId)}`
}
