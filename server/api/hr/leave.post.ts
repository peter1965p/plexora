import { resolveUserId } from '../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { randomUUID } from 'crypto'
import { requireAuth } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  const body    = await readBody(event)
  const userId  = await resolveUserId(requireAuth(event).email)
  const request = {
    userId, leaveId: randomUUID(),
    employeeId:   body.employeeId,
    employeeName: body.employeeName,
    type:         body.type || 'vacation',
    startDate:    body.startDate,
    endDate:      body.endDate,
    reason:       body.reason || '',
    status:       'pending',
    created:      new Date().toISOString(),
  }
  await getDynamoClient().send(new PutCommand({ TableName: 'plexora-leave', Item: request }))
  return { success: true, request }
})
