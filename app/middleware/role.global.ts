import { areaForPath } from '~~/shared/roles'

// Seitenschutz nach Rolle: ein Mitglied, das /finance per Adresse, Lesezeichen oder Mail-Link öffnet, landet VOR dem Seitenaufbau auf "Kein Zugriff"
// (kein Flackern, keine halb geladene Seite). Nur wenn der Server die Rollen auch durchsetzt; sonst bleibt alles wie bisher.
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const area = areaForPath(to.path)
  if (!area) return
  const { load, can, state } = useRole()
  await load()
  if (!state.value.loaded || can(area.role)) return
  return navigateTo({ path: '/kein-zugriff', query: { bereich: area.area, rolle: area.role } })
})
