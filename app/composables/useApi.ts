export function useApiUrl(path: string): string {
  const config = useRuntimeConfig()
  const base = config.public.apiBase || ''
  return `${base}${path}`
}
