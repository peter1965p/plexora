// Zentrale Regel: Requests an die eigene API bekommen immer das Cognito-ID-Token, falls eines vorhanden ist
// und der Aufrufer nicht schon selbst einen Authorization-Header gesetzt hat. Fremde Hosts bekommen nie ein Token.
export function shouldAttachAuth(requestUrl: string, apiBase: string, existingHeaders?: HeadersInit | Record<string, any> | null): boolean {
  if (!requestUrl) return false
  const isApiHost = apiBase ? requestUrl.startsWith(apiBase) : requestUrl.startsWith('/api/')
  if (!isApiHost) return false
  if (!existingHeaders) return true
  const has = existingHeaders instanceof Headers
    ? existingHeaders.has('authorization')
    : Array.isArray(existingHeaders)
      ? existingHeaders.some(([k]) => String(k).toLowerCase() === 'authorization')
      : Object.keys(existingHeaders as Record<string, any>).some(k => k.toLowerCase() === 'authorization')
  return !has
}
