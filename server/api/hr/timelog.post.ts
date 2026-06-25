import { resolveUserId } from '../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const userId = await resolveUserId(body.userId || 'demo-user')
  const start  = body.clockIn  ? new Date(`${body.date}T${body.clockIn}`)  : null
  const end    = body.clockOut ? new Date(`${body.date}T${body.clockOut}`) : null
  const minutes = (start && end) ? Math.round((end.getTime() - start.getTime()) / 60000) : (Number(body.minutes) || 0)
  const entry = {
    userId, logId: randomUUID(),
    employeeId:   body.employeeId,
    employeeName: body.employeeName,
    date:         body.date,
    clockIn:      body.clockIn  || '',
    clockOut:     body.clockOut || '',
    minutes,
    note:         body.note || '',
    created:      new Date().toISOString(),
  }
  await getDynamoClient().send(new PutCommand({ TableName: 'plexora-hr-timelog', Item: entry }))
  return { success: true, entry }
})
