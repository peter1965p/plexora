import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { getUserId } from '../../utils/queryByUser'

// Der Nutzer kommt aus dem Anmelde-Token, nicht aus dem Body. ConditionExpression verhindert,
// dass für einen unbekannten Schlüssel ein leerer Phantom-Eintrag angelegt wird.
export default defineEventHandler(async (event) => {
  const notificationId = getRouterParam(event, 'id')
  try {
    await getDynamoClient().send(new UpdateCommand({
      TableName: 'plexora-notifications',
      Key: { notificationId, userId: getUserId(event) },
      UpdateExpression: 'SET #r = :r',
      ConditionExpression: 'attribute_exists(notificationId)',
      ExpressionAttributeNames: { '#r': 'read' },
      ExpressionAttributeValues: { ':r': true },
    }))
  } catch (e: any) {
    if (e?.name !== 'ConditionalCheckFailedException') throw e
  }
  return { success: true }
})
