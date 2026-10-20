# E-Rechnung in Plexora (Stand 20.10.2026)

Plexora erzeugt Rechnungen als **XRechnung 3.0** (XML, Syntax CII) und **ZUGFeRD / Factur-X** (Profil EN 16931: PDF mit eingebetteter `factur-x.xml`) und liest eingehende E-Rechnungen (**CII und UBL**, als XML oder als ZUGFeRD-PDF).

## Aufbau
- `shared/einvoice.ts`: neutrales Modell, Rechnung → Modell (`fromRecord`), Summen (`computeTotals`, je Steuersatz, Rundung auf Cent), Pflichtangaben-Prüfung (`validateEInvoice`), XML (`toCii`).
- `server/utils/einvoiceParse.ts`: Lesen (CII und UBL, ohne DTD/Entities, höchstens 2 MB).
- `server/utils/zugferd.ts`: XML in die PDF einbetten (Anhang `factur-x.xml`, Beziehung „Alternative“, `/AF`, XMP mit Factur-X-Kennung, PDF/A-3-Kennung, sRGB-Ausgabebedingung, Datei-ID) und wieder herausholen. `srgbIcc.ts` erzeugt das Farbprofil selbst.
- Routen (alle nur für den Aussteller / den eigenen Mandanten): `GET /api/finance/[id]/xrechnung`, `…/zugferd`, `…/einvoice-check`; `POST /api/finance/incoming/import` (Vorschau), `POST/GET /api/finance/incoming`, `GET/PATCH/DELETE /api/finance/incoming/[id]`. Tabelle `plexora-finance-incoming`.
- Versand: Einstellungen → Rechnung → „E-Rechnung beim Versand per Mail“ (PDF, ZUGFeRD, XRechnung zusätzlich). Fehlen Pflichtangaben, wird nicht gesendet (422 mit Liste).
- Oberfläche: Finanzen (Knöpfe XRechnung, ZUGFeRD, „E-Rechnung prüfen“, Reiter „Eingangsrechnungen“, Felder im Rechnungsformular), Einstellungen → Firma (Steuernummer, Ansprechpartner).

## Pflichtangaben (Plexora prüft vor dem Erzeugen)
Firma: Name, Straße, PLZ/Ort, USt-IdNr. oder Steuernummer, IBAN (Prüfziffer); für XRechnung zusätzlich Ansprechpartner, Telefon, E-Mail (BR-DE-2) und E-Mail des Kunden. Kunde: Name, Straße, PLZ/Ort. Ohne Leitweg-ID dient die Rechnungsnummer als Käuferreferenz.

## Wie geprüft
- Offizieller KoSIT-Validator 1.6.3 mit der XRechnung-Konfiguration 3.0.2 (2026-08-31): Schema und Schematron ohne Fehler und Warnungen (Normal- und Kleinunternehmer-Rechnung, beide Profile).
- Mustang-CLI 2.26.0 (mit veraPDF): ZUGFeRD-PDF aus dem echten Browser-Renderer **PDF/A-3b konform**, XML gültig.
- Automatische Tests: `tests/einvoice/`.

## Grenzen
- Kein Versand über Peppol oder Behörden-Portale (Datei herunterladen und hochladen/mailen).
- Positionen haben Menge, Nettopreis, Steuersatz; keine Rabatte/Zuschläge, keine Anzahlungen, keine Gutschriften als Ausgangsdokument (Gutschriften werden nur beim Lesen erkannt).
- Rechnungs-PDFs mit eingebetteten Bildern oder besonderen Schriften wurden nicht einzeln auf PDF/A geprüft; maßgeblich für Programme ist die eingebettete XML.
- Die Kundenanschrift steht erst bei neu angelegten Rechnungen im Datensatz; alte Rechnungen ohne Anschrift zeigen unter „E-Rechnung prüfen“, was fehlt.
- Rechtsfragen (Fristen, Aufbewahrung) bitte mit dem Steuerberater klären.
