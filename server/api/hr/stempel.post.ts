import { ScanCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId } from '../../utils/tenant'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const body       = await readBody(event)
  const userId     = await resolveUserId(body.userId || 'demo-user')
  const action     = body.action as 'in' | 'out'
  const empId      = body.employeeId as string
  const empName    = body.employeeName as string
  const today      = new Date().toISOString().slice(0, 10)
  const nowTime    = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false })
  const db         = getDynamoClient()

  if (action === 'in') {
    // Check if already clocked in today
    const existing = await db.send(new ScanCommand({
      TableName: 'plexora-hr-timelog',
      FilterExpression: 'userId = :u AND #d = :t AND employeeId = :e AND clockOut = :empty',
      ExpressionAttributeNames:  { '#d': 'date' },
      ExpressionAttributeValues: { ':u': userId, ':t': today, ':e': empId, ':empty': '' },
    }))
    if ((existing.Items || []).length > 0) {
      throw createError({ statusCode: 409, message: 'Bereits eingestempelt' })
    }

    const entry = {
      userId, logId: randomUUID(),
      employeeId: empId, employeeName: empName,
      date: today, clockIn: nowTime, clockOut: '',
      minutes: 0, note: '', created: new Date().toISOString(),
    }
    await db.send(new PutCommand({ TableName: 'plexora-hr-timelog', Item: entry }))
    return { success: true, action: 'in', time: nowTime, entry }
  }

  if (action === 'out') {
    // Find open entry for today
    const res = await db.send(new ScanCommand({
      TableName: 'plexora-hr-timelog',
      FilterExpression: 'userId = :u AND #d = :t AND employeeId = :e AND clockOut = :empty',
      ExpressionAttributeNames:  { '#d': 'date' },
      ExpressionAttributeValues: { ':u': userId, ':t': today, ':e': empId, ':empty': '' },
    }))
    const open = (res.Items || [])[0] as any
    if (!open) throw createError({ statusCode: 404, message: 'Kein offener Einstempel-Eintrag gefunden' })

    const start   = new Date(`${today}T${open.clockIn}`)
    const end     = new Date(`${today}T${nowTime}`)
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000)

    await db.send(new UpdateCommand({
      TableName: 'plexora-hr-timelog',
      Key: { userId, logId: open.logId },
      UpdateExpression: 'SET clockOut = :co, minutes = :m',
      ExpressionAttributeValues: { ':co': nowTime, ':m': minutes },
    }))
    return { success: true, action: 'out', time: nowTime, minutes }
  }

  throw createError({ statusCode: 400, message: 'Ungültige Aktion' })
})
