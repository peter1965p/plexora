// Kern des Entwurfs-Autosaves: framework-frei, damit Debounce, Konflikte und Offline-Verhalten
// ohne Nuxt/Vue testbar sind. Die Vue-Anbindung steht in composables/useDraftAutosave.ts.

export type DraftData = Record<string, unknown>
export type DraftStatus = 'idle' | 'saving' | 'saved' | 'offline'

export interface DraftApi {
  get(formType: string): Promise<{ data: DraftData; clientUpdatedAt: number } | null>
  put(formType: string, body: { data: DraftData; clientUpdatedAt: number }, opts?: { keepalive?: boolean }): Promise<void>
  del(formType: string): Promise<void>
}

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface DraftCandidate {
  data: DraftData
  at: number
  source: 'server' | 'local'
}

export interface DraftAutosaverOptions {
  formType: string
  /** Nur diese Felder werden gespeichert (nie Tokens oder andere Daten) */
  fields: string[]
  getData: () => DraftData
  applyData: (data: DraftData) => void
  api: DraftApi
  storage?: KeyValueStore | null
  /** Nutzerkennung für den localStorage-Schlüssel (Token-Sub, kein Geheimnis) */
  userKey: string
  debounceMs?: number
  now?: () => number
  onStatus?: (status: DraftStatus, savedAt: number | null) => void
}

const stable = (d: DraftData) => JSON.stringify(Object.keys(d).sort().map(k => [k, d[k]]))

export class DraftAutosaver {
  private opts: Required<Pick<DraftAutosaverOptions, 'debounceMs' | 'now'>> & DraftAutosaverOptions
  private timer: ReturnType<typeof setTimeout> | null = null
  private pristine = ''
  private lastSaved = ''
  private active = false
  private inFlight = false
  private again = false
  candidate: DraftCandidate | null = null
  status: DraftStatus = 'idle'
  savedAt: number | null = null

  constructor(opts: DraftAutosaverOptions) {
    // Standardwerte gelten auch, wenn eine Option ausdrücklich als undefined übergeben wird
    this.opts = { ...opts, debounceMs: opts.debounceMs ?? 3000, now: opts.now ?? (() => Date.now()) }
  }

  private get storageKey() { return `plx_draft:${this.opts.userKey}:${this.opts.formType}` }
  private setStatus(s: DraftStatus) { this.status = s; this.opts.onStatus?.(s, this.savedAt) }

  /** Nur die erlaubten Felder des Formulars */
  snapshot(): DraftData {
    const src = this.opts.getData()
    const out: DraftData = {}
    for (const k of this.opts.fields) if (k in src) out[k] = src[k]
    return out
  }

  private readLocal(): { at: number; data: DraftData } | null {
    try {
      const raw = this.opts.storage?.getItem(this.storageKey)
      if (!raw) return null
      const v = JSON.parse(raw)
      if (!v || typeof v.at !== 'number' || typeof v.data !== 'object' || v.data === null) return null
      const data: DraftData = {}
      for (const k of this.opts.fields) if (k in v.data) data[k] = v.data[k]
      return { at: v.at, data }
    } catch { return null }
  }

  private writeLocal(at: number, data: DraftData) {
    try { this.opts.storage?.setItem(this.storageKey, JSON.stringify({ at, data })) } catch { /* Speicher voll/gesperrt: ignorieren */ }
  }

  private removeLocal() {
    try { this.opts.storage?.removeItem(this.storageKey) } catch { /* ignorieren */ }
  }

  /**
   * Beim Öffnen des Formulars aufrufen (Formular steht dann im Ausgangszustand).
   * Lädt Server- und lokale Kopie, die neuere wird als Wiederherstellungs-Angebot gemerkt.
   */
  async begin(): Promise<DraftCandidate | null> {
    this.cancelTimer()
    this.active = true
    this.candidate = null
    this.pristine = stable(this.snapshot())
    this.lastSaved = this.pristine
    this.setStatus('idle')

    const local = this.readLocal()
    let server: { data: DraftData; clientUpdatedAt: number } | null = null
    try { server = await this.opts.api.get(this.opts.formType) } catch { this.setStatus('offline') }

    const options: DraftCandidate[] = []
    if (server) options.push({ data: this.pick(server.data), at: server.clientUpdatedAt, source: 'server' })
    if (local) options.push({ data: local.data, at: local.at, source: 'local' })
    // Konflikt: der neuere Zeitstempel gewinnt; Kopien ohne Inhalt werden nicht angeboten
    options.sort((a, b) => b.at - a.at)
    const best = options.find(o => stable(o.data) !== this.pristine) || null
    this.candidate = best
    return best
  }

  private pick(data: DraftData): DraftData {
    const out: DraftData = {}
    for (const k of this.opts.fields) if (k in data) out[k] = data[k]
    return out
  }

  /** Bei jeder Änderung am Formular aufrufen */
  touch() {
    if (!this.active) return
    const data = this.snapshot()
    if (stable(data) === this.lastSaved) { this.cancelTimer(); return }
    // Sofort lokal sichern (Netz bei Verbindungsabbruch), Server nach der Ruhepause
    this.writeLocal(this.opts.now(), data)
    this.cancelTimer()
    this.timer = setTimeout(() => { void this.flush() }, this.opts.debounceMs)
  }

  private cancelTimer() { if (this.timer) { clearTimeout(this.timer); this.timer = null } }

  /** Sofort zum Server speichern (z. B. beim Verlassen oder kurz vor Session-Ablauf) */
  async flush(opts: { keepalive?: boolean } = {}): Promise<void> {
    this.cancelTimer()
    if (!this.active) return
    const data = this.snapshot()
    const key = stable(data)
    if (key === this.lastSaved) return
    if (this.inFlight) { this.again = true; return }

    const at = this.opts.now()
    this.writeLocal(at, data)
    this.inFlight = true
    this.setStatus('saving')
    try {
      await this.opts.api.put(this.opts.formType, { data, clientUpdatedAt: at }, { keepalive: opts.keepalive })
      this.lastSaved = key
      this.savedAt = at
      this.setStatus('saved')
    } catch {
      this.setStatus('offline') // lokale Kopie liegt bereits vor
    } finally {
      this.inFlight = false
    }
    if (this.again) { this.again = false; await this.flush(opts) }
  }

  /** Angebotenen Entwurf ins Formular übernehmen */
  restore() {
    if (!this.candidate) return
    this.opts.applyData(this.candidate.data)
    this.candidate = null
    this.touch()
  }

  /** Angebotenen Entwurf verwerfen: lokal und auf dem Server löschen */
  async discard() {
    this.candidate = null
    this.cancelTimer()
    this.removeLocal()
    this.lastSaved = this.pristine
    this.setStatus('idle')
    try { await this.opts.api.del(this.opts.formType) } catch { /* beim nächsten Speichern wird überschrieben */ }
  }

  /** Nach erfolgreichem „Kampagne erstellen“: Entwurf überall entfernen und Autosave beenden */
  async clear() {
    this.cancelTimer()
    this.active = false
    this.candidate = null
    this.removeLocal()
    this.setStatus('idle')
    try { await this.opts.api.del(this.opts.formType) } catch { /* Server räumt beim Anlegen ebenfalls auf */ }
  }

  /** Formular wurde geschlossen: Autosave beenden, Entwurf bleibt erhalten */
  stop() {
    this.cancelTimer()
    this.active = false
  }
}
