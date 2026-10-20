// Füllt das Demo-Konto (Mandant PLXR-DEMO-0000-0000-DEMO) mit fiktiven Beispieldaten für den Branchen-Baukasten, damit die Seiten in der Demo nicht leer sind.
// Aufruf: npx vite-node scripts/demo/seed-branch-kit.mjs [--apply]   (ohne --apply nur anzeigen). Läuft mehrfach: feste IDs, bestehende Einträge werden überschrieben.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { KIT_PACKAGES, kitSortKey, sanitizeRecord } from '../../shared/branchKit'

const TENANT = 'PLXR-DEMO-0000-0000-DEMO'
// "@liste:n" verweist auf den n-ten Eintrag (ab 0) einer anderen Liste desselben Pakets
const D = {
  fitness: {
    mitglieder: [{ name: 'Anna Beispiel', email: 'anna@beispiel.example', telefon: '+49 221 111111', tarif: 'Monatsbeitrag Standard', beginn: '2026-01-05', status: 'aktiv' }, { name: 'Ben Muster', email: 'ben@beispiel.example', tarif: 'Studenten-Tarif', beginn: '2026-03-12', status: 'aktiv' }, { name: 'Clara Probe', tarif: '10er-Karte', beginn: '2025-11-02', status: 'pausiert' }],
    mitarbeiter: [{ name: 'Jonas Trainer', funktion: 'Trainer/in', telefon: '+49 221 222222', status: 'aktiv' }, { name: 'Lea Kursleitung', funktion: 'Kursleitung', status: 'aktiv' }],
    kurse: [{ titel: 'Yoga Basics', leitung: '@mitarbeiter:1', wochentag: 'Dienstag', uhrzeit: '18:30', dauer: 60, plaetze: 15, preis: 12 }, { titel: 'HIIT', leitung: '@mitarbeiter:0', wochentag: 'Donnerstag', uhrzeit: '19:00', dauer: 45, plaetze: 20, preis: 10 }],
    anmeldungen: [{ kurs: '@kurse:0', mitglied: '@mitglieder:0', datum: '2026-10-27', status: 'angemeldet' }, { kurs: '@kurse:1', mitglied: '@mitglieder:1', datum: '2026-10-22', status: 'teilgenommen' }],
    probetraining: [{ name: 'Dana Interessent', email: 'dana@beispiel.example', wunschtermin: '2026-10-28', status: 'vereinbart' }, { name: 'Emil Neu', status: 'neu' }],
    beitraege: [{ mitglied: '@mitglieder:0', monat: '2026-10', betrag: 39.9, status: 'bezahlt' }, { mitglied: '@mitglieder:1', monat: '2026-10', betrag: 24.9, status: 'offen' }, { mitglied: '@mitglieder:0', monat: '2026-11', betrag: 39.9, status: 'offen' }],
  },
  bildung: {
    teilnehmer: [{ name: 'Mia Schüler', kontakt: 'Eltern Schüler', email: 'eltern@beispiel.example', beginn: '2026-09-01', status: 'aktiv' }, { name: 'Noah Lernt', beginn: '2026-09-15', status: 'aktiv' }],
    lehrkraefte: [{ name: 'Frau Dr. Lehrer', faecher: 'Mathematik, Physik', status: 'aktiv' }, { name: 'Herr Klang', faecher: 'Klavier, Gitarre', status: 'aktiv' }],
    termine: [{ titel: 'Mathe Nachhilfe', datum: '2026-10-26', uhrzeit: '16:00', leitung: '@lehrkraefte:0', ort: 'Raum 2' }, { titel: 'Klavier Einzelunterricht', datum: '2026-10-27', uhrzeit: '17:00', leitung: '@lehrkraefte:1', ort: 'Musikraum' }],
    anwesenheit: [{ termin: '@termine:0', teilnehmer: '@teilnehmer:0', status: 'anwesend' }, { termin: '@termine:1', teilnehmer: '@teilnehmer:1', status: 'entschuldigt' }],
    gebuehren: [{ teilnehmer: '@teilnehmer:0', bezeichnung: 'Kursgebühr Oktober', betrag: 89, status: 'bezahlt' }, { teilnehmer: '@teilnehmer:1', bezeichnung: 'Kursgebühr Oktober', betrag: 69, status: 'offen' }],
  },
  events: {
    veranstaltungen: [{ titel: 'Sommerfest 2027', datum: '2027-06-19', uhrzeit: '15:00', ort: 'Stadtpark', plaetze: 200, preis: 15, status: 'geplant' }, { titel: 'Workshop Fotografie', datum: '2026-11-14', uhrzeit: '10:00', ort: 'Atelier Mitte', plaetze: 12, preis: 49, status: 'Anmeldung offen' }],
    anmeldungen: [{ veranstaltung: '@veranstaltungen:1', name: 'Familie Beispiel', anzahl: 2, ticket: 'Standard', status: 'bezahlt' }, { veranstaltung: '@veranstaltungen:1', name: 'Greta Muster', anzahl: 1, ticket: 'Standard', status: 'angemeldet' }],
  },
  reinigung: {
    objekte: [{ name: 'Praxisgebäude Mitte', adresse: 'Hauptstraße 10, 50667 Köln', kontakt: 'Hausverwaltung Muster', turnus: 'täglich werktags' }, { name: 'Büro Rheinblick', adresse: 'Rheinufer 5, 50668 Köln', turnus: 'wöchentlich Dienstag' }],
    mitarbeiter: [{ name: 'Olga Sauber', telefon: '+49 221 333333', status: 'aktiv' }, { name: 'Pavel Glanz', status: 'aktiv' }],
    einsaetze: [{ objekt: '@objekte:0', datum: '2026-10-26', uhrzeit: '06:00', person: '@mitarbeiter:0', status: 'geplant' }, { objekt: '@objekte:1', datum: '2026-10-21', person: '@mitarbeiter:1', status: 'erledigt' }],
    stunden: [{ datum: '2026-10-21', person: '@mitarbeiter:1', objekt: '@objekte:1', stunden: 3.5 }, { datum: '2026-10-20', person: '@mitarbeiter:0', objekt: '@objekte:0', stunden: 4 }],
  },
  vereine: {
    mitglieder: [{ name: 'Heinz Vorstand', eintritt: '2015-04-01', beitragsart: 'Erwachsene', status: 'aktiv' }, { name: 'Jule Jugend', eintritt: '2024-09-01', beitragsart: 'Jugend', status: 'aktiv' }],
    beitraege: [{ mitglied: '@mitglieder:0', jahr: '2026', betrag: 60, status: 'bezahlt' }, { mitglied: '@mitglieder:1', jahr: '2026', betrag: 30, status: 'offen' }],
    termine: [{ titel: 'Mitgliederversammlung', datum: '2026-11-21', uhrzeit: '19:00', ort: 'Vereinsheim' }, { titel: 'Weihnachtsfeier', datum: '2026-12-12', uhrzeit: '18:00', ort: 'Vereinsheim' }],
  },
  taxi: {
    fahrzeuge: [{ kennzeichen: 'K-TX 101', typ: 'Mercedes E-Klasse', plaetze: 4, tuev: '2027-03-01', status: 'einsatzbereit' }, { kennzeichen: 'K-TX 102', typ: 'VW Caddy Maxi', plaetze: 7, status: 'Werkstatt' }],
    fahrer: [{ name: 'Kemal Fahrer', telefon: '+49 221 444444', status: 'aktiv' }, { name: 'Sabine Steuer', status: 'aktiv' }],
    fahrten: [{ datum: '2026-10-22', uhrzeit: '08:15', abholung: 'Hauptbahnhof Köln', ziel: 'Flughafen Köln/Bonn', kunde: 'Herr Reisender', fahrer: '@fahrer:0', fahrzeug: '@fahrzeuge:0', preis: 42, status: 'erledigt' }, { datum: '2026-10-26', uhrzeit: '14:00', abholung: 'Rheinufer 5', ziel: 'Messe Köln', fahrer: '@fahrer:1', fahrzeug: '@fahrzeuge:0', preis: 28.5, status: 'offen' }],
  },
}

const apply = process.argv.includes('--apply')
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'eu-central-1' }))
let n = 0
for (const pkg of KIT_PACKAGES) {
  const ids = {}
  for (const e of pkg.entities) {
    ids[e.key] = (D[pkg.key]?.[e.key] || []).map((_, i) => `demo-${pkg.key}-${e.key}-${i + 1}`)
    ;(D[pkg.key]?.[e.key] || []).forEach((raw, i) => {
      const input = Object.fromEntries(Object.entries(raw).map(([k, v]) => { const m = typeof v === 'string' && /^@(\w+):(\d+)$/.exec(v); return [k, m ? `demo-${pkg.key}-${m[1]}-${Number(m[2]) + 1}` : v] }))
      const data = sanitizeRecord(e, input)
      const id = ids[e.key][i], now = new Date(Date.UTC(2026, 9, 20, 8, 0, 0) - (D[pkg.key][e.key].length - i) * 3600000).toISOString()
      const item = { tenantId: TENANT, sk: kitSortKey(pkg.key, e.key, id), id, pkg: pkg.key, entity: e.key, data, created: now, updated: now }
      n++
      if (apply) db.send(new PutCommand({ TableName: 'plexora-branch-records', Item: item }))
    })
  }
}
await new Promise(r => setTimeout(r, apply ? 3000 : 0))
console.log(apply ? `geschrieben: ${n} Einträge` : `würde ${n} Einträge schreiben (alle bestehen die Prüfung)`)
