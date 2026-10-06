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

// Abgelaufene/ungültige Sitzung: Die API antwortet mit 401 "Anmeldung erforderlich", obwohl wir ein Token mitgeschickt haben
// (der Server lehnt ungültige Tokens jetzt ab, statt still auf einen Demo-Nutzer zu fallen). Dann geht es zurück zum Login.
export function shouldRedirectToLogin(status: number, message: unknown, sentAuthorization: boolean, currentPath: string): boolean {
  if (status !== 401 || !sentAuthorization) return false
  if (String(message || '') !== 'Anmeldung erforderlich') return false
  return !currentPath.startsWith('/login') && !currentPath.startsWith('/auth') && !currentPath.startsWith('/reset-password')
}
