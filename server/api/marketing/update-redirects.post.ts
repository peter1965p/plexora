export default defineEventHandler(async () => {
  // Vanity-Slugs werden über DynamoDB aufgelöst (public/[slug].get.ts sucht nach slug-Feld).
  // _redirects-Einträge sind nur noch für manuell gepflegte Kurz-URLs nötig.
  return { success: true }
})
