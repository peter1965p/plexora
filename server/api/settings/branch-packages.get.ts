import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const email = getHeader(event, 'x-user-email') || ''
  if (!email) return { branchPackages: [] }
  const res = await getDynamoClient().send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))
  const item = res.Items?.[0]
  const bp = item?.branchPackages
  const arr: string[] = bp instanceof Set ? Array.from(bp as Set<string>) : (Array.isArray(bp) ? bp : [])
  return { branchPackages: arr }
})
