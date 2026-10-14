import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'
import { termineIcalUrl } from '../../utils/termineIcalStore'

// Der Abo-Link des eigenen Terminkalenders (oder null, wenn noch keiner erzeugt wurde).
export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const item = (await getDynamoClient().send(new GetCommand({ TableName: 'plexora-nexora', Key: { tenantId } }))).Item
  return { url: item?.termineIcalToken ? termineIcalUrl(tenantId, item.termineIcalToken) : null }
})
