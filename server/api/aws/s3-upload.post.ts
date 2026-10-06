import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { requireAuth } from '../../utils/verifyAuth'
import { assertNotDemo } from '../../utils/demoPolicy'
import { normalizePrefix, safeFileName, isAllowedKey, UPLOAD_MIME, MAX_UPLOAD_BYTES } from '../../utils/s3Policy'

const BUCKET = 'plexora-files'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  assertNotDemo(auth, 'Im Demo-Zugang sind Datei-Uploads deaktiviert.')
  const body = await readBody(event)
  const { fileBase64, fileName, prefix } = body

  if (!fileBase64 || !fileName) {
    throw createError({ statusCode: 400, statusMessage: 'fileBase64 und fileName erforderlich' })
  }

  const client = new S3Client({ region: 'eu-central-1' })

  const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')

  // Nur öffentliche Bild-Präfixe, nur Bildformate, kein Pfad aus dem Request (früher konnte jeder Angemeldete jeden Schlüssel überschreiben, z. B. lambda/…)
  const safePrefix = normalizePrefix(prefix)
  const safeName = safeFileName(fileName)
  if (!safePrefix) throw createError({ statusCode: 400, statusMessage: 'Ungültiges Ziel-Präfix' })
  if (!safeName) throw createError({ statusCode: 400, statusMessage: 'Dateiname oder Bildformat nicht erlaubt (jpg, png, gif, webp, svg)' })
  if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) throw createError({ statusCode: 413, statusMessage: 'Datei leer oder größer als 8 MB' })
  const key = `${safePrefix}${safeName}`
  if (!isAllowedKey(key)) throw createError({ statusCode: 400, statusMessage: 'Ungültiger Schlüssel' })

  const ext = safeName.split('.').pop()!.toLowerCase()
  const contentType = UPLOAD_MIME[ext]

  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }))

  return { success: true, key, url: `https://${BUCKET}.s3.eu-central-1.amazonaws.com/${key}` }
})
