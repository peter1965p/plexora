import { CognitoIdentityProviderClient, ListUsersCommand, AdminLinkProviderForUserCommand, AdminUpdateUserAttributesCommand, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider'

// Pre-Sign-up-Trigger des User Pools (Lambda plexora-pre-signup). Quelle im Repo seit 07.10.2026; ausgeliefert mit scripts/aws/deploy-pre-signup.sh.
//
// Aufgabe: Ein neuer föderierter Login (Google) wird mit einem bereits bestehenden NATIVEN Konto derselben E-Mail verknüpft, damit kein Zweitprofil entsteht.
//
// Regeln (Sicherheit):
//  1. Google-Login nur, wenn Google die Adresse als bestätigt meldet (email_verified = true). Sonst wird abgelehnt.
//  2. Verknüpft wird NUR mit einem nativen Konto, dessen Adresse bestätigt ist (email_verified = true) und das nutzbar ist
//     (Status CONFIRMED, oder FORCE_CHANGE_PASSWORD / RESET_REQUIRED = von uns angelegte Konten wie nach einem Kauf). Nie mit einem UNCONFIRMED-Konto:
//     Wer vorab mit der Adresse eines Fremden nativ registriert, kennt dessen Passwort und könnte sonst später in das Konto des Opfers.
//  3. Gibt es unbestätigte native Konten mit derselben Adresse, entscheidet UNCONFIRMED_NATIVE_POLICY:
//       separate (Standard): nicht verknüpfen, das Google-Konto entsteht separat; das unbestätigte Konto bleibt unbenutzbar liegen
//       reject:              Anmeldung ablehnen (mit Hinweis)
//       delete:              das unbestätigte Konto löschen (braucht cognito-idp:AdminDeleteUser für die Rolle der Lambda), dann separat anlegen
//  4. Mehrdeutigkeit (mehr als ein bestätigtes natives Konto) oder ein Fehler bei der Suche führt nie zu einer Verknüpfung.

const USABLE_STATUS = new Set(['CONFIRMED', 'FORCE_CHANGE_PASSWORD', 'RESET_REQUIRED'])
const POLICIES = new Set(['separate', 'reject', 'delete'])
// Der Filter von Cognito kennt kein Maskieren sicher genug: nur unverfängliche Zeichen zulassen
const SAFE_EMAIL = /^[^\s"'\\<>(),;:]{1,64}@[A-Za-z0-9.-]{1,255}\.[A-Za-z]{2,24}$/

export const attr = (user, name) => (user?.Attributes || []).find(a => a.Name === name)?.Value
const isTrue = (v) => v === true || v === 'true'

export function createHandler(cognito, { policy, log = console } = {}) {
  const mode = POLICIES.has(policy || process.env.UNCONFIRMED_NATIVE_POLICY) ? (policy || process.env.UNCONFIRMED_NATIVE_POLICY) : 'separate'
  return async (event) => {
    if (event.triggerSource !== 'PreSignUp_ExternalProvider') return event      // native Registrierung: unverändert (E-Mail-Bestätigung wie bisher)

    const attrs = event.request?.userAttributes || {}
    const email = String(attrs.email || '').trim()
    if (!email || !isTrue(attrs.email_verified)) throw new Error('Die E-Mail-Adresse deines Google-Kontos ist nicht bestätigt. Die Anmeldung ist nicht möglich.')
    if (!SAFE_EMAIL.test(email)) throw new Error('Diese E-Mail-Adresse kann nicht verwendet werden.')

    const userPoolId = event.userPoolId
    let linkTarget = null
    try {
      const res = await cognito.send(new ListUsersCommand({ UserPoolId: userPoolId, Filter: `email = "${email}"`, Limit: 20 }))
      const natives = (res.Users || []).filter(u => u.UserStatus !== 'EXTERNAL_PROVIDER' && !String(u.Username || '').toLowerCase().startsWith('google_') && u.Enabled !== false)
      const usable = natives.filter(u => USABLE_STATUS.has(u.UserStatus) && isTrue(attr(u, 'email_verified')))
      const unconfirmed = natives.filter(u => !usable.includes(u))

      if (unconfirmed.length) {
        log.warn(`[pre-signup] ${unconfirmed.length} unbestätigtes natives Konto mit derselben Adresse, Regel: ${mode}`)
        if (mode === 'reject') throw new Error('Für diese E-Mail-Adresse gibt es eine unbestätigte Registrierung. Bitte bestätige sie oder wende dich an den Support.')
        if (mode === 'delete') for (const u of unconfirmed.filter(x => x.UserStatus === 'UNCONFIRMED')) await cognito.send(new AdminDeleteUserCommand({ UserPoolId: userPoolId, Username: u.Username }))
      }
      if (usable.length === 1) linkTarget = usable[0]
      else if (usable.length > 1) log.warn('[pre-signup] mehrere bestätigte native Konten, es wird nicht verknüpft')
    } catch (err) {
      if (mode === 'reject' && /unbestätigte Registrierung/.test(err.message)) throw err
      // Fehler bei der Suche: nie verknüpfen, aber den Login nicht blockieren
      log.error('[pre-signup] Suche/Bereinigung fehlgeschlagen, es wird nicht verknüpft:', err.message)
      linkTarget = null
    }

    if (linkTarget) {
      try {
        const providerName = 'Google'   // exakt wie am Pool registriert (Groß-/Kleinschreibung)
        await cognito.send(new AdminLinkProviderForUserCommand({
          UserPoolId: userPoolId,
          DestinationUser: { ProviderName: 'Cognito', ProviderAttributeValue: linkTarget.Username },
          SourceUser: { ProviderName: providerName, ProviderAttributeName: 'Cognito_Subject', ProviderAttributeValue: event.userName.slice(providerName.length + 1) },
        }))
        log.log('[pre-signup] verknüpft mit bestehendem Konto', linkTarget.Username)
        // Bei Verknüpfung mit bestehendem Ziel übernimmt Cognito die Profildaten nicht automatisch: Bild explizit übertragen
        const picture = attrs.picture
        if (picture) await cognito.send(new AdminUpdateUserAttributesCommand({ UserPoolId: userPoolId, Username: linkTarget.Username, UserAttributes: [{ Name: 'picture', Value: picture }] }))
      } catch (err) { log.error('[pre-signup] Verknüpfen fehlgeschlagen (Login läuft als separates Konto weiter):', err.message) }
    }

    event.response.autoConfirmUser = true
    event.response.autoVerifyEmail = true
    return event
  }
}

export const handler = createHandler(new CognitoIdentityProviderClient({ region: 'eu-central-1' }))
