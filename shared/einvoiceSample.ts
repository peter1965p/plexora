// Fiktive Musterdaten für die Beispiel-E-Rechnung auf der Startseite (public/beispiele/). Keine echte Firma, keine echten Nummern:
// IBAN, USt-IdNr. und Steuernummer sind bekannte Beispielwerte. Erzeugt wird mit scripts/make-sample-einvoice.mjs; ein Test prüft, dass die Dateien dazu passen.
export const SAMPLE_COMPANY = { legalName: 'Beispiel Software GmbH', street: 'Musterstraße 1', zipCity: '50667 Köln', country: 'Deutschland', email: 'rechnung@beispiel-software.example', phone: '+49 221 1234567', vatId: 'DE123456789', iban: 'DE89 3704 0044 0532 0130 00', bic: 'COBADEFFXXX', bankName: 'Beispielbank', contactName: 'Erika Mustermann', paymentNote: '' }
export const SAMPLE_SETTINGS = { vatRate: 19, smallBusiness: false, priceDisplay: 'netto', dueText: 'Zahlbar innerhalb von 14 Tagen netto' }
export const SAMPLE_RECORD = {
  invoiceId: 'beispiel-0001', number: 'RE-2026-0001', created: '2026-10-20T09:00:00.000Z', dueDate: '2026-11-03',
  client: 'Muster Kunde AG', clientStreet: 'Marktplatz 1', clientZip: '80331', clientCity: 'München', clientEmail: 'einkauf@muster-kunde.example', clientVatId: 'DE987654321', buyerReference: 'BESTELLUNG-4711',
  clientAddress: 'Marktplatz 1\n80331 München', serviceDate: '2026-10-15',
  items: [{ description: 'Beratung und Konzeption (Stunden)', qty: 10.5, price: 95 }, { description: 'Einrichtung Rechnungsmodul', qty: 1, price: 250 }, { description: 'Schulungsunterlagen', qty: 2, price: 24.9 }],
  amount: 1297.3,
}
export const SAMPLE_FILES = { xrechnung: 'beispiel-xrechnung.xml', zugferd: 'beispiel-zugferd.pdf', zugferdXml: 'beispiel-zugferd.xml' } as const
