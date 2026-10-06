// Felder des Kampagnen-Formulars, die als Entwurf gespeichert werden dürfen.
// Wird vom Frontend (Autosave) genutzt; der Server hat dieselbe Liste in server/utils/drafts/schema.ts,
// ein Test (tests/drafts/fields.test.ts) stellt sicher, dass beide übereinstimmen.
export const MARKETING_CAMPAIGN_DRAFT_FIELDS = [
  'name', 'slug', 'formId', 'headline', 'subtext', 'headerImageUrl', 'bgImageUrl',
  'accentColor', 'bgColor', 'contentTitle', 'contentItems',
  'utmSource', 'utmMedium', 'utmCampaign',
  'appointmentEnabled', 'appointmentName', 'appointmentDurationMinutes', 'endsAt',
] as const
