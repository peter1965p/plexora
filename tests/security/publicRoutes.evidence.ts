// Nachweis je öffentlicher Route (Allowlist in server/utils/routePolicy.ts), dass sie keine Mandantendaten herausgibt.
//
// Jede Probe ruft die Route wirklich als anonymer Besucher auf. Die Datenbank liefert einen Mandanten "T-A", dessen PRIVATE Felder mit Markierungswerten
// ("GEHEIM-…") gefüllt sind: Besitzer-E-Mail, Benachrichtigungsadresse, Schlüssel, interne Notizen, Zugangsdaten. Die Route besteht, wenn
//   1. in der Antwort (und in Fehlermeldungen) kein Markierungswert vorkommt,
//   2. die obersten Schlüssel der Antwort in "keys" stehen (das ist genau das, was die Route bewusst veröffentlicht),
//   3. sie nur in die Tabellen schreibt, die unter "writes" stehen, und nichts versendet oder abruft (Mail, Netz, Stripe, AWS).
// Eine neue öffentliche Route ohne Eintrag hier lässt den Test scheitern (publicRoutes.test.ts).

export const SECRETS = {
  ownerEmail: 'GEHEIM-owner@firma-a.de', userId: 'GEHEIM-userid@firma-a.de', notify: 'GEHEIM-notify@firma-a.de', pat: 'GEHEIM-github-token', google: 'GEHEIM-google-refresh',
  licenseKey: 'GEHEIM-PLXR-KEY', stripe: 'GEHEIM-cus_123', note: 'GEHEIM-interne-notiz', scope: 'GEHEIM-scope@firma-a.de', apiKey: 'GEHEIM-api-key', iban: 'GEHEIM-DE00IBAN',
  portal: 'GEHEIM-portal-token', cost: 'GEHEIM-einkaufspreis', draft: 'GEHEIM-entwurf',
}
export const isSecret = (s: string) => s.includes('GEHEIM-')

// ── Tabellenzeilen: öffentliche Felder mit harmlosen Werten, private Felder mit Markierungen ──
const PRIVATE_COMMON = { userId: SECRETS.userId, email: SECRETS.ownerEmail, notifyEmail: SECRETS.notify, internalNote: SECRETS.note, licenseKey: SECRETS.licenseKey, stripeCustomerId: SECRETS.stripe, apiKey: SECRETS.apiKey, githubPatEncrypted: SECRETS.pat, googleRefreshTokenEncrypted: SECRETS.google, googleRefreshToken: SECRETS.google, iban: SECRETS.iban }

export const NEXORA = {
  tenantId: 'T-A', status: 'active', companyName: 'Firma A', subdomain: 'firma-a', customDomain: 'www.firma-a.de', config: { accent: '#ff0000' }, logoUrl: 'https://img.example/logo.png', faviconUrl: '', heroImageUrl: '',
  blogEnabled: true, shopEnabled: true, newsletterEnabled: true, plexiEnabled: true, vehiclesEnabled: true, menuEnabled: true, orderingEnabled: true, propertiesEnabled: true, termineEnabled: true,
  navOrder: ['start'], metaKeywords: 'a', gaMeasurementId: 'G-1', pageTitles: {}, hero: { headline: 'Hallo' }, about: { text: 'Über uns', stats: [] }, footer: { tagline: 'Fuß' },
  contactInfo: { email: 'kontakt@firma-a.de', phone: '0123', address: 'Str. 1', region: 'DE', availability: 'Mo–Fr', legalName: 'Firma A GmbH', vatId: 'DE123' },
  services: [{ title: 'Beratung' }], pricingEnabled: true, pricingPackages: [], stackEnabled: true, stackItems: [], stackLegend: {}, clientsEnabled: true, clientsItems: [], sectionOrder: ['stack'],
  pages: [], theme: 'midnight', robotsTxt: 'User-Agent: *\nDisallow:\n', githubEnabled: false, termineTitle: 'Termine', termineDescription: '', termineAvatarUrl: '', termineTimezone: 'Europe/Berlin',
  ...PRIVATE_COMMON,
}
const BLOG = { tenantId: 'T-A', postId: 'p1', title: 'Titel', slug: 's', excerpt: 'Auszug', content: 'Text', contentType: 'markdown', status: 'published', coverImageUrl: '', category: 'c', tags: [], publishedAt: '2026-01-01', createdAt: '2026-01-01', updatedAt: '2026-01-02', authorEmail: SECRETS.ownerEmail, internalNote: SECRETS.note, userId: SECRETS.userId }
const MENU = { tenantId: 'T-A', itemId: 'm1', category: 'Pizza', name: 'Margherita', description: 'lecker', price: '8', available: true, costPrice: SECRETS.cost, internalNote: SECRETS.note }
const PROPERTY = { tenantId: 'T-A', propertyId: 'i1', status: 'frei', type: 'Wohnung', street: 'Str 1', zipCity: '10115 Berlin', size: '50', rooms: '2', priceType: 'miete', kaltmiete: 500, nebenkosten: 100, imageUrl: '', description: 'schön', ownerEmail: SECRETS.ownerEmail, internalNote: SECRETS.note }
const VEHICLE = { tenantId: 'T-A', vehicleId: 'v1', status: 'verfügbar', make: 'VW', model: 'Golf', price: '9000', equipment: [], images: [], purchasePrice: SECRETS.cost, internalNote: SECRETS.note, ownerEmail: SECRETS.ownerEmail }
const PRODUCT = { userId: SECRETS.userId, productId: 'pr1', status: 'active', name: 'Produkt', description: 'd', price: 10, stock: 3, image: '', category: 'k', purchasePrice: SECRETS.cost, supplierId: SECRETS.note }
const TERMINE_TYPE = { tenantId: 'T-A', typeId: 't1', active: true, name: 'Beratung', durationMinutes: 30, campaignId: '', calendarId: SECRETS.google, internalNote: SECRETS.note }
const CAMPAIGN_HR = { campaignId: 'x', userId: SECRETS.userId, title: 'Entwickler (m/w/d)', description: 'Wir suchen …', location: 'Berlin', status: 'active', applicationEmail: SECRETS.notify, internalNote: SECRETS.note, salaryInternal: SECRETS.cost }
const BRANDING = { settingId: 'branding', scope: SECRETS.scope, brandName: 'Marke A', brandTagline: 'Tag', primaryColor: '#123456', logoUrl: '', portalTitle: 'Portal', senderEmail: SECRETS.notify }
const INVOICE = { invoiceId: 'x', userId: SECRETS.userId, number: 'RE-1', customer: 'Kunde GmbH', customerEmail: 'kunde@x.de', amount: 100, status: 'pending', dueDate: '2026-12-01', items: [{ description: 'Leistung', amount: 100 }], internalNote: SECRETS.note, dunningHistory: [SECRETS.note] }
const TICKET = { ticketId: 'tk1', userId: SECRETS.userId, title: 'Problem', status: 'open', priority: 'normal', created: '2026-01-01', comments: [{ id: 'c1', author: 'Kunde', text: 'Hallo', isCustomer: true }], portalToken: SECRETS.portal, customerEmail: 'kunde@x.de', internalNote: SECRETS.note }
const LICENSE = { licenseKey: 'PLXR-AAAA-BBBB-CCCC', status: 'active', tier: 'pro', modules: ['crm'], validFrom: '2026-01-01', validUntil: '2099-01-01', customerEmail: 'kunde@lizenz.example', stripeCustomerId: SECRETS.stripe, note: SECRETS.note, stripeSubscriptionId: SECRETS.stripe }
const PAGE = (over: any = {}) => ({ pageId: 'pg1', slug: 'impressum', title: 'Impressum', status: 'published', inNav: true, navLabel: 'Impressum', blocks: [], userId: SECRETS.userId, ...over })
const SETTINGS: Record<string, any> = {
  branding: BRANDING, agb: { settingId: 'agb', scope: 'global', content: 'AGB', updated: 'x' }, datenschutz: { settingId: 'datenschutz', scope: 'global', content: 'DS', updated: 'x' },
  testimonials: { settingId: 'testimonials', scope: 'global', items: [{ name: 'Anna', quote: 'Super', enabled: true }, { name: 'Intern', quote: SECRETS.note, enabled: false }] },
  theme: { settingId: 'theme', scope: SECRETS.scope, theme: 'dark', accent: '#6C3FE8', accentRgb: '1,2,3' },
  company: { settingId: 'company', scope: 'global', legalName: 'Plexora', email: 'info@plexora.eu', phone: '1', iban: SECRETS.iban, bic: SECRETS.iban, bankName: SECRETS.iban, paymentNote: SECRETS.note, vatId: 'DE1', street: 'S 1', zipCity: '1 B', representedBy: 'P', register: 'HRB', registerCourt: 'AG', country: 'DE' },
  payment: { settingId: 'payment', scope: 'global', activeGateway: 'stripe', stripeSecretKey: SECRETS.apiKey, stripeWebhookSecret: SECRETS.apiKey },
  'invoice-payment': { settingId: 'invoice-payment', scope: SECRETS.userId, sepaEnabled: true, stripeEnabled: true, iban: SECRETS.iban },
  shortener: { settingId: 'shortener', scope: SECRETS.userId, enabled: true },
}

type Rows = any[] | any | ((input: any, cmd: string) => any)
export type Evidence =
  | { kind: 'read'; params?: Record<string, string>; query?: Record<string, any>; db: Record<string, Rows>; keys: string[]; status?: number[]; writes?: string[]; allow?: string[]; text?: boolean; note?: string }
  | { kind: 'write'; params?: Record<string, string>; query?: Record<string, any>; body?: any; headers?: Record<string, string>; db: Record<string, Rows>; keys: string[]; status: number[]; writes: string[]; allow?: string[]; note?: string }
  | { kind: 'gated'; params?: Record<string, string>; query?: Record<string, any>; body?: any; headers?: Record<string, string>; rawBody?: string; status: number[]; note: string; gap?: string }

const T = { tenantId: 'T-A' }
const settings = (input: any) => SETTINGS[input?.Key?.settingId]
const NX = { 'plexora-nexora': [NEXORA] }

export const EVIDENCE: Record<string, Evidence> = {
  // ── Website eines Mandanten: nur freigegebene Felder ──
  'GET /api/public/[tenantId]/blog': { kind: 'read', params: T, db: { 'plexora-blog': [BLOG] }, keys: ['posts'] },
  'GET /api/public/[tenantId]/blog/[slug]': { kind: 'read', params: { ...T, slug: 's' }, db: { 'plexora-blog': [BLOG] }, keys: ['post'] },
  'GET /api/public/[tenantId]/branding': { kind: 'read', params: T, db: NX, keys: ['tenantId', 'companyName', 'subdomain', 'config', 'logoUrl', 'faviconUrl', 'heroBackground', 'heroTitleSize', 'heroGradient', 'servicesLayout', 'heroMediaType', 'heroImageUrl', 'blogEnabled', 'blogTitle', 'shopEnabled', 'shopTitle', 'newsletterEnabled', 'newsletterTitle', 'plexiEnabled', 'plexiWelcome', 'vehiclesEnabled', 'vehiclesTitle', 'menuEnabled', 'menuTitle', 'orderingEnabled', 'propertiesEnabled', 'propertiesTitle', 'termineEnabled', 'termineTitle', 'navOrder', 'metaKeywords', 'gaMeasurementId', 'pageTitles'] },
  'GET /api/public/[tenantId]/clients': { kind: 'read', params: T, db: NX, keys: ['enabled', 'title', 'items', 'logoStyle', 'showText'] },
  'GET /api/public/[tenantId]/contact': { kind: 'read', params: T, db: { ...NX, 'plexora-settings': settings }, keys: ['botProtection', 'email', 'phone', 'address', 'region', 'availability', 'legalName', 'vatId'], note: 'Kontaktdaten der Firma sind die bewusst veröffentlichte Anbieterkennzeichnung (contactInfo), nicht die Login-Adresse des Besitzers' },
  'GET /api/public/[tenantId]/content': { kind: 'read', params: T, db: NX, keys: ['hero', 'about', 'contact', 'footer'] },
  'GET /api/public/[tenantId]/github': { kind: 'read', params: T, db: NX, keys: ['enabled', 'repos', 'title'] },
  'GET /api/public/[tenantId]/layout': { kind: 'read', params: T, db: NX, keys: ['sectionOrder'] },
  'GET /api/public/[tenantId]/menu': { kind: 'read', params: T, db: { 'plexora-menu': [MENU] }, keys: ['items'] },
  'GET /api/public/[tenantId]/pages': { kind: 'read', params: T, db: NX, keys: ['pages', 'theme'] },
  'GET /api/public/[tenantId]/properties': { kind: 'read', params: T, db: { 'plexora-properties': [PROPERTY] }, keys: ['properties'] },
  'GET /api/public/[tenantId]/robots': { kind: 'read', params: T, db: NX, keys: [], text: true },
  'GET /api/public/[tenantId]/services': { kind: 'read', params: T, db: NX, keys: ['services', 'pricingEnabled', 'pricingTitle', 'pricingSubtitle', 'pricingPackages'] },
  'GET /api/public/[tenantId]/shop': { kind: 'read', params: T, db: { ...NX, 'plexora-products': [PRODUCT] }, keys: ['products'] },
  'GET /api/public/[tenantId]/stack': { kind: 'read', params: T, db: NX, keys: ['enabled', 'items', 'title', 'legend'] },
  'GET /api/public/[tenantId]/termine': { kind: 'read', params: T, db: { ...NX, 'plexora-termine-types': [TERMINE_TYPE], 'plexora-settings': settings }, keys: ['botProtection', 'title', 'description', 'avatarUrl', 'timezone', 'types'] },
  'GET /api/public/[tenantId]/termine/availability': { kind: 'read', params: T, query: { date: '2026-12-01', typeId: 't1' }, db: { ...NX, 'plexora-termine-types': [TERMINE_TYPE], 'plexora-termine-bookings': [] }, keys: ['slots'], status: [200, 404] },
  'GET /api/public/[tenantId]/vehicles': { kind: 'read', params: T, db: { 'plexora-vehicles': [VEHICLE] }, keys: ['vehicles'], writes: ['plexora-site-analytics'], note: 'zählt den Seitenaufruf' },
  'GET /api/public/resolve': { kind: 'read', query: { host: 'www.firma-a.de' }, db: NX, keys: ['tenantId'] },
  'GET /api/public/testimonials': { kind: 'read', db: { 'plexora-settings': settings }, keys: ['items'] },
  'GET /api/public/s/[code]': { kind: 'read', params: { code: 'abc' }, db: { 'plexora-shortlinks': [{ shortCode: 'abc', userId: SECRETS.userId, targetUrl: 'https://ziel.example', clicks: 1 }], 'plexora-settings': settings }, keys: ['targetUrl'], writes: ['plexora-shortlinks'], note: 'zählt Klicks (bewusst)' },

  // ── Plexora-Startseite und Rechtstexte ──
  'GET /api/pages': { kind: 'read', db: { 'plexora-pages': [PAGE(), PAGE({ pageId: 'pg2', slug: 'entwurf', status: 'draft', title: SECRETS.draft, userId: SECRETS.userId })] }, keys: ['pages'] },
  'GET /api/pages/[slug]': { kind: 'read', params: { slug: 'impressum' }, db: { 'plexora-pages': [PAGE()] }, keys: ['page'] },
  'GET /api/settings/agb': { kind: 'read', db: { 'plexora-settings': settings }, keys: ['agb'] },
  'GET /api/settings/datenschutz': { kind: 'read', db: { 'plexora-settings': settings }, keys: ['datenschutz'] },
  'GET /api/settings/branding': { kind: 'read', db: { 'plexora-settings': (i: any) => ({ ...BRANDING, scope: 'global' }) }, keys: ['branding'], note: 'anonym: nur der globale Satz' },
  'GET /api/settings/company': { kind: 'read', db: { 'plexora-settings': settings }, keys: ['company'], note: 'anonym: nur Pflichtangaben (PUBLIC_COMPANY_FIELDS), keine Bankdaten' },
  'GET /api/settings/theme': { kind: 'read', db: { 'plexora-settings': settings }, keys: ['theme'], note: 'anonym: nur feste Standardwerte' },

  // ── Links mit Geheimnis im Pfad ──
  'GET /api/marketing/public/[slug]': { kind: 'read', params: { slug: 'beratung' }, db: { 'plexora-marketing': [{ userId: SECRETS.userId, campaignId: 'c1', slug: 'beratung', formId: 'f1', name: 'K', headline: 'H', notifyEmail: SECRETS.notify, internalNote: SECRETS.note }], 'plexora-forms': [{ formId: 'f1', userId: SECRETS.userId, notifyEmail: SECRETS.notify, title: 'F', fields: [] }], 'plexora-settings': settings }, keys: ['campaign', 'form', 'branding', 'botProtection'] },
  'GET /api/jobs/[id]': { kind: 'read', params: { id: 'x' }, db: { 'plexora-campaigns': [CAMPAIGN_HR], 'plexora-settings': settings }, keys: ['campaign', 'branding'] },
  'GET /api/licenses/[key]': { kind: 'read', params: { key: 'PLXR-AAAA-BBBB-CCCC' }, db: { 'plexora-licenses': [LICENSE] }, keys: ['license'] },
  'GET /api/pay/[invoiceId]': { kind: 'read', params: { invoiceId: 'x' }, db: { 'plexora-finance': [INVOICE], 'plexora-settings': settings }, keys: ['invoice', 'gateway', 'sepaEnabled', 'stripeEnabled', 'branding'] },
  'GET /api/support/portal/[token]': { kind: 'read', params: { token: SECRETS.portal }, db: { 'plexora-support': [TICKET] }, keys: ['ticketId', 'title', 'status', 'priority', 'created', 'comments'] },
  'GET /api/public/newsletter/confirm/[token]': { kind: 'read', params: { token: 't' }, db: { 'plexora-newsletter-subscribers': [{ tenantId: 'T-A', email: 'abo@x.de', status: 'pending' }], 'plexora-newsletter-automation-rules': [] }, keys: [], text: true, writes: ['plexora-newsletter-subscribers', 'plexora-newsletter-ratelimit'], note: 'bestätigt genau diese Anmeldung; Seite nennt keine Daten' },
  'GET /api/public/newsletter/unsubscribe/[token]': { kind: 'read', params: { token: 't' }, db: { 'plexora-newsletter-subscribers': [{ tenantId: 'T-A', email: 'abo@x.de', status: 'confirmed' }] }, keys: [], text: true, writes: ['plexora-newsletter-subscribers', 'plexora-newsletter-ratelimit'] },
  'GET /api/public/newsletter/track/click/[token]': { kind: 'read', params: { token: 't' }, query: { url: 'https://ziel.example' }, db: { 'plexora-newsletter-sends': [{ campaignId: 'c', subscriberId: 's', tenantId: 'T-A' }] }, keys: [], text: true, writes: ['plexora-newsletter-sends', 'plexora-newsletter-campaigns'] },
  'GET /api/public/newsletter/track/open/[token]': { kind: 'read', params: { token: 't' }, db: { 'plexora-newsletter-sends': [{ campaignId: 'c', subscriberId: 's', tenantId: 'T-A' }] }, keys: [], text: true, writes: ['plexora-newsletter-sends', 'plexora-newsletter-campaigns'] },

  // ── Eingaben von Besuchern: Antwort bleibt winzig ──
  'POST /api/public/[tenantId]/contact': { kind: 'write', params: T, body: { name: 'Max Muster', email: 'max@x.de', message: 'Hallo' }, db: NX, keys: ['success', 'message'], status: [200], writes: ['plexora-contacts', 'plexora-newsletter-ratelimit'] },
  'POST /api/public/[tenantId]/newsletter/signup': { kind: 'write', params: T, body: { email: 'abo@x.de' }, db: NX, keys: ['success'], status: [200], writes: ['plexora-newsletter-subscribers', 'plexora-newsletter-ratelimit'], allow: ['mail:'], note: 'Bestätigungsmail (Double-Opt-In) an die angegebene Adresse; Antwort ist immer gleich, verrät nichts über bestehende Abonnenten' },
  'POST /api/public/[tenantId]/orders': { kind: 'write', params: T, body: { items: [{ itemId: 'm1', qty: 1 }], customerName: 'Max', phone: '123' }, db: { 'plexora-menu': [MENU] }, keys: ['orderId', 'total'], status: [200, 400], writes: ['plexora-gastro-orders', 'plexora-newsletter-ratelimit'] },
  'POST /api/public/[tenantId]/plexi-chat': { kind: 'write', params: T, body: { messages: [{ role: 'user', content: 'Hallo' }] }, db: NX, keys: ['reply'], status: [200, 400, 403, 404, 429, 500, 503], writes: ['plexora-newsletter-ratelimit'] },
  'POST /api/public/[tenantId]/shop/checkout': { kind: 'write', params: T, body: { items: [{ productId: 'pr1', qty: 1 }], email: 'k@x.de' }, db: { ...NX, 'plexora-products': [PRODUCT], 'plexora-settings': settings }, keys: ['sessionId', 'url'], status: [200, 400, 500], writes: ['plexora-orders', 'plexora-newsletter-ratelimit'], allow: ['stripe:'], note: 'legt Bestellung und Stripe-Sitzung an' },
  'POST /api/public/[tenantId]/termine/book': { kind: 'write', params: T, body: { typeId: 't1', date: '2026-12-01', time: '10:00', name: 'Max', email: 'm@x.de' }, db: { ...NX, 'plexora-termine-types': [TERMINE_TYPE], 'plexora-termine-bookings': [] }, keys: ['success', 'bookingId', 'booking', 'message'], status: [200, 400, 404, 409], writes: ['plexora-termine-bookings', 'plexora-newsletter-ratelimit', 'plexora-contacts'] },
  'POST /api/public/[tenantId]/track': { kind: 'write', params: T, body: { path: '/' }, db: NX, keys: ['success'], status: [200], writes: ['plexora-site-analytics', 'plexora-newsletter-ratelimit'], allow: ['netz:http://ip-api.com'], note: 'Seitenaufruf zählen; fragt dafür den Standort der Besucher-IP bei ip-api.com ab (unverschlüsselt, Drittanbieter außerhalb der EU) – Datenschutz-Punkt für Phase C' },
  'POST /api/analytics/vitals': { kind: 'write', body: { name: 'LCP', value: 1000, rating: 'good' }, db: {}, keys: ['ok'], status: [200], writes: ['plexora-meta'], note: 'anonyme Messwerte (Web Vitals), bewusst' },
  'POST /api/forms/[id]/submit': { kind: 'write', params: { id: 'f1' }, body: { name: 'Max', email: 'max@x.de' }, db: { 'plexora-forms': [{ formId: 'f1', userId: SECRETS.userId, notifyEmail: SECRETS.notify, title: 'F', fields: [] }], 'plexora-settings': settings }, keys: ['success', 'message', 'redirectUrl'], status: [200, 400, 403, 404, 429], writes: ['plexora-contacts', 'plexora-newsletter-ratelimit', 'plexora-applications', 'plexora-submissions'] },
  'POST /api/jobs/[id]/apply': { kind: 'write', params: { id: 'x' }, body: { name: 'Max', email: 'max@x.de' }, db: { 'plexora-campaigns': [CAMPAIGN_HR] }, keys: ['success', 'message', 'applicationId'], status: [200, 400, 404, 429], writes: ['plexora-applications', 'plexora-newsletter-ratelimit'], allow: ['mail:'], note: 'Eingangsbestätigung an die angegebene Adresse (Spam-Relay-Risiko, Phase C)' },
  'POST /api/licenses/checkout': { kind: 'write', body: { tier: 'pro', email: 'k@x.de' }, db: { 'plexora-settings': settings }, keys: ['url'], status: [200, 400, 500], writes: [], allow: ['stripe:'], note: 'legt eine Stripe-Sitzung an' },
  'POST /api/licenses/validate': { kind: 'write', body: { licenseKey: 'PLXR-AAAA-BBBB-CCCC' }, db: { 'plexora-licenses': [LICENSE] }, keys: ['valid', 'reason', 'licenseKey', 'tier', 'modules', 'customerEmail', 'validFrom', 'validUntil'], status: [200], writes: [], note: 'BEWUSSTE AUSNAHME zur Entscheidung: gibt die E-Mail des Lizenzkunden an den Schlüsselinhaber zurück (das GET-Gegenstück tut das nicht). Empfehlung: entfernen, sobald keine Kundeninstallation sie liest' },
  'POST /api/pay/[invoiceId]/checkout': { kind: 'write', params: { invoiceId: 'x' }, body: {}, db: { 'plexora-finance': [INVOICE], 'plexora-settings': settings }, keys: ['url'], status: [200, 400, 500], writes: ['plexora-finance'], allow: ['stripe:'], note: 'legt eine Stripe-Sitzung für genau diese Rechnung an' },
  'POST /api/support/portal/[token]/comment': { kind: 'write', params: { token: SECRETS.portal }, body: { name: 'Kunde', text: 'Danke' }, db: { 'plexora-support': [TICKET] }, keys: ['success'], status: [200, 400], writes: ['plexora-support', 'plexora-newsletter-ratelimit'] },

  // ── Nur mit Geheimnis oder Signatur: ohne beides kommt nichts heraus und nichts passiert ──
  'POST /api/newsletter/cron/run-automations': { kind: 'gated', status: [401], note: 'EventBridge-Secret im Header' },
  'POST /api/sequences/cron/sweep': { kind: 'gated', status: [401], note: 'EventBridge-Secret im Header' },
  'POST /api/termine/cron/reminders': { kind: 'gated', status: [401], note: 'EventBridge-Secret im Header' },
  'POST /api/internal/backup/run': { kind: 'gated', status: [401], body: { jobId: 'j', owner: 'GEHEIM-owner@firma-a.de', kind: 'full' }, note: 'internes Secret, nur für die Worker-Lambda' },
  'POST /api/webhooks/stripe': { kind: 'gated', status: [400, 401], rawBody: '{"type":"checkout.session.completed"}', headers: { 'stripe-signature': 'ungueltig' }, note: 'Stripe-Signatur' },
  'POST /api/webhooks/resend': { kind: 'gated', status: [400, 401], rawBody: '{"type":"email.bounced"}', headers: { 'svix-id': 'x', 'svix-timestamp': '1', 'svix-signature': 'v1,ungueltig' }, body: { type: 'email.bounced', data: { tags: { source: 'newsletter', campaignId: 'c', subscriberId: 's' } } }, note: 'Resend-Signatur', gap: 'OFFENE LÜCKE (Block c): die Route prüft KEINE Signatur, obwohl die Allowlist es behauptet. Wer Kampagnen- und Abonnenten-ID kennt, kann Bounce/Complaint-Ereignisse einspielen. Beheben: Svix-Signatur prüfen (Secret aus dem Resend-Dashboard nötig)' },
  'POST /api/shop/webhook': { kind: 'gated', status: [400, 401], rawBody: '{"type":"checkout.session.completed"}', headers: { 'stripe-signature': 'ungueltig' }, note: 'Stripe-Signatur' },
  'GET /api/termine/google-auth': { kind: 'gated', status: [401], query: { token: 'irgendein-anmeldetoken', ticket: 'kein-gueltiger-einmalwert' }, note: 'verlangt Einmalwert aus der angemeldeten POST-Anfrage' },
  'GET /api/termine/google-callback': { kind: 'gated', status: [200, 302], query: { code: 'abc', state: 'gefaelscht' }, note: 'state muss zum Browser gehören; sonst Rückleitung mit Fehler' },
}

export { SETTINGS, NEXORA as NEXORA_ROW }
