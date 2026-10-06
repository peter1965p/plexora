// Dünner Client für die Cloudflare-Turnstile-Schnittstelle "siteverify".
export const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

// Cloudflare ist nicht erreichbar oder antwortet unbrauchbar: Aufrufer müssen geschlossen scheitern.
export class TurnstileUnavailable extends Error {}

export interface SiteverifyResult { success: boolean; errorCodes: string[]; hostname: string }

export async function siteverify(secret: string, token: string, remoteIp?: string): Promise<SiteverifyResult> {
  const form = new URLSearchParams({ secret, response: token })
  if (remoteIp && remoteIp !== 'unknown') form.set('remoteip', remoteIp)
  let res: Response
  try {
    res = await fetch(SITEVERIFY_URL, { method: 'POST', body: form, signal: AbortSignal.timeout(5000) })
  } catch (e) {
    throw new TurnstileUnavailable(`Siteverify nicht erreichbar: ${(e as Error)?.message || e}`)
  }
  if (!res.ok) throw new TurnstileUnavailable(`Siteverify antwortet mit HTTP ${res.status}`)
  let data: any
  try { data = await res.json() } catch { throw new TurnstileUnavailable('Siteverify lieferte kein JSON') }
  return {
    success: data?.success === true,
    errorCodes: Array.isArray(data?.['error-codes']) ? data['error-codes'].map(String) : [],
    hostname: String(data?.hostname || '').toLowerCase(),
  }
}
