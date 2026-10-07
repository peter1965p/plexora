// Verständliche Hinweise, wenn der Server wegen Tarif oder Mengenlimit ablehnt (Codes aus server/middleware/plan.ts, mailQuota.ts, aws/s3-upload).
// Der Server liefert die Meldung selbst mit; hier wird nur entschieden, OB und mit welchem Link sie als Hinweis erscheint.
export interface PlanNotice { message: string; kind: 'plan' | 'limit' | 'role'; link?: { to: string; label: string } }

const PLAN_CODES = new Set(['PLAN_REQUIRED', 'FREE_LIMIT'])
const LIMIT_CODES = new Set(['MAIL_LIMIT', 'UPLOAD_RATE', 'UPLOAD_DAILY', 'UPLOAD_TOO_LARGE'])

export function planNoticeFrom(status: number, body: any): PlanNotice | null {
  const code = String(body?.data?.code || '')
  const message = String(body?.message || body?.statusMessage || '').trim()
  if (!message) return null
  if ((status === 402) && PLAN_CODES.has(code)) return { message, kind: 'plan', link: { to: '/store', label: 'Zum Modul-Store' } }
  if (status === 403 && code === 'ROLE_REQUIRED') return { message, kind: 'role' }          // angemeldet, aber die Rolle reicht nicht: Hinweis, nie zurück zum Login
  if ((status === 429 || status === 413) && LIMIT_CODES.has(code)) return { message, kind: 'limit' }
  return null
}
