export async function usePortalFetch(url: string, email?: Ref<string>) {
  const { useAuthHeader } = await import('~/composables/useAuth')
  const authHeaders = await useAuthHeader()
  return useFetch(() => email?.value ? `${url}?email=${email.value}` : url, {
    watch: email ? [email] : false,
    headers: authHeaders,
  })
}
