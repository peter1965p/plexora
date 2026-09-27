import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

interface BranchModule { key: string; status: 'active' | 'disabled' }

export default defineEventHandler(async (event) => {
  const email = event.context.auth?.email || ''
  if (!email) return { branchModules: [] }
  const res = await getDynamoClient().send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))
  const item = res.Items?.[0]

  // Neues Format, falls schon migriert
  if (Array.isArray(item?.branchModules)) {
    return { branchModules: item.branchModules as BranchModule[] }
  }

  // Rückwärtskompatibel: altes Format war eine flache Liste von Keys (alle "active")
  const bp = item?.branchPackages
  const legacy: string[] = bp instanceof Set ? Array.from(bp as Set<string>) : (Array.isArray(bp) ? bp : [])
  const branchModules: BranchModule[] = legacy.map(key => ({ key, status: 'active' }))
  return { branchModules }
})
