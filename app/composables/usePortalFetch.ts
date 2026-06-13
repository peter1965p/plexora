export function usePortalFetch(url: string, email?: Ref<string>) {
  return useFetch(() => email?.value ? `${url}?email=${email.value}` : url, {
    watch: email ? [email] : false
  })
}
