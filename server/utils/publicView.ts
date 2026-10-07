// Positivlisten für Antworten ohne Anmeldung: nur ausdrücklich genannte Felder verlassen den Server.
// Neue interne Felder in der Datenbank werden dadurch nie versehentlich öffentlich.

export function pick<T extends Record<string, any>>(obj: T | null | undefined, keys: readonly string[]): Record<string, any> {
  const out: Record<string, any> = {}
  if (!obj) return out
  for (const k of keys) if (Object.hasOwn(obj, k) && obj[k] !== undefined) out[k] = obj[k]
  return out
}

/** Landingpage (marketing/public/[slug]): was die Lead-Seite zum Darstellen braucht */
export const PUBLIC_CAMPAIGN_FIELDS = [
  // neu, bewusst einzeln freigegeben (werden in der Route noch einmal bereinigt): Vertrauenspunkte, Datenschutzzeile, Overlays
  'trustItems', 'privacyLine', 'overlays',
  'campaignId', 'name', 'slug', 'formId', 'headline', 'subtext', 'headerImageUrl', 'logoUrl', 'imageStyles',
  'bgImageUrl', 'bgColor', 'accentColor', 'contentTitle', 'contentItems', 'customTemplateHtml', 'templatePresetKey',
  'utmSource', 'utmMedium', 'utmCampaign',
] as const
export const PUBLIC_FORM_FIELDS = ['formId', 'title', 'description', 'fields', 'submitLabel', 'successMsg'] as const
export const PUBLIC_BRANDING_FIELDS = ['brandName', 'brandTagline', 'primaryColor', 'logoUrl'] as const

/** Impressum/Datenschutz: nur Anbieterkennzeichnung, keine Bankdaten */
export const PUBLIC_COMPANY_FIELDS = [
  'legalName', 'representedBy', 'street', 'zipCity', 'country', 'email', 'phone', 'vatId', 'register', 'registerCourt',
] as const

/** Lizenzabfrage per Schlüssel: Status, Stufe und Module, keine Kundendaten */
export const PUBLIC_LICENSE_FIELDS = ['status', 'tier', 'modules', 'validFrom', 'validUntil'] as const

/** Stellenanzeige (jobs/[id]): was die öffentliche Seite zum Darstellen braucht, keine Besitzerdaten, keine internen Felder */
export const PUBLIC_JOB_FIELDS = ['campaignId', 'title', 'companyName', 'logoUrl', 'headerImageUrl', 'type', 'department', 'location', 'description', 'requirements'] as const
/** Zahlungsseite (pay/[invoiceId]): was der Zahlende sieht */
export const PUBLIC_INVOICE_FIELDS = ['invoiceId', 'number', 'status', 'dueDate', 'client', 'amount', 'currency'] as const
/** Blog-Beitrag auf der Kundenwebsite */
export const PUBLIC_BLOG_FIELDS = ['postId', 'title', 'slug', 'excerpt', 'content', 'contentType', 'coverImageUrl', 'category', 'tags', 'publishedAt', 'updatedAt'] as const
/** Markeneinstellungen (settings/branding): alle Felder, die die Oberfläche kennt – ohne scope (Besitzer), settingId, updated */
export const BRANDING_ROW_FIELDS = ['brandName', 'brandTagline', 'primaryColor', 'portalTitle', 'logoUrl'] as const
