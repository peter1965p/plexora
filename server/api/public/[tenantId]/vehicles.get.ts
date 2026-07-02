import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  })

  const tenantId = getRouterParam(event, 'tenantId') || ''
  const dynamo   = getDynamoClient()

  const res = await dynamo.send(new QueryCommand({
    TableName: 'plexora-vehicles',
    KeyConditionExpression: 'tenantId = :t',
    ExpressionAttributeValues: { ':t': tenantId },
  }))

  const vehicles = (res.Items || [])
    .filter((v: any) => v.status === 'verfügbar')
    .map((v: any) => ({
      vehicleId:    v.vehicleId,
      make:         v.make        || '',
      model:        v.model       || '',
      variant:      v.variant     || '',
      year:         v.year        || '',
      mileage:      v.mileage     || '',
      fuel:         v.fuel        || '',
      transmission: v.transmission || '',
      power:        v.power       || '',
      price:        v.price       || '',
      color:        v.color       || '',
      imageUrl:     v.imageUrl    || '',
      description:  v.description || '',
    }))

  return { vehicles }
})
