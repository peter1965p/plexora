import { listStorePackages, loadShownKeys } from '../../utils/branchPackages'
import { parseLandingPackages, selectPackages } from '../../../shared/landingTheme'

// Branchen-Pakete für die öffentliche Startseite: dieselben Einträge wie im Modul-Store, gefiltert nach der Auswahl in den Einstellungen (Startseite → Branchen-Pakete).
// Öffentlich sind ausschließlich Schlüssel, Name, Symbol, Preis, Beschreibung und Merkmale (keine Plugin-Adressen, keine internen Felder).
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' })
  try {
    const [all, shown] = await Promise.all([listStorePackages(), loadShownKeys()])
    return { packages: selectPackages(all, parseLandingPackages(shown)).map(({ plugin: _p, ...pub }) => pub) }     // 'plugin' dient nur der Sortierung
  } catch {
    return { packages: [], unavailable: true }     // Abruf gescheitert: die Startseite zeigt ihre festen Einträge
  }
})
