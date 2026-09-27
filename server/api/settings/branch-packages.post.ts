import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

interface BranchModule { key: string; status: 'active' | 'disabled' }

const ACTIONS = ['install', 'uninstall', 'enable', 'disable'] as const
type Action = typeof ACTIONS[number]

export default defineEventHandler(async (event) => {
  const email = event.context.auth?.email || ''
  if (!email) throw createError({ statusCode: 401 })
  if (email === 'demo@plexora.eu') throw createError({ statusCode: 403, message: 'Demo-Account kann keine Module verwalten' })

  const body = await readBody(event)
  const packageKey = body?.packageKey as string
  const action = (body?.action as Action) || 'install' // Standard: bisheriges Verhalten (nur Freischalten)
  if (!packageKey) throw createError({ statusCode: 400, message: 'packageKey erforderlich' })
  if (!ACTIONS.includes(action)) throw createError({ statusCode: 400, message: 'Ungültige Aktion' })

  const dynamo = getDynamoClient()
  const res = await dynamo.send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))
  const item = res.Items?.[0]
  if (!item) throw createError({ statusCode: 404, message: 'Nexora-Record nicht gefunden' })

  // Bestehenden Stand einlesen (neues oder altes Format), dabei auf neues Format normalisieren
  let modules: BranchModule[]
  if (Array.isArray(item.branchModules)) {
    modules = item.branchModules as BranchModule[]
  } else {
    const bp = item.branchPackages
    const legacy: string[] = bp instanceof Set ? Array.from(bp as Set<string>) : (Array.isArray(bp) ? bp : [])
    modules = legacy.map(key => ({ key, status: 'active' }))
  }

  const idx = modules.findIndex(m => m.key === packageKey)

  if (action === 'install') {
    if (idx === -1) modules.push({ key: packageKey, status: 'active' })
    else modules[idx].status = 'active'
  } else if (action === 'uninstall') {
    if (idx !== -1) modules.splice(idx, 1)
  } else if (action === 'disable') {
    if (idx !== -1) modules[idx].status = 'disabled'
  } else if (action === 'enable') {
    if (idx !== -1) modules[idx].status = 'active'
  }

  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-nexora',
    Key: { tenantId: item.tenantId },
    UpdateExpression: 'SET branchModules = :m REMOVE branchPackages',
    ExpressionAttributeValues: { ':m': modules },
  }))

  return { branchModules: modules }
})
