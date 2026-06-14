import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'

const BUCKET = 'plexora-files'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { key } = body

  if (!key) {
    throw createError({ statusCode: 400, statusMessage: 'key erforderlich' })
  }

  const client = new S3Client({ region: 'eu-central-1' })
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))

  return { success: true }
})
