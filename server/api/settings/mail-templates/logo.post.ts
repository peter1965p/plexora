import { randomBytes } from 'crypto'
import { requireOwnerContext, loadStoredInvite, saveInviteConfig, tenantKey, putLogoObject, deleteLogoObject, LOGO_UPLOADS_PER_HOUR } from '../../../utils/mailTemplateStore'
import { assertNotDemo } from '../../../utils/demoPolicy'
import { checkRateLimit } from '../../../utils/rateLimit'
import { processLogo, LogoError, MAX_LOGO_BYTES } from '../../../utils/mailLogo'
import { resolveInviteConfig, logoUrlForFile, LOGO_PREFIX } from '../../../../shared/mailTemplate'

// Logo für den Mailkopf hochladen (nur Inhaber, Demo-Konto 403, höchstens 10 pro Stunde und Konto).
// Der Schlüssel entsteht ausschließlich hier: Mandanten-Schlüssel + 128-Bit-Zufalls-ID. Weder Dateiname noch Pfad stammen aus der Anfrage.
export default defineEventHandler(async (event) => {
  const { auth, tenantId } = await requireOwnerContext(event)
  assertNotDemo(auth, 'Im Demo-Zugang sind Uploads deaktiviert.')
  if (!(await checkRateLimit('mail-logo-upload', tenantId, LOGO_UPLOADS_PER_HOUR, 3600))) throw createError({ statusCode: 429, message: `Höchstens ${LOGO_UPLOADS_PER_HOUR} Uploads pro Stunde. Bitte später erneut versuchen.` })

  const body = await readBody(event)
  const b64 = typeof body?.fileBase64 === 'string' ? body.fileBase64.replace(/^data:[^;,]*;base64,/, '') : ''
  if (!b64 || b64.length > Math.ceil(MAX_LOGO_BYTES * 4 / 3) + 16 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) throw createError({ statusCode: 400, message: 'Bitte ein PNG oder JPG bis 300 KB auswählen.' })
  let out
  try { out = processLogo(Buffer.from(b64, 'base64'), body?.fileName) } catch (e: any) {
    if (e instanceof LogoError) throw createError({ statusCode: 400, message: e.message })
    throw createError({ statusCode: 400, message: 'Das Bild konnte nicht verarbeitet werden.' })
  }

  const key = `${LOGO_PREFIX}/${tenantKey(tenantId)}/${randomBytes(16).toString('hex')}.${out.type}`
  const prev = resolveInviteConfig(await loadStoredInvite(tenantId).catch(() => null))
  await putLogoObject(key, out.data, out.type === 'png' ? 'image/png' : 'image/jpeg')
  try {
    await saveInviteConfig(tenantId, { ...prev, logo: { ...prev.logo, mode: 'custom', file: key, w: out.width, h: out.height } }, auth.email)
  } catch (e) { await deleteLogoObject(tenantId, key); throw e }      // nichts verwaist liegen lassen
  await deleteLogoObject(tenantId, prev.logo.file)                       // das alte Logo wird beim Ersetzen gelöscht
  return { logoUrl: logoUrlForFile(key), width: out.width, height: out.height, warning: out.warning || null }
})
