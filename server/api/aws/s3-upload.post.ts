import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const BUCKET = 'plexora-files'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { fileBase64, fileName, prefix } = body

  if (!fileBase64 || !fileName) {
    throw createError({ statusCode: 400, statusMessage: 'fileBase64 und fileName erforderlich' })
  }

  const client = new S3Client({ region: 'eu-central-1' })

  const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')

  const key = `${prefix || ''}${fileName}`

  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
  }))

  return { success: true, key, url: `https://${BUCKET}.s3.eu-central-1.amazonaws.com/${key}` }
})
