import { GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'

// Eingebaute, kostenpflichtige Branchen-Pakete aus dem Modul-Store (Registry) und die Auswahl, was auf der Startseite erscheint.
export interface BranchPackage { key: string; name: string; icon: string; price: number; desc: string; features: string[] }
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')

export async function listStorePackages(): Promise<BranchPackage[]> {
  const res = await getDynamoClient().send(new ScanCommand({ TableName: 'plexora-plugin-registry' }))
  return (res.Items || [])
    .filter((i: any) => i.builtin === true && Number(i.price) > 0 && /^[a-z0-9-]{1,40}$/.test(String(i.key)))
    .map((i: any) => ({
      key: String(i.key), name: str(i.name, 80), icon: str(i.icon, 40), price: Math.round(Number(i.price) * 100) / 100, desc: str(i.desc, 300),
      features: (Array.isArray(i.features) ? i.features : []).filter((f: unknown) => typeof f === 'string').slice(0, 8).map((f: string) => f.slice(0, 40)),
    }))
}
export async function loadShownKeys(): Promise<unknown> {
  return (await getDynamoClient().send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'landing-packages', scope: 'global' } }))).Item?.shown
}
