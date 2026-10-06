// Feste Ausschlussregel für jeden Mailversand über Resend. Resend hat keine Sandbox und schützt hier nicht:
// Demo-, Beispiel- und gesperrte Mandanten dürfen NIE Mails auslösen – weder durch Zeitpläne (Cron) noch durch öffentliche Formulare
// noch durch mandantenübergreifende Läufe.
export const DEMO_OWNER_IDS: readonly string[] = ['demo@plexora.eu', 'demo-plexora', 'demo-user']
export const DEMO_TENANT_IDS: readonly string[] = ['PLXR-DEMO-0000-0000-DEMO']

export type MailBlock = 'demo' | 'tenant_inactive' | 'mail_blocked' | null

export const isDemoOwner = (ownerId?: string | null) => !!ownerId && DEMO_OWNER_IDS.includes(ownerId.trim().toLowerCase())
export const isDemoTenant = (tenantId?: string | null) => !!tenantId && DEMO_TENANT_IDS.includes(tenantId.trim())

/**
 * Warum darf für diesen Besitzer / Mandanten nicht gemailt werden? null = darf.
 * ownerId: Besitzer-E-Mail oder Mandantenkennung (userId der Datenzeilen). tenant: optional die Zeile aus plexora-nexora.
 */
export function mailBlockReason(ownerId?: string | null, tenant?: { tenantId?: string; email?: string; status?: string; mailBlocked?: boolean } | null): MailBlock {
  if (isDemoOwner(ownerId) || isDemoTenant(ownerId)) return 'demo'
  if (tenant) {
    if (isDemoTenant(tenant.tenantId) || isDemoOwner(tenant.email)) return 'demo'
    if (tenant.mailBlocked === true) return 'mail_blocked'
    if (tenant.status && tenant.status !== 'active') return 'tenant_inactive'
  }
  return null
}

export const MAIL_BLOCK_TEXT: Record<Exclude<MailBlock, null>, string> = {
  demo: 'Versand für Demo-/Beispiel-Mandanten ist deaktiviert',
  tenant_inactive: 'Versand für gesperrte Mandanten ist deaktiviert',
  mail_blocked: 'Versand für diesen Mandanten ist gesperrt',
}
