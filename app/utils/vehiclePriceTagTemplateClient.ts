// Client-seitige Kopie der Platzhalter-Logik aus server/utils/vehiclePriceTagTemplate.ts,
// damit die Live-Vorschau im Editor ohne Server-Roundtrip läuft (kein Puppeteer im Client-Bundle).
// Platzhalter-Namen/Struktur MÜSSEN mit der Server-Version synchron bleiben.
import Handlebars from 'handlebars'

const eur = (n: any) => `€ ${(Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const km  = (n: any) => (Number(n) ? `${Number(n).toLocaleString('de-DE')} km` : '–')

export function getSampleVehicleClient() {
  return {
    vehicleId: 'sample-0000', make: 'BMW', model: '3er', variant: '320d Touring', year: 2022,
    mileage: 34500, fuel: 'Diesel', transmission: 'Automatik', power: 190, price: 32900,
    status: 'verfügbar', licensePlate: '', tuevDate: '', color: 'Alpinweiß', images: [] as string[],
    condition: 'Gebraucht, unfallfrei', vehicleType: 'Kombi', doors: '4/5', emissionSticker: 'Grün',
    emissionClass: 'Euro 6', interiorMaterial: 'Leder', equipment: ['Navigationssystem', 'Sitzheizung', 'Klimaautomatik'] as string[],
    description: 'Scheckheftgepflegtes Einzelfahrzeug aus erster Hand, Vollausstattung inkl. Navigationssystem und Sitzheizung.',
  }
}

export function buildVehicleTemplateDataClient(vehicle: any, branding: any = {}, company: any = {}) {
  return {
    fahrzeug: {
      marke: vehicle.make || '', modell: vehicle.model || '', variante: vehicle.variant || '',
      baujahr: String(vehicle.year || ''), km: km(vehicle.mileage), kraftstoff: vehicle.fuel || '',
      getriebe: vehicle.transmission || '', leistung: vehicle.power ? `${vehicle.power} PS` : '',
      preis: eur(vehicle.price), farbe: vehicle.color || '', kennzeichen: vehicle.licensePlate || '',
      status: vehicle.status || '', beschreibung: vehicle.description || '', foto: vehicle.images?.[0] || vehicle.imageUrl || '',
      zustand: vehicle.condition || '', typ: vehicle.vehicleType || '', tueren: vehicle.doors || '',
      umweltplakette: vehicle.emissionSticker || '', schadstoffklasse: vehicle.emissionClass || '',
      innenausstattung: vehicle.interiorMaterial || '',
      ausstattung: Array.isArray(vehicle.equipment) ? vehicle.equipment.join(', ') : '',
    },
    haendler: {
      name:    branding?.brandName || company?.legalName || 'Plexora',
      logo:    branding?.logoUrl || '',
      telefon: company?.phone || '',
      email:   company?.email || '',
      adresse: [company?.street, company?.zipCity].filter(Boolean).join(', '),
      farbe:   branding?.primaryColor || '#EA580C',
    },
  }
}

export function resolvePlaceholderChipsClient(html: string): string {
  let out = html.replace(
    /<span[^>]*\bdata-pricetag-field-text\b[^>]*>[\s\S]*?<\/span>/g,
    (match) => {
      const field = match.match(/data-field="([^"]*)"/)?.[1]
      return field ? `{{${field}}}` : ''
    },
  )
  out = out.replace(
    /<div[^>]*\bdata-pricetag-field-image\b[^>]*>[\s\S]*?<\/div>/g,
    (match) => {
      const field = match.match(/data-field="([^"]*)"/)?.[1]
      if (!field) return ''
      return `{{#if ${field}}}<img src="{{${field}}}" style="width:100%;height:auto;border-radius:8px;object-fit:cover;display:block;margin-bottom:6mm;" />{{/if}}`
    },
  )
  return out
}

export function renderVehiclePriceTagHtmlClient(frameHtml: string, contentHtml: string, data: any): string {
  try {
    const resolvedContent = resolvePlaceholderChipsClient(contentHtml || '')
    const combined = frameHtml.replace('__PRICETAG_CONTENT__', resolvedContent)
    return Handlebars.compile(combined, { noEscape: false })(data)
  } catch (e: any) {
    return `<pre style="color:#dc2626;padding:20px;font-family:monospace;white-space:pre-wrap">Vorlagen-Fehler:\n${e?.message || e}</pre>`
  }
}
