// Demo-Konto: vor dem Abmelden und beim Start der Demo den Standard-Stand wiederherstellen (alles, was Besucher ausprobiert haben, verschwindet).
// Tut nichts bei anderen Konten. Fehler und Wartezeit blockieren das Abmelden nie (höchstens 6 Sekunden).
import { isDemoEmail } from '~~/shared/demo'
export async function demoResetNow(release = false): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const { useAuthUser, useAuthHeader } = await import('~/composables/useAuth')
    const u = await useAuthUser()
    if (!isDemoEmail(u.email)) return
    const headers = await useAuthHeader()
    await Promise.race([
      $fetch(useApiUrl('/api/demo/reset'), { method: 'POST', headers, body: { release } }),
      new Promise(resolve => setTimeout(resolve, 6000)),
    ])
  } catch { /* Zurücksetzen ist ein Komfort: der Zeitplan holt es nach */ }
}
