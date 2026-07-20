import Handlebars from 'handlebars'
import { renderInvoicePdf } from './invoiceTemplate'
import { getPresetFrame } from './pricetagPresets'

export interface PriceTagTemplateData {
  fahrzeug: {
    marke: string; modell: string; variante: string; baujahr: string; km: string
    kraftstoff: string; getriebe: string; leistung: string; preis: string
    farbe: string; kennzeichen: string; status: string; beschreibung: string; foto: string
    zustand: string; typ: string; tueren: string; umweltplakette: string
    schadstoffklasse: string; innenausstattung: string; ausstattung: string
  }
  haendler: { name: string; logo: string; telefon: string; email: string; adresse: string; farbe: string }
}

const eur = (n: any) => `€ ${(Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const km  = (n: any) => (Number(n) ? `${Number(n).toLocaleString('de-DE')} km` : '–')

export function buildVehicleTemplateData(vehicle: any, branding: any = {}, company: any = {}): PriceTagTemplateData {
  return {
    fahrzeug: {
      marke:        vehicle.make || '',
      modell:       vehicle.model || '',
      variante:     vehicle.variant || '',
      baujahr:      String(vehicle.year || ''),
      km:           km(vehicle.mileage),
      kraftstoff:   vehicle.fuel || '',
      getriebe:     vehicle.transmission || '',
      leistung:     vehicle.power ? `${vehicle.power} PS` : '',
      preis:        eur(vehicle.price),
      farbe:        vehicle.color || '',
      kennzeichen:  vehicle.licensePlate || '',
      status:       vehicle.status || '',
      beschreibung: vehicle.description || '',
      foto:         vehicle.images?.[0] || vehicle.imageUrl || '',
      zustand:          vehicle.condition        || '',
      typ:              vehicle.vehicleType      || '',
      tueren:           vehicle.doors            || '',
      umweltplakette:   vehicle.emissionSticker  || '',
      schadstoffklasse: vehicle.emissionClass    || '',
      innenausstattung: vehicle.interiorMaterial || '',
      ausstattung:      Array.isArray(vehicle.equipment) ? vehicle.equipment.join(', ') : '',
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

// Übersetzt die im TipTap-Editor sichtbaren Feld-Chips (freundliches Label, z.B. "Preis")
// in rohe Handlebars-Platzhalter (z.B. {{fahrzeug.preis}}) — VOR dem eigentlichen
// Handlebars.compile(). Regex statt DOM-Parser, weil im Projekt weder jsdom noch cheerio
// installiert sind; robust genug, weil wir das Chip-Markup selbst über renderHTML() in
// den TipTap-Node-Extensions festlegen (data-pricetag-field-text/-image als eindeutiger Marker).
export function resolvePlaceholderChips(html: string): string {
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

export interface PriceTagTemplateRecord {
  presetKey:   string
  contentHtml: string
  pageFormat?: 'A4' | 'A5' | 'A6'
  orientation?: 'portrait' | 'landscape'
}

export function renderVehiclePriceTagHtml(template: PriceTagTemplateRecord, data: PriceTagTemplateData): string {
  const frame = getPresetFrame(template.presetKey)
  const resolvedContent = resolvePlaceholderChips(template.contentHtml || '')
  const combined = frame.replace('__PRICETAG_CONTENT__', resolvedContent)
  return Handlebars.compile(combined, { noEscape: false })(data)
}

export async function renderVehiclePriceTagPdf(
  template: PriceTagTemplateRecord,
  vehicle: any,
  branding: any,
  company: any,
): Promise<Buffer> {
  const data = buildVehicleTemplateData(vehicle, branding, company)
  const html = renderVehiclePriceTagHtml(template, data)
  return renderInvoicePdf(html, {
    format:    template.pageFormat || 'A5',
    landscape: template.orientation === 'landscape',
  })
}

// Beispiel-Fahrzeug für die Live-Vorschau im Vorlagen-Editor (kein echter DynamoDB-Datensatz)
export function getSampleVehicle() {
  return {
    vehicleId:     'sample-0000',
    make:          'BMW',
    model:         '3er',
    variant:       '320d Touring',
    year:          2022,
    mileage:       34500,
    fuel:          'Diesel',
    transmission:  'Automatik',
    power:         190,
    price:         32900,
    status:        'verfügbar',
    licensePlate:  '',
    tuevDate:      '',
    color:         'Alpinweiß',
    images:        [] as string[],
    condition:        'Gebraucht, unfallfrei',
    vehicleType:      'Kombi',
    doors:            '4/5',
    emissionSticker:  'Grün',
    emissionClass:    'Euro 6',
    interiorMaterial: 'Leder',
    equipment:        ['Navigationssystem', 'Sitzheizung', 'Klimaautomatik'] as string[],
    description:   'Scheckheftgepflegtes Einzelfahrzeug aus erster Hand, Vollausstattung inkl. Navigationssystem und Sitzheizung.',
  }
}
