import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { requireAuth } from '../../utils/verifyAuth'
import { assertNotDemo } from '../../utils/demoPolicy'
import { normalizePrefix, safeFileName, isAllowedKey, UPLOAD_MIME, MAX_UPLOAD_BYTES } from '../../utils/s3Policy'
import { sniffImage, extType, isSafeSvg } from '../../utils/imageSniff'
import { planFor, denyOrLog } from '../../utils/planGate'
import { checkRateLimit } from '../../utils/rateLimit'
import { tenantKey } from '../../utils/mailTemplateStore'
import { resolveUserId } from '../../utils/tenant'
import { PLAN_LIMITS, formatBytes } from '../../../shared/plans'

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
  const ext = safeName.split('.').pop()!.toLowerCase()
  const contentType = UPLOAD_MIME[ext]

  // Dem Dateiinhalt wird geglaubt, nicht der Endung: ein "bild.png" mit HTML/Skript dahinter landet nie im öffentlichen Bucket
  const sniffed = sniffImage(buffer)
  if (!sniffed || sniffed !== extType(ext)) throw createError({ statusCode: 400, statusMessage: 'Der Dateiinhalt passt nicht zur Endung (erlaubt: echte jpg, png, gif, webp, svg)' })
  if (sniffed === 'svg' && !isSafeSvg(buffer.toString('utf8'))) throw createError({ statusCode: 400, statusMessage: 'Das SVG enthält aktive Inhalte (Skript, Ereignisse, fremde Verweise) und wird abgelehnt' })

  // Tarif: Dateigröße, Menge je Stunde/Tag, SVG nur mit Lizenz (Beobachtungsmodus: nur Protokoll)
  const info = await planFor(auth)
  if (info && !info.exempt) {
    const lim = PLAN_LIMITS[info.plan]
    if (buffer.length > lim.uploadMaxBytes) denyOrLog(info, 'upload', 413, 'UPLOAD_TOO_LARGE', `Im Tarif ${info.plan} sind Dateien bis ${formatBytes(lim.uploadMaxBytes)} erlaubt.`, { size: buffer.length, max: lim.uploadMaxBytes })
    if (sniffed === 'svg' && info.plan === 'free') denyOrLog(info, 'upload', 402, 'PLAN_REQUIRED', 'SVG-Dateien gibt es erst mit einer Lizenz. PNG, JPG und WebP gehen immer.', { need: 'paid' })
    if (!(await checkRateLimit('upload:h', info.tenantId, lim.uploadsPerHour, 3600))) denyOrLog(info, 'upload', 429, 'UPLOAD_RATE', `Höchstens ${lim.uploadsPerHour} Uploads pro Stunde. Bitte später erneut versuchen.`, { per: 'hour', max: lim.uploadsPerHour })
    if (!(await checkRateLimit('upload:d', info.tenantId, lim.uploadsPerDay, 86400))) denyOrLog(info, 'upload', 429, 'UPLOAD_DAILY', `Heute sind höchstens ${lim.uploadsPerDay} Uploads möglich.`, { per: 'day', max: lim.uploadsPerDay })
  }

  // Der Schlüssel enthält einen Mandanten-Ordner: ein anderes Konto kann diese Datei mit bekanntem Namen nicht überschreiben
  const owner = info?.tenantId || await resolveUserId(auth.email)
  const key = `${safePrefix}${tenantKey(owner)}/${safeName}`
  if (!isAllowedKey(key)) throw createError({ statusCode: 400, statusMessage: 'Ungültiger Schlüssel' })

  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }))

  return { success: true, key, url: `https://${BUCKET}.s3.eu-central-1.amazonaws.com/${key}` }
})
