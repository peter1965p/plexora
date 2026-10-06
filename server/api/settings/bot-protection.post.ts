import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'
import { isDemoAccount } from '../../utils/mailGuard'
import { resolveUserId } from '../../utils/tenant'
import { encryptSecret } from '../../utils/crypto'
import { siteverify, TurnstileUnavailable } from '../../utils/turnstile'
import {
  BOT_SETTING_ID, WIDGET_MODES, SITE_KEY_RE, HOSTNAME_RE, EMPTY_BOT_SETTINGS,
  getBotSettings, hasKeys, maskSecret, describeForOwner, countProtectedCampaigns, type BotSettings,
} from '../../utils/botProtection'

// Ändern darf nur der Inhaber des Mandanten (oder ein Plattform-Admin); das Demo-Konto speichert nichts.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  if (!auth.email) throw createError({ statusCode: 401, message: 'Anmeldung erforderlich' })
  if (isDemoAccount(auth)) throw createError({ statusCode: 403, message: 'Im Demo-Zugang können keine Bot-Schutz-Schlüssel gespeichert werden.' })

  const scope = await resolveUserId(auth.email)
  const isOwner = scope.toLowerCase() === auth.email.toLowerCase()
  if (!isOwner && !(auth.groups || []).includes('admins')) {
    throw createError({ statusCode: 403, message: 'Nur der Inhaber des Kontos darf den Bot-Schutz ändern.' })
  }

  const body = (await readBody(event)) || {}
  const current = await getBotSettings(scope)
  const inUseCampaigns = await countProtectedCampaigns(scope)
  const db = getDynamoClient()
  const save = async (s: BotSettings) => {
    await db.send(new PutCommand({
      TableName: 'plexora-settings',
      Item: { settingId: BOT_SETTING_ID, scope, ...s, updated: new Date().toISOString() },
    }))
    return { ok: true, ...describeForOwner(s), protectedCampaigns: inUseCampaigns }
  }

  // Schlüssel entfernen: nur, wenn nichts mehr davon abhängt (sonst wären Formulare ausgesperrt)
  if (body.remove === true) {
    if (inUseCampaigns > 0 || current.contactProtection) {
      throw createError({
        statusCode: 409,
        message: `Der Bot-Schutz wird noch verwendet (${inUseCampaigns} Kampagne(n)${current.contactProtection ? ', Kontaktseite' : ''}). Bitte zuerst dort ausschalten.`,
      })
    }
    return save({ ...EMPTY_BOT_SETTINGS })
  }

  const next: BotSettings = { ...current }

  if (body.siteKey !== undefined) {
    const siteKey = String(body.siteKey).trim()
    if (!SITE_KEY_RE.test(siteKey)) throw createError({ statusCode: 400, message: 'Der Sitekey hat kein gültiges Format (beginnt mit 0x…).' })
    next.siteKey = siteKey
  }

  if (body.secret !== undefined && String(body.secret).trim() !== '') {
    const secret = String(body.secret).trim()
    if (secret.length < 10 || secret.length > 200 || /\s/.test(secret)) throw createError({ statusCode: 400, message: 'Das Secret hat kein gültiges Format.' })
    // Ob Cloudflare das Secret kennt, zeigt die Antwort auf ein Dummy-Token: nur ein falsches Secret meldet invalid-input-secret.
    try {
      const probe = await siteverify(secret, 'plexora-key-check')
      if (probe.errorCodes.some(c => c === 'invalid-input-secret' || c === 'missing-input-secret')) {
        throw createError({ statusCode: 400, message: 'Cloudflare akzeptiert dieses Secret nicht. Bitte Secret im Turnstile-Widget prüfen.' })
      }
    } catch (e) {
      if (e instanceof TurnstileUnavailable) {
        console.error('[turnstile] Secret-Prüfung nicht möglich', e.message)
        throw createError({ statusCode: 503, message: 'Cloudflare ist gerade nicht erreichbar, das Secret wurde nicht gespeichert. Bitte später erneut versuchen.' })
      }
      throw e
    }
    next.secretEncrypted = encryptSecret(secret)
    next.secretMasked = maskSecret(secret)
  }

  if (body.mode !== undefined) {
    if (!(WIDGET_MODES as readonly string[]).includes(String(body.mode))) throw createError({ statusCode: 400, message: 'Ungültiger Widget-Modus' })
    next.mode = String(body.mode) as BotSettings['mode']
  }

  if (body.hostnames !== undefined) {
    const list = Array.isArray(body.hostnames) ? body.hostnames : []
    const cleaned = [...new Set(list.map((h: unknown) => String(h).trim().toLowerCase()).filter(Boolean))] as string[]
    if (cleaned.length > 20 || cleaned.some(h => !HOSTNAME_RE.test(h))) throw createError({ statusCode: 400, message: 'Ungültige Domain in der Liste der erlaubten Seiten.' })
    next.hostnames = cleaned
  }

  if (body.enabled !== undefined) next.enabled = body.enabled === true
  if (body.contactProtection !== undefined) next.contactProtection = body.contactProtection === true

  if ((next.enabled || next.contactProtection) && !hasKeys(next)) {
    throw createError({ statusCode: 400, message: 'Bot-Schutz lässt sich nur mit gültigem Sitekey und Secret einschalten.' })
  }
  return save(next)
})
