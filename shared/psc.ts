// PSC Manager (Plexora Sicherheits-Center): reine Hilfen für die Übersicht (Ampelfarben, Prozent, Alter). Keine Datenbank, kein Netz.
export type Level = 'ok' | 'warn' | 'bad' | 'off'
export const pct = (n: number, max: number) => (max > 0 ? Math.min(100, Math.max(0, Math.round((n / max) * 100))) : 0)

/** Ampel für eine Auslastung: unter 60 % ok, bis 85 % Warnung, darüber kritisch */
export const loadLevel = (used: number, max: number): Level => { const p = pct(used, max); return p < 60 ? 'ok' : p < 85 ? 'warn' : 'bad' }
/** Ampel für die Fehlerquote in Prozent der Anfragen */
export const errorLevel = (errors: number, throttles: number, total: number): Level => {
  const all = total + throttles; if (!all) return 'ok'
  const bad = ((errors + throttles) / all) * 100
  return bad < 1 ? 'ok' : bad < 5 ? 'warn' : 'bad'
}
/** Wiederherstellung (Punkt-in-Zeit) je Tabelle: alle = ok, einige = Warnung, keine = kritisch */
export const recoveryLevel = (enabled: number, tables: number): Level => (tables === 0 ? 'off' : enabled >= tables ? 'ok' : enabled > 0 ? 'warn' : 'bad')
/** Alter einer Sicherung: bis 2 Tage ok, bis 8 Tage Warnung, älter oder keine kritisch */
export const backupLevel = (iso?: string | null, now = Date.now()): Level => {
  if (!iso) return 'bad'; const days = (now - Date.parse(iso)) / 86_400_000
  return days <= 2 ? 'ok' : days <= 8 ? 'warn' : 'bad'
}
export const LEVEL_COLOR: Record<Level, string> = { ok: '#10b981', warn: '#f0b428', bad: '#e05c5c', off: '#8b8fa8' }
export const LEVEL_TEXT: Record<Level, string> = { ok: 'in Ordnung', warn: 'Achtung', bad: 'kritisch', off: 'nicht verfügbar' }

/** "vor 5 Minuten", "vor 3 Tagen" */
export function ageText(iso?: string | null, now = Date.now()): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return '—'
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  if (s < 90) return 'gerade eben'
  const m = Math.round(s / 60); if (m < 90) return `vor ${m} Minuten`
  const h = Math.round(m / 60); if (h < 36) return `vor ${h} Stunden`
  const d = Math.round(h / 24); return `vor ${d} Tagen`
}
export const mb = (bytes: number) => Math.round((bytes / 1048576) * 10) / 10
export const kb = (bytes: number) => Math.round((bytes / 1024) * 10) / 10

/** Messpunkte (Zeit + Wert) in n Stunden-Eimer legen, der letzte Eimer endet bei "end". Fehlende Stunden sind 0. Zeitstempel als ISO-Text oder Millisekunden. */
export function hourBuckets(points: Array<{ ts: string | number | Date; v: number }>, end: number, n = 24): number[] {
  const out = Array.from({ length: n }, () => 0), start = end - n * 3_600_000
  for (const p of points) { const t = new Date(p.ts).getTime(); if (!Number.isFinite(t) || t < start || t >= end) continue; out[Math.min(n - 1, Math.floor((t - start) / 3_600_000))] += Number(p.v) || 0 }
  return out.map(v => Math.round(v))
}

/** Ziel eines Hinweises: "tab:<name>" = Reiter im PSC Manager, sonst eine Seite */
export interface Advice { level: Level; text: string; to?: string }
/** Hinweise aus den Messwerten der Übersicht (Reihenfolge: kritisch zuerst). Fehlende Abschnitte (ok:false) erzeugen keine Hinweise. */
export function adviceFrom(o: any, now = Date.now()): Advice[] {
  const out: Advice[] = []
  const db = o?.db?.ok ? o.db.data : null, lam = o?.lambda?.ok ? o.lambda.data : null, pr = o?.protection?.ok ? o.protection.data : null, bk = o?.backups?.ok ? o.backups.data : null
  if (db) {
    if (db.tables && db.pitrEnabled === 0) out.push({ level: 'bad', to: 'tab:notfall', text: `Wiederherstellung (Punkt-in-Zeit) ist für keine der ${db.tables} Tabellen eingeschaltet: Ein Löschfehler oder Angriff wäre nicht umkehrbar.` })
    else if (db.tables && db.pitrEnabled < db.tables) out.push({ level: 'warn', to: 'tab:notfall', text: `Wiederherstellung ist nur für ${db.pitrEnabled} von ${db.tables} Tabellen eingeschaltet.` })
    if (db.tables && db.deletionProtected === 0) out.push({ level: 'warn', to: 'tab:notfall', text: 'Kein Löschschutz an den Tabellen: Eine Tabelle könnte versehentlich gelöscht werden.' })
  }
  if (bk) {
    if (!bk.last) out.push({ level: 'bad', to: 'tab:notfall', text: 'Es gibt keine fertige Gesamtsicherung.' })
    else if (backupLevel(bk.last.at, now) !== 'ok') out.push({ level: backupLevel(bk.last.at, now), to: 'tab:notfall', text: `Die letzte Sicherung ist ${ageText(bk.last.at, now).replace('vor ', 'schon ')} alt.` })
    if (!bk.external) out.push({ level: 'warn', to: 'tab:notfall', text: 'Sicherungen liegen nur in AWS. Fällt AWS aus, sind sie mit weg: eine Kopie außerhalb von AWS fehlt.' })
  }
  if (pr) {
    if (!pr.roles) out.push({ level: 'warn', to: '/help?topic=rollen', text: 'Rollenprüfung läuft nur im Beobachtungsmodus (wird nicht durchgesetzt).' })
    if (!pr.plan) out.push({ level: 'warn', to: '/help?topic=rollen', text: 'Tarifprüfung läuft nur im Beobachtungsmodus (wird nicht durchgesetzt).' })
  }
  if (lam) {
    if (lam.throttles24h > 0) out.push({ level: errorLevel(lam.errors24h, lam.throttles24h, lam.invocations24h) === 'bad' ? 'bad' : 'warn', to: 'tab:infra', text: `${lam.throttles24h} Anfragen wurden in 24 Stunden gedrosselt.` })
    if (lam.errors24h > 0) out.push({ level: 'warn', to: 'tab:infra', text: `${lam.errors24h} Funktionsfehler in 24 Stunden.` })
  }
  const order: Record<Level, number> = { bad: 0, warn: 1, ok: 2, off: 3 }
  return out.sort((a, b) => order[a.level] - order[b.level])
}
