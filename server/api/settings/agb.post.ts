import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { fileBase64, fileName } = body

  if (!fileBase64 || !fileName) {
    throw createError({ statusCode: 400, statusMessage: 'fileBase64 und fileName erforderlich' })
  }

  const config = useRuntimeConfig()
  const s3 = new S3Client({
    region: 'eu-central-1',
    credentials: process.env.AWS_LAMBDA_FUNCTION_NAME ? undefined : {
      accessKeyId:     (config.awsAccessKeyId as string || '').replace(/^"|"$/g, ''),
      secretAccessKey: (config.awsSecretAccessKey as string || '').replace(/^"|"$/g, ''),
    }
  })

  const base64Data = fileBase64.replace(/^data:application\/pdf;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')

  const key = `public/agb/${Date.now()}-${fileName}`

  await s3.send(new PutObjectCommand({
    Bucket: 'plexora-files',
    Key: key,
    Body: buffer,
    ContentType: 'application/pdf',
  }))

  const url = `https://plexora-files.s3.eu-central-1.amazonaws.com/${key}`

  const dynamo = getDynamoClient()
  await dynamo.send(new PutCommand({
    TableName: 'plexora-settings',
    Item: {
      settingId: 'agb',
      scope: 'global',
      url,
      fileName,
      uploaded: new Date().toISOString(),
    }
  }))

  return { success: true, url }
})
