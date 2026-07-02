import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const email = getHeader(event, 'x-user-email') || ''
  if (!email) throw createError({ statusCode: 401 })
  if (email === 'demo@plexora.eu') throw createError({ statusCode: 403, message: 'Demo-Account kann keine neuen Pakete freischalten' })

  const body = await readBody(event)
  const packageKey = body?.packageKey as string
  if (!packageKey) throw createError({ statusCode: 400, message: 'packageKey erforderlich' })

  const dynamo = getDynamoClient()
  const res = await dynamo.send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))
  const item = res.Items?.[0]
  if (!item) throw createError({ statusCode: 404, message: 'Nexora-Record nicht gefunden' })

  const bp = item.branchPackages
  const existing: string[] = bp instanceof Set ? Array.from(bp as Set<string>) : (Array.isArray(bp) ? bp : [])
  if (existing.includes(packageKey)) return { branchPackages: existing }

  const updated = [...existing, packageKey]
  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-nexora',
    Key: { tenantId: item.tenantId },
    UpdateExpression: 'SET branchPackages = :p',
    ExpressionAttributeValues: { ':p': updated },
  }))

  return { branchPackages: updated }
})
