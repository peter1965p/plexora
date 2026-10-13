import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

// Branchen-Pakete für die öffentliche Startseite: dieselben Einträge wie im Modul-Store (Registry), damit Preise und Texte nur an einer Stelle gepflegt werden.
// Öffentlich sind ausschließlich Schlüssel, Name, Symbol, Preis, Beschreibung und Merkmale der eingebauten, kostenpflichtigen Pakete (keine Plugin-Adressen, keine internen Felder).
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' })
  try {
    const res = await getDynamoClient().send(new ScanCommand({ TableName: 'plexora-plugin-registry' }))
    const packages = (res.Items || [])
      .filter((i: any) => i.builtin === true && Number(i.price) > 0 && /^[a-z0-9-]{1,40}$/.test(String(i.key)) && i.landing !== false)
      .map((i: any) => ({
        key: String(i.key), name: str(i.name, 80), icon: str(i.icon, 40), price: Math.round(Number(i.price) * 100) / 100, desc: str(i.desc, 300),
        features: (Array.isArray(i.features) ? i.features : []).filter((f: unknown) => typeof f === 'string').slice(0, 8).map((f: string) => f.slice(0, 40)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
    return { packages }
  } catch {
    return { packages: [] }
  }
})
