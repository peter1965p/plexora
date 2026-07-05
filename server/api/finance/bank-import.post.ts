import { resolveUserId } from '../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { randomUUID } from 'crypto'

function parseBankCsv(csv: string): Array<{ date: string; description: string; amount: number }> {
  const lines = csv.replace(/\r/g, '').trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []

  const sep = lines[0].includes(';') ? ';' : ','
  const cols = lines[0].split(sep).map(c => c.replace(/"/g, '').trim().toLowerCase())

  const idx = (names: string[]) => names.reduce((found, n) => found >= 0 ? found : cols.findIndex(c => c.includes(n)), -1)
  const dateIdx   = idx(['buchungstag','buchung','datum','date'])
  const descrIdx  = idx(['verwendungszweck','buchungstext','auftraggeber','beschreibung','name','empfänger'])
  const amountIdx = idx(['betrag','amount','umsatz'])

  if (dateIdx < 0 || amountIdx < 0) return []

  return lines.slice(1).map(line => {
    const parts = line.split(sep).map(p => p.replace(/"/g, '').trim())
    const rawAmt = (parts[amountIdx] || '0').replace(/\./g, '').replace(',', '.')
    return {
      date:        parts[dateIdx] || '',
      description: descrIdx >= 0 ? parts[descrIdx] : '',
      amount:      parseFloat(rawAmt) || 0,
    }
  }).filter(t => t.date && t.amount !== 0)
}

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const userId = await resolveUserId(event.context.auth?.email || 'demo-user')
  const client = getDynamoClient()

  const rows = parseBankCsv(body.csv as string)
  if (!rows.length) throw createError({ statusCode: 400, message: 'Keine Buchungen erkannt — bitte Spalten prüfen (Buchungstag, Verwendungszweck, Betrag)' })

  for (const row of rows) {
    await client.send(new PutCommand({
      TableName: 'plexora-bank-txn',
      Item: { userId, txnId: randomUUID(), ...row, matched: false, invoiceId: null, imported: new Date().toISOString() },
    }))
  }
  return { success: true, count: rows.length }
})
