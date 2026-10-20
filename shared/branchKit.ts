// Branchen-Baukasten: Fitness & Sport, Bildung, Veranstaltungen, Reinigung, Vereine, Taxi.
// Alle diese Pakete bestehen aus Listen ("Einträgen") mit festen Feldern. Die Beschreibung steht nur hier; Oberfläche (app/pages/branche/[pkg].vue),
// Server (server/api/branchen/…) und Hilfe lesen sie von hier. Reine Daten und Prüflogik, kein Netz.
// Bewusst keine Gesundheits-, Diagnose- oder Zahlungsdaten: Das Paket führt Listen und Stände, es bucht kein Geld und stellt keine Rechnungen aus.
import { isIsoDate } from './gantt'

export type KitFieldType = 'text' | 'longtext' | 'number' | 'money' | 'date' | 'time' | 'select' | 'email' | 'phone' | 'ref' | 'bool'
export interface KitField { key: string; label: string; type: KitFieldType; required?: boolean; options?: string[]; ref?: string; placeholder?: string }
export interface KitEntity {
  key: string; label: string; one: string; icon: string
  fields: KitField[]
  /** Felder in der Tabelle (in dieser Reihenfolge) */
  list: string[]
  /** Hauptfeld: Name des Eintrags (für Auswahllisten und Überschriften) */
  title: string
  /** Summe dieses Geldfeldes unter der Tabelle (z. B. offene Beiträge) */
  sum?: string
  /** Nur Einträge mit diesem Wert in "sumField" zählen: [Feld, Wert] */
  sumWhere?: [string, string]
}
export interface KitPackage {
  key: string; name: string; icon: string; tablerIcon: string; price: number; desc: string; features: string[]
  /** Kurze Anleitung für die Hilfe */
  steps: string[]
  entities: KitEntity[]
}

const t = (key: string, label: string, extra: Partial<KitField> = {}): KitField => ({ key, label, type: 'text', ...extra })
const sel = (key: string, label: string, options: string[], extra: Partial<KitField> = {}): KitField => ({ key, label, type: 'select', options, ...extra })

export const KIT_PACKAGES: KitPackage[] = [
  {
    key: 'fitness', name: 'Fitness & Sport', icon: 'Dumbbell', tablerIcon: 'ti-barbell', price: 39,
    desc: 'Mitglieder, Kurse mit Anmeldung, Probetraining und Beitragsliste für Studios und Sportanbieter.',
    features: ['Mitglieder', 'Kurse & Anmeldung', 'Probetraining', 'Beitragsliste'],
    steps: ['Lege Mitglieder mit Tarif und Status an.', 'Erfasse Kurse mit Wochentag, Uhrzeit und Plätzen und trage Anmeldungen ein.', 'Probetrainings durchlaufen die Stufen neu, vereinbart, erschienen und Mitglied.', 'In der Beitragsliste siehst du pro Monat, wer bezahlt hat. Rechnungen schreibst du weiter unter Finanzen.'],
    entities: [
      { key: 'mitglieder', label: 'Mitglieder', one: 'Mitglied', icon: 'ti-users', title: 'name', list: ['name', 'tarif', 'beginn', 'status'], fields: [
        t('name', 'Name', { required: true }), { key: 'email', label: 'E-Mail', type: 'email' }, { key: 'telefon', label: 'Telefon', type: 'phone' },
        t('tarif', 'Tarif', { placeholder: 'z. B. Monatsbeitrag Standard' }), { key: 'beginn', label: 'Mitglied seit', type: 'date' },
        sel('status', 'Status', ['aktiv', 'pausiert', 'gekündigt'], { required: true }), { key: 'notiz', label: 'Notiz', type: 'longtext' }] },
      { key: 'kurse', label: 'Kurse', one: 'Kurs', icon: 'ti-calendar-event', title: 'titel', list: ['titel', 'trainer', 'wochentag', 'uhrzeit', 'plaetze'], fields: [
        t('titel', 'Kurs', { required: true }), t('trainer', 'Trainer/in'), sel('wochentag', 'Wochentag', ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']),
        { key: 'uhrzeit', label: 'Uhrzeit', type: 'time' }, { key: 'dauer', label: 'Dauer (Minuten)', type: 'number' }, { key: 'plaetze', label: 'Plätze', type: 'number' }, { key: 'preis', label: 'Preis (€)', type: 'money' }] },
      { key: 'anmeldungen', label: 'Kursanmeldungen', one: 'Anmeldung', icon: 'ti-checklist', title: 'kurs', list: ['kurs', 'mitglied', 'datum', 'status'], fields: [
        { key: 'kurs', label: 'Kurs', type: 'ref', ref: 'kurse', required: true }, { key: 'mitglied', label: 'Mitglied', type: 'ref', ref: 'mitglieder', required: true },
        { key: 'datum', label: 'Datum', type: 'date' }, sel('status', 'Status', ['angemeldet', 'teilgenommen', 'abgesagt'], { required: true })] },
      { key: 'probetraining', label: 'Probetraining', one: 'Probetraining', icon: 'ti-run', title: 'name', list: ['name', 'wunschtermin', 'status'], fields: [
        t('name', 'Name', { required: true }), { key: 'email', label: 'E-Mail', type: 'email' }, { key: 'telefon', label: 'Telefon', type: 'phone' },
        { key: 'wunschtermin', label: 'Wunschtermin', type: 'date' }, sel('status', 'Stand', ['neu', 'vereinbart', 'erschienen', 'Mitglied geworden', 'abgesagt'], { required: true })] },
      { key: 'beitraege', label: 'Beiträge', one: 'Beitrag', icon: 'ti-coin-euro', title: 'monat', sum: 'betrag', sumWhere: ['status', 'offen'], list: ['mitglied', 'monat', 'betrag', 'status'], fields: [
        { key: 'mitglied', label: 'Mitglied', type: 'ref', ref: 'mitglieder', required: true }, t('monat', 'Monat', { required: true, placeholder: 'z. B. 2026-11' }),
        { key: 'betrag', label: 'Betrag (€)', type: 'money', required: true }, sel('status', 'Stand', ['offen', 'bezahlt'], { required: true })] },
    ],
  },
  {
    key: 'bildung', name: 'Bildung & Kurse', icon: 'GraduationCap', tablerIcon: 'ti-school', price: 39,
    desc: 'Teilnehmer, Kurstermine, Anwesenheit und Gebührenliste für Nachhilfe, Fahrschule und Musikschule.',
    features: ['Teilnehmer', 'Kurstermine', 'Anwesenheit', 'Gebührenliste'],
    steps: ['Lege Teilnehmer an.', 'Plane Kurstermine mit Datum, Uhrzeit, Ort und Lehrkraft.', 'Halte pro Termin die Anwesenheit fest.', 'Die Gebührenliste zeigt offene und bezahlte Gebühren.'],
    entities: [
      { key: 'teilnehmer', label: 'Teilnehmer', one: 'Teilnehmer', icon: 'ti-users', title: 'name', list: ['name', 'kontakt', 'beginn', 'status'], fields: [
        t('name', 'Name', { required: true }), { key: 'email', label: 'E-Mail', type: 'email' }, { key: 'telefon', label: 'Telefon', type: 'phone' }, t('kontakt', 'Ansprechperson (z. B. Eltern)'),
        { key: 'beginn', label: 'Beginn', type: 'date' }, sel('status', 'Status', ['aktiv', 'pausiert', 'beendet'], { required: true }), { key: 'notiz', label: 'Notiz', type: 'longtext' }] },
      { key: 'termine', label: 'Kurstermine', one: 'Kurstermin', icon: 'ti-calendar-event', title: 'titel', list: ['titel', 'datum', 'uhrzeit', 'lehrkraft', 'ort'], fields: [
        t('titel', 'Kurs / Fach', { required: true }), { key: 'datum', label: 'Datum', type: 'date', required: true }, { key: 'uhrzeit', label: 'Uhrzeit', type: 'time' },
        t('lehrkraft', 'Lehrkraft'), t('ort', 'Ort / Raum'), { key: 'notiz', label: 'Notiz', type: 'longtext' }] },
      { key: 'anwesenheit', label: 'Anwesenheit', one: 'Eintrag', icon: 'ti-checklist', title: 'termin', list: ['termin', 'teilnehmer', 'status'], fields: [
        { key: 'termin', label: 'Kurstermin', type: 'ref', ref: 'termine', required: true }, { key: 'teilnehmer', label: 'Teilnehmer', type: 'ref', ref: 'teilnehmer', required: true },
        sel('status', 'Anwesenheit', ['anwesend', 'entschuldigt', 'unentschuldigt'], { required: true })] },
      { key: 'gebuehren', label: 'Gebühren', one: 'Gebühr', icon: 'ti-coin-euro', title: 'bezeichnung', sum: 'betrag', sumWhere: ['status', 'offen'], list: ['teilnehmer', 'bezeichnung', 'betrag', 'status'], fields: [
        { key: 'teilnehmer', label: 'Teilnehmer', type: 'ref', ref: 'teilnehmer', required: true }, t('bezeichnung', 'Bezeichnung', { required: true, placeholder: 'z. B. Kursgebühr November' }),
        { key: 'betrag', label: 'Betrag (€)', type: 'money', required: true }, sel('status', 'Stand', ['offen', 'bezahlt'], { required: true })] },
    ],
  },
  {
    key: 'events', name: 'Veranstaltungen', icon: 'PartyPopper', tablerIcon: 'ti-confetti', price: 39,
    desc: 'Veranstaltungen planen, Anmeldungen und Tickets erfassen und Teilnehmerlisten führen.',
    features: ['Veranstaltungen', 'Anmeldungen', 'Tickets', 'Teilnehmerliste'],
    steps: ['Lege eine Veranstaltung mit Datum, Ort und Platzzahl an.', 'Erfasse Anmeldungen mit Ticketart und Anzahl.', 'Die Anmeldungen sind deine Teilnehmerliste: sie lässt sich nach Veranstaltung durchsuchen.'],
    entities: [
      { key: 'veranstaltungen', label: 'Veranstaltungen', one: 'Veranstaltung', icon: 'ti-confetti', title: 'titel', list: ['titel', 'datum', 'ort', 'plaetze', 'status'], fields: [
        t('titel', 'Titel', { required: true }), { key: 'datum', label: 'Datum', type: 'date', required: true }, { key: 'uhrzeit', label: 'Beginn', type: 'time' }, t('ort', 'Ort'),
        { key: 'plaetze', label: 'Plätze', type: 'number' }, { key: 'preis', label: 'Ticketpreis (€)', type: 'money' }, sel('status', 'Stand', ['geplant', 'Anmeldung offen', 'ausgebucht', 'abgesagt', 'durchgeführt'], { required: true }),
        { key: 'beschreibung', label: 'Beschreibung', type: 'longtext' }] },
      { key: 'anmeldungen', label: 'Anmeldungen & Tickets', one: 'Anmeldung', icon: 'ti-ticket', title: 'name', list: ['veranstaltung', 'name', 'anzahl', 'ticket', 'status'], fields: [
        { key: 'veranstaltung', label: 'Veranstaltung', type: 'ref', ref: 'veranstaltungen', required: true }, t('name', 'Name', { required: true }),
        { key: 'email', label: 'E-Mail', type: 'email' }, { key: 'anzahl', label: 'Anzahl Personen', type: 'number' }, t('ticket', 'Ticketart', { placeholder: 'z. B. Standard, VIP' }),
        sel('status', 'Stand', ['angemeldet', 'bezahlt', 'eingelassen', 'storniert'], { required: true })] },
    ],
  },
  {
    key: 'reinigung', name: 'Reinigung & Gebäudeservice', icon: 'SprayCan', tablerIcon: 'ti-brush', price: 39,
    desc: 'Objekte, Einsatzplanung und Stundennachweise für Reinigungs- und Gebäudedienste.',
    features: ['Objekte', 'Einsatzplanung', 'Stundennachweise'],
    steps: ['Lege die Objekte mit Adresse und Kontakt an.', 'Plane Einsätze mit Datum, Objekt und Mitarbeiter.', 'Erfasse Stundennachweise pro Mitarbeiter und Objekt. Die Summe der Stunden steht unter der Tabelle.'],
    entities: [
      { key: 'objekte', label: 'Objekte', one: 'Objekt', icon: 'ti-building', title: 'name', list: ['name', 'adresse', 'kontakt', 'turnus'], fields: [
        t('name', 'Objekt', { required: true }), t('adresse', 'Adresse'), t('kontakt', 'Ansprechperson'), { key: 'telefon', label: 'Telefon', type: 'phone' },
        t('turnus', 'Turnus', { placeholder: 'z. B. wöchentlich Dienstag' }), { key: 'notiz', label: 'Hinweise (Schlüssel, Zugang …)', type: 'longtext' }] },
      { key: 'einsaetze', label: 'Einsätze', one: 'Einsatz', icon: 'ti-calendar-event', title: 'objekt', list: ['datum', 'objekt', 'mitarbeiter', 'status'], fields: [
        { key: 'objekt', label: 'Objekt', type: 'ref', ref: 'objekte', required: true }, { key: 'datum', label: 'Datum', type: 'date', required: true }, { key: 'uhrzeit', label: 'Uhrzeit', type: 'time' },
        t('mitarbeiter', 'Mitarbeiter/in'), sel('status', 'Stand', ['geplant', 'erledigt', 'ausgefallen'], { required: true }), { key: 'notiz', label: 'Notiz', type: 'longtext' }] },
      { key: 'stunden', label: 'Stundennachweise', one: 'Stundennachweis', icon: 'ti-clock', title: 'mitarbeiter', sum: 'stunden', list: ['datum', 'mitarbeiter', 'objekt', 'stunden'], fields: [
        { key: 'datum', label: 'Datum', type: 'date', required: true }, t('mitarbeiter', 'Mitarbeiter/in', { required: true }), { key: 'objekt', label: 'Objekt', type: 'ref', ref: 'objekte' },
        { key: 'stunden', label: 'Stunden', type: 'number', required: true }, { key: 'notiz', label: 'Notiz', type: 'longtext' }] },
    ],
  },
  {
    key: 'vereine', name: 'Verein', icon: 'Trophy', tablerIcon: 'ti-trophy', price: 29,
    desc: 'Mitglieder, Beiträge und Termine für Vereine.',
    features: ['Mitglieder', 'Beiträge', 'Vereinstermine'],
    steps: ['Lege Mitglieder mit Eintritt und Beitragsart an.', 'Führe die Beitragsliste: wer hat für welches Jahr bezahlt.', 'Trage Vereinstermine wie Versammlungen und Feste ein.'],
    entities: [
      { key: 'mitglieder', label: 'Mitglieder', one: 'Mitglied', icon: 'ti-users', title: 'name', list: ['name', 'beitragsart', 'eintritt', 'status'], fields: [
        t('name', 'Name', { required: true }), { key: 'email', label: 'E-Mail', type: 'email' }, { key: 'telefon', label: 'Telefon', type: 'phone' }, t('adresse', 'Adresse'),
        { key: 'eintritt', label: 'Eintritt', type: 'date' }, t('beitragsart', 'Beitragsart', { placeholder: 'z. B. Erwachsene, Jugend' }),
        sel('status', 'Status', ['aktiv', 'ruhend', 'ausgetreten'], { required: true }), { key: 'notiz', label: 'Notiz', type: 'longtext' }] },
      { key: 'beitraege', label: 'Beiträge', one: 'Beitrag', icon: 'ti-coin-euro', title: 'jahr', sum: 'betrag', sumWhere: ['status', 'offen'], list: ['mitglied', 'jahr', 'betrag', 'status'], fields: [
        { key: 'mitglied', label: 'Mitglied', type: 'ref', ref: 'mitglieder', required: true }, t('jahr', 'Jahr', { required: true, placeholder: '2026' }),
        { key: 'betrag', label: 'Betrag (€)', type: 'money', required: true }, sel('status', 'Stand', ['offen', 'bezahlt'], { required: true })] },
      { key: 'termine', label: 'Termine', one: 'Termin', icon: 'ti-calendar-event', title: 'titel', list: ['datum', 'titel', 'ort'], fields: [
        t('titel', 'Titel', { required: true }), { key: 'datum', label: 'Datum', type: 'date', required: true }, { key: 'uhrzeit', label: 'Uhrzeit', type: 'time' }, t('ort', 'Ort'),
        { key: 'notiz', label: 'Notiz', type: 'longtext' }] },
    ],
  },
  {
    key: 'taxi', name: 'Taxi & Fahrdienst', icon: 'CarTaxiFront', tablerIcon: 'ti-steering-wheel', price: 39,
    desc: 'Fahrzeuge, Fahrer und Fahraufträge für Taxi, Mietwagen und Fahrdienste.',
    features: ['Fahrzeuge', 'Fahrer', 'Fahraufträge'],
    steps: ['Lege Fahrzeuge und Fahrer an.', 'Erfasse Fahraufträge mit Datum, Abholung, Ziel, Fahrer und Fahrzeug.', 'Setze den Stand (offen, unterwegs, erledigt). Der Gesamtpreis der erledigten Fahrten steht unter der Tabelle.'],
    entities: [
      { key: 'fahrzeuge', label: 'Fahrzeuge', one: 'Fahrzeug', icon: 'ti-car', title: 'kennzeichen', list: ['kennzeichen', 'typ', 'plaetze', 'status'], fields: [
        t('kennzeichen', 'Kennzeichen', { required: true }), t('typ', 'Typ / Modell'), { key: 'plaetze', label: 'Sitzplätze', type: 'number' },
        { key: 'tuev', label: 'Nächste Hauptuntersuchung', type: 'date' }, sel('status', 'Stand', ['einsatzbereit', 'Werkstatt', 'außer Dienst'], { required: true })] },
      { key: 'fahrer', label: 'Fahrer', one: 'Fahrer/in', icon: 'ti-user', title: 'name', list: ['name', 'telefon', 'status'], fields: [
        t('name', 'Name', { required: true }), { key: 'telefon', label: 'Telefon', type: 'phone' }, { key: 'email', label: 'E-Mail', type: 'email' }, sel('status', 'Status', ['aktiv', 'Urlaub', 'inaktiv'], { required: true })] },
      { key: 'fahrten', label: 'Fahraufträge', one: 'Fahrauftrag', icon: 'ti-route', title: 'ziel', sum: 'preis', sumWhere: ['status', 'erledigt'], list: ['datum', 'abholung', 'ziel', 'fahrer', 'preis', 'status'], fields: [
        { key: 'datum', label: 'Datum', type: 'date', required: true }, { key: 'uhrzeit', label: 'Uhrzeit', type: 'time' }, t('abholung', 'Abholung', { required: true }), t('ziel', 'Ziel', { required: true }),
        t('kunde', 'Kunde'), { key: 'telefon', label: 'Telefon', type: 'phone' }, { key: 'fahrer', label: 'Fahrer/in', type: 'ref', ref: 'fahrer' }, { key: 'fahrzeug', label: 'Fahrzeug', type: 'ref', ref: 'fahrzeuge' },
        { key: 'preis', label: 'Preis (€)', type: 'money' }, sel('status', 'Stand', ['offen', 'unterwegs', 'erledigt', 'storniert'], { required: true })] },
    ],
  },
]

export const kitPackage = (key: unknown) => KIT_PACKAGES.find(p => p.key === key)
export const kitEntity = (pkg: KitPackage | undefined, key: unknown) => pkg?.entities.find(e => e.key === key)
export const KIT_ROUTE = (key: string) => `/branche/${key}`
/** Höchstens so viele Einträge je Liste und Mandant (DynamoDB-Kosten und Missbrauch) */
export const KIT_MAX_RECORDS = 2000

export class KitError extends Error { constructor(message: string) { super(message) } }

const REF_RE = /^[a-z0-9-]{1,40}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const EMAIL_RE = /^[^\s@<>]{1,100}@[^\s@<>]{1,100}\.[^\s@<>]{2,}$/
const PHONE_RE = /^[0-9+()/. \-]{3,40}$/
const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max)

/** Prüft die Eingabe gegen die Felder des Eintrags und gibt nur bekannte, bereinigte Felder zurück. Wirft KitError mit verständlicher Meldung. */
export function sanitizeRecord(entity: KitEntity, input: any): Record<string, string | number | boolean> {
  const src = input && typeof input === 'object' ? input : {}
  const out: Record<string, string | number | boolean> = {}
  for (const f of entity.fields) {
    const raw = src[f.key]
    const empty = raw === undefined || raw === null || raw === ''
    if (f.type === 'bool') { out[f.key] = raw === true; continue }
    if (empty) { if (f.required) throw new KitError(`„${f.label}“ fehlt.`); continue }
    switch (f.type) {
      case 'text': out[f.key] = clean(raw, 200); break
      case 'longtext': out[f.key] = clean(raw, 2000); break
      case 'number': case 'money': {
        const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'))
        if (!Number.isFinite(n) || Math.abs(n) > 1e9) throw new KitError(`„${f.label}“ ist keine gültige Zahl.`)
        if (f.type === 'money' && n < 0) throw new KitError(`„${f.label}“ darf nicht negativ sein.`)
        out[f.key] = f.type === 'money' ? Math.round(n * 100) / 100 : Math.round(n * 100) / 100; break
      }
      case 'date': if (!isIsoDate(raw)) throw new KitError(`„${f.label}“ ist kein gültiges Datum.`); out[f.key] = raw as string; break
      case 'time': if (typeof raw !== 'string' || !TIME_RE.test(raw)) throw new KitError(`„${f.label}“ ist keine gültige Uhrzeit.`); out[f.key] = raw; break
      case 'select': if (typeof raw !== 'string' || !f.options?.includes(raw)) throw new KitError(`„${f.label}“: Auswahl ungültig.`); out[f.key] = raw; break
      case 'email': { const v = clean(raw, 200); if (!EMAIL_RE.test(v)) throw new KitError(`„${f.label}“ ist keine gültige E-Mail-Adresse.`); out[f.key] = v; break }
      case 'phone': { const v = clean(raw, 40); if (!PHONE_RE.test(v)) throw new KitError(`„${f.label}“ ist keine gültige Telefonnummer.`); out[f.key] = v; break }
      case 'ref': if (typeof raw !== 'string' || !REF_RE.test(raw)) throw new KitError(`„${f.label}“: Auswahl ungültig.`); out[f.key] = raw; break
    }
  }
  return out
}

/** Schlüssel eines Eintrags in der Tabelle: Paket#Liste#ID */
export const kitSortKey = (pkg: string, entity: string, id: string) => `${pkg}#${entity}#${id}`
export const kitPrefix = (pkg: string, entity: string) => `${pkg}#${entity}#`
export const isKitId = (s: unknown): s is string => typeof s === 'string' && REF_RE.test(s)

/** Summe für die Zeile unter der Tabelle (z. B. offene Beiträge) */
export function kitSum(entity: KitEntity, rows: Array<Record<string, any>>): number | null {
  if (!entity.sum) return null
  const [k, v] = entity.sumWhere || []
  return Math.round(rows.filter(r => !k || r[k] === v).reduce((s, r) => s + (Number(r[entity.sum!]) || 0), 0) * 100) / 100
}
