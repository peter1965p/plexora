import QRCode from 'qrcode'

export interface EpcQrInput {
  name: string      // Empfänger (max. 70 Zeichen)
  iban: string
  bic?: string
  amount: number     // Betrag in EUR
  reference: string  // unstrukturierter Verwendungszweck, z.B. Rechnungsnummer (max. 140 Zeichen)
}

// EPC069-12 ("GiroCode") — SEPA-Überweisung als QR-Code, von Banking-Apps direkt scanbar.
export function buildEpcPayload({ name, iban, bic, amount, reference }: EpcQrInput): string {
  const lines = [
    'BCD',
    '002',
    '1',
    'SCT',
    (bic || '').replace(/\s/g, '').toUpperCase().slice(0, 11),
    (name || '').slice(0, 70),
    iban.replace(/\s/g, '').toUpperCase(),
    `EUR${Math.max(0, amount).toFixed(2)}`,
    '',
    '',
    (reference || '').slice(0, 140),
    '',
  ]
  // Trailing leere Zeilen weglassen — manche Banking-Apps sind strikt beim Parsen
  while (lines.length && lines[lines.length - 1] === '') lines.pop()
  return lines.join('\n')
}

export async function buildEpcQrDataUri(input: EpcQrInput): Promise<string> {
  const payload = buildEpcPayload(input)
  return QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 1, width: 240 })
}
