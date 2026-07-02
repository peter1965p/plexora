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
    TableName: 'plexora-properties',
    KeyConditionExpression: 'tenantId = :t',
    ExpressionAttributeValues: { ':t': tenantId },
  }))

  const properties = (res.Items || [])
    .filter((p: any) => p.status === 'frei')
    .map((p: any) => {
      const kaltmiete   = Number(p.kaltmiete) || 0
      const nebenkosten = Number(p.nebenkosten) || 0
      return {
        propertyId:  p.propertyId,
        type:        p.type        || '',
        street:      p.street      || '',
        zipCity:     p.zipCity     || '',
        size:        p.size        || '',
        rooms:       p.rooms       || '',
        priceType:   p.priceType   || 'miete',
        kaufpreis:   p.kaufpreis   || '',
        kaltmiete:   p.priceType === 'miete' ? kaltmiete : '',
        nebenkosten: p.priceType === 'miete' ? nebenkosten : '',
        warmmiete:   p.priceType === 'miete' ? Math.round((kaltmiete + nebenkosten) * 100) / 100 : '',
        imageUrl:    p.imageUrl    || '',
        description: p.description || '',
      }
    })

  return { properties }
})
