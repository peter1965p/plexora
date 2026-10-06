import { GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'

export type BranchInstallDecision = { ok: true; reason: 'admin' | 'free' | 'licensed' } | { ok: false; status: 404 | 403 | 400; message: string }

/**
 * Darf der Aufrufer ein NEUES Branchen-Paket freischalten?
 * - Plattform-Admin: ja
 * - Paket im Katalog (plexora-plugin-registry) mit Preis 0: ja (kostenlos)
 * - Paket in einer aktiven Lizenz des Aufrufers (bezahlt über den Store): ja
 * - sonst nein (kostenpflichtig: nur über Stripe-Checkout + Webhook)
 */
export async function decideBranchInstall(opts: { email: string; groups: string[]; packageKey: string }): Promise<BranchInstallDecision> {
  const key = String(opts.packageKey || '').trim().toLowerCase()
  if (!/^[a-z0-9-]{1,40}$/.test(key)) return { ok: false, status: 400, message: 'Ungültiger Paketschlüssel' }
  if ((opts.groups || []).includes('admins')) return { ok: true, reason: 'admin' }

  const db = getDynamoClient()
  const item = (await db.send(new GetCommand({ TableName: 'plexora-plugin-registry', Key: { key } }))).Item
  if (!item) return { ok: false, status: 404, message: 'Paket nicht gefunden' }
  const price = item.price
  if (price !== undefined && price !== null && Number(price) === 0) return { ok: true, reason: 'free' }

  const lic = await db.send(new ScanCommand({
    TableName: 'plexora-licenses',
    FilterExpression: 'customerEmail = :e AND #st = :active',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':e': opts.email, ':active': 'active' },
  }))
  const licensed = (lic.Items || []).some((l: any) => {
    const m = l.modules
    const list: string[] = m instanceof Set ? Array.from(m as Set<string>) : (Array.isArray(m) ? m : [])
    return list.map(x => String(x).toLowerCase()).includes(key)
  })
  if (licensed) return { ok: true, reason: 'licensed' }
  return { ok: false, status: 403, message: 'Dieses Paket ist kostenpflichtig. Bitte im Modul-Store bestellen.' }
}
