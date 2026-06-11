import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const client = getDynamoClient()
  const employee = {
    userId:     body.userId || 'demo-user',
    employeeId: randomUUID(),
    firstName:  body.firstName,
    lastName:   body.lastName,
    email:      body.email,
    department: body.department,
    role:       body.role,
    status:     body.status || 'active',
    startDate:  body.startDate,
    created:    new Date().toISOString(),
  }
  await client.send(new PutCommand({ TableName: 'plexora-hr', Item: employee }))
  return { success: true, employee }
})
