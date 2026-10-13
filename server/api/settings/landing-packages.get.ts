import { requireAdmin } from '../../utils/verifyAuth'
import { listStorePackages, loadShownKeys } from '../../utils/branchPackages'
import { parseLandingPackages } from '../../../shared/landingTheme'

// Für die Einstellungen: alle Pakete des Stores und die aktuelle Auswahl (null = alle).
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const [available, shown] = await Promise.all([listStorePackages(), loadShownKeys()])
  return { available: available.map(p => ({ key: p.key, name: p.name, icon: p.icon, price: p.price })).sort((a, b) => a.name.localeCompare(b.name, 'de')), shown: parseLandingPackages(shown) }
})
