import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { requireAdmin } from '../../utils/verifyAuth'
import { isAllowedKey } from '../../utils/s3Policy'

const BUCKET = 'plexora-files'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody(event)
  const { key } = body

  if (!key) {
    throw createError({ statusCode: 400, statusMessage: 'key erforderlich' })
  }
  // Nur Objekte der öffentlichen Bild-Präfixe; Deploy-Zips und Sicherungen sind hier nie löschbar
  if (!isAllowedKey(key)) throw createError({ statusCode: 403, statusMessage: 'Dieser Schlüssel darf nicht gelöscht werden' })

  const client = new S3Client({ region: 'eu-central-1' })
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))

  return { success: true }
})
