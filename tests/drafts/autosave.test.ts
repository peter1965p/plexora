import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DraftAutosaver, type DraftApi, type KeyValueStore, type DraftData } from '../../app/utils/draftAutosave'

const FIELDS = ['name', 'headline', 'contentItems']

function makeStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return { map, getItem: k => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v) }, removeItem: k => { map.delete(k) } }
}

function makeApi(initial: { data: DraftData; clientUpdatedAt: number } | null = null) {
  const calls = { get: 0, put: [] as any[], del: 0 }
  let server = initial
  let failPut = false
  const api: DraftApi = {
    async get() { calls.get++; return server },
    async put(_t, body, opts) { if (failPut) throw new Error('offline'); calls.put.push({ body, opts }); server = { data: body.data, clientUpdatedAt: body.clientUpdatedAt } },
    async del() { calls.del++; server = null },
  }
  return { api, calls, setFail: (v: boolean) => { failPut = v }, get server() { return server } }
}

function setup(over: Partial<{ initial: any; form: DraftData; now: () => number }> = {}) {
  const form: DraftData = over.form ?? { name: '', headline: '', contentItems: ['', ''] , token: 'GEHEIM' }
  const store = makeStore()
  const a = makeApi(over.initial ?? null)
  const statuses: string[] = []
  const saver = new DraftAutosaver({
    formType: 'marketing-campaign', fields: FIELDS, userKey: 'sub-A',
    getData: () => form, applyData: d => Object.assign(form, d),
    api: a.api, storage: store, now: over.now,
    onStatus: s => statuses.push(s),
  })
  return { form, store, a, saver, statuses }
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-06T10:00:00Z')) })
afterEach(() => { vi.useRealTimers() })

describe('Debounce (3 Sekunden nach der letzten Änderung)', () => {
  it('speichert erst 3 s nach der letzten Änderung, nicht früher', async () => {
    const { form, a, saver } = setup()
    await saver.begin()
    form.name = 'K'; saver.touch()
    await vi.advanceTimersByTimeAsync(2900)
    expect(a.calls.put.length).toBe(0)
    await vi.advanceTimersByTimeAsync(200)
    expect(a.calls.put.length).toBe(1)
  })

  it('jede neue Änderung setzt die Frist zurück; es gibt nur einen Aufruf', async () => {
    const { form, a, saver } = setup()
    await saver.begin()
    for (const n of ['K', 'KI', 'KI B', 'KI Be']) { form.name = n; saver.touch(); await vi.advanceTimersByTimeAsync(2000) }
    expect(a.calls.put.length).toBe(0)
    await vi.advanceTimersByTimeAsync(1000)
    expect(a.calls.put.length).toBe(1)
    expect(a.calls.put[0].body.data.name).toBe('KI Be')
  })

  it('speichert nichts, solange das Formular unverändert ist', async () => {
    const { a, saver } = setup()
    await saver.begin()
    saver.touch()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(a.calls.put.length).toBe(0)
  })

  it('speichert nicht erneut, wenn sich seit dem letzten Speichern nichts geändert hat', async () => {
    const { form, a, saver } = setup()
    await saver.begin()
    form.name = 'A'; saver.touch(); await vi.advanceTimersByTimeAsync(3000)
    saver.touch(); await vi.advanceTimersByTimeAsync(3000)
    await saver.flush()
    expect(a.calls.put.length).toBe(1)
  })
})

describe('Speichern beim Verlassen / vor Session-Ablauf', () => {
  it('flush speichert sofort und mit keepalive', async () => {
    const { form, a, saver } = setup()
    await saver.begin()
    form.headline = 'Neu'; saver.touch()
    await saver.flush({ keepalive: true })
    expect(a.calls.put.length).toBe(1)
    expect(a.calls.put[0].opts).toEqual({ keepalive: true })
    // der wartende Debounce-Timer darf nicht ein zweites Mal speichern
    await vi.advanceTimersByTimeAsync(5000)
    expect(a.calls.put.length).toBe(1)
  })
})

describe('Upsert-Verhalten aus Client-Sicht', () => {
  it('wiederholtes Speichern schickt immer den aktuellen Stand an denselben Typ', async () => {
    const { form, a, saver } = setup()
    await saver.begin()
    form.name = 'Eins'; saver.touch(); await vi.advanceTimersByTimeAsync(3000)
    form.name = 'Zwei'; saver.touch(); await vi.advanceTimersByTimeAsync(3000)
    expect(a.calls.put.map(c => c.body.data.name)).toEqual(['Eins', 'Zwei'])
    expect(a.server?.data.name).toBe('Zwei')
  })
})

describe('Wiederherstellen', () => {
  it('bietet den Server-Entwurf an und übernimmt ihn bei „Wiederherstellen“', async () => {
    const { form, saver } = setup({ initial: { clientUpdatedAt: 1000, data: { name: 'Gespeichert', headline: 'H', contentItems: ['x'] } } })
    const c = await saver.begin()
    expect(c).toMatchObject({ source: 'server', at: 1000 })
    saver.restore()
    expect(form.name).toBe('Gespeichert')
    expect(form.headline).toBe('H')
    expect(saver.candidate).toBeNull()
  })

  it('„Verwerfen“ löscht lokale Kopie und Server-Entwurf', async () => {
    const { store, a, saver } = setup({ initial: { clientUpdatedAt: 1000, data: { name: 'Alt' } } })
    store.map.set('plx_draft:sub-A:marketing-campaign', JSON.stringify({ at: 900, data: { name: 'Alt lokal' } }))
    await saver.begin()
    await saver.discard()
    expect(a.calls.del).toBe(1)
    expect(a.server).toBeNull()
    expect(store.map.size).toBe(0)
    expect(saver.candidate).toBeNull()
  })

  it('bietet nichts an, wenn kein Entwurf existiert oder er dem leeren Formular entspricht', async () => {
    const empty = setup()
    expect(await empty.saver.begin()).toBeNull()
    const same = setup({ initial: { clientUpdatedAt: 5, data: { name: '', headline: '', contentItems: ['', ''] } } })
    expect(await same.saver.begin()).toBeNull()
  })
})

describe('Konflikt: der neuere Zeitstempel gewinnt', () => {
  it('lokale Kopie neuer als Server -> lokal', async () => {
    const { store, saver } = setup({ initial: { clientUpdatedAt: 1000, data: { name: 'Server' } } })
    store.map.set('plx_draft:sub-A:marketing-campaign', JSON.stringify({ at: 2000, data: { name: 'Lokal' } }))
    expect(await saver.begin()).toMatchObject({ source: 'local', data: { name: 'Lokal' } })
  })

  it('Server neuer als lokale Kopie -> Server', async () => {
    const { store, saver } = setup({ initial: { clientUpdatedAt: 3000, data: { name: 'Server' } } })
    store.map.set('plx_draft:sub-A:marketing-campaign', JSON.stringify({ at: 2000, data: { name: 'Lokal' } }))
    expect(await saver.begin()).toMatchObject({ source: 'server', data: { name: 'Server' } })
  })
})

describe('Offline und lokale Sicherung', () => {
  it('bei Verbindungsabbruch: Status offline, lokale Kopie vorhanden; später wieder gespeichert', async () => {
    const { form, store, a, saver, statuses } = setup()
    await saver.begin()
    a.setFail(true)
    form.name = 'Offline-Text'; saver.touch()
    await vi.advanceTimersByTimeAsync(3000)
    expect(saver.status).toBe('offline')
    expect(JSON.parse(store.map.get('plx_draft:sub-A:marketing-campaign')!).data.name).toBe('Offline-Text')
    a.setFail(false)
    form.name = 'Wieder da'; saver.touch()
    await vi.advanceTimersByTimeAsync(3000)
    expect(saver.status).toBe('saved')
    expect(statuses).toContain('saving')
    expect(statuses).toContain('offline')
  })

  it('Server nicht erreichbar beim Öffnen: lokale Kopie wird trotzdem angeboten', async () => {
    const { store, a, saver } = setup()
    store.map.set('plx_draft:sub-A:marketing-campaign', JSON.stringify({ at: 2000, data: { name: 'Nur lokal' } }))
    a.api.get = async () => { throw new Error('offline') }
    expect(await saver.begin()).toMatchObject({ source: 'local', data: { name: 'Nur lokal' } })
    expect(saver.status).toBe('offline')
  })

  it('kaputter oder gesperrter localStorage bringt nichts zum Absturz', async () => {
    const form: DraftData = { name: '', headline: '', contentItems: [] }
    const a = makeApi()
    const broken: KeyValueStore = { getItem() { throw new Error('x') }, setItem() { throw new Error('x') }, removeItem() { throw new Error('x') } }
    const saver = new DraftAutosaver({ formType: 'marketing-campaign', fields: FIELDS, userKey: 'u', getData: () => form, applyData: d => Object.assign(form, d), api: a.api, storage: broken })
    await expect(saver.begin()).resolves.toBeNull()
    form.name = 'x'; saver.touch()
    await vi.advanceTimersByTimeAsync(3000)
    expect(a.calls.put.length).toBe(1)
    await expect(saver.discard()).resolves.toBeUndefined()
  })

  it('beschädigte lokale Daten werden ignoriert', async () => {
    const { store, saver } = setup()
    store.map.set('plx_draft:sub-A:marketing-campaign', '{kaputt')
    expect(await saver.begin()).toBeNull()
  })
})

describe('Keine Geheimnisse im Entwurf', () => {
  it('speichert nur Whitelist-Felder, weder auf dem Server noch lokal', async () => {
    const { form, store, a, saver } = setup()
    await saver.begin()
    form.name = 'x'; form.token = 'GEHEIM'; form.password = 'pw'; saver.touch()
    await vi.advanceTimersByTimeAsync(3000)
    expect(Object.keys(a.calls.put[0].body.data).sort()).toEqual(['contentItems', 'headline', 'name'])
    const local = store.map.get('plx_draft:sub-A:marketing-campaign')!
    expect(local).not.toContain('GEHEIM')
    expect(local).not.toContain('pw')
  })

  it('der localStorage-Schlüssel enthält keinen Token, nur die Nutzerkennung', async () => {
    const { form, store, saver } = setup()
    await saver.begin()
    form.name = 'x'; saver.touch()
    expect([...store.map.keys()]).toEqual(['plx_draft:sub-A:marketing-campaign'])
  })
})

describe('Nach „Kampagne erstellen“', () => {
  it('clear entfernt Entwurf überall und beendet das Autosave', async () => {
    const { form, store, a, saver } = setup()
    await saver.begin()
    form.name = 'x'; saver.touch(); await vi.advanceTimersByTimeAsync(3000)
    await saver.clear()
    expect(a.server).toBeNull()
    expect(store.map.size).toBe(0)
    form.name = 'y'; saver.touch(); await vi.advanceTimersByTimeAsync(5000)
    expect(a.calls.put.length).toBe(1)
  })

  it('stop (Formular zugeklappt) behält den Entwurf, speichert aber nicht mehr', async () => {
    const { form, a, saver } = setup()
    await saver.begin()
    form.name = 'x'; saver.touch(); await vi.advanceTimersByTimeAsync(3000)
    saver.stop()
    form.name = 'y'; saver.touch(); await vi.advanceTimersByTimeAsync(5000)
    expect(a.calls.put.length).toBe(1)
    expect(a.server?.data.name).toBe('x')
  })
})

describe('Gleichzeitige Speicherungen', () => {
  it('ändert sich das Formular während eines laufenden Speicherns, wird danach genau einmal nachgeschoben', async () => {
    const { form, a, saver } = setup()
    await saver.begin()
    // Nur der erste Aufruf wartet, bis der Test ihn freigibt; weitere gehen direkt durch
    let release!: () => void
    const original = a.api.put
    let first = true
    a.api.put = (t, b, o) => {
      if (!first) return original(t, b, o)
      first = false
      return new Promise<void>(res => { release = () => { original(t, b, o).then(() => res()) } })
    }
    form.name = 'A'; saver.touch(); await vi.advanceTimersByTimeAsync(3000)   // Speichern A läuft (blockiert)
    form.name = 'B'; await saver.flush()                                         // während A läuft: wird vorgemerkt
    expect(a.calls.put.length).toBe(0)
    release()
    await vi.advanceTimersByTimeAsync(10)
    expect(a.calls.put.map(c => c.body.data.name)).toEqual(['A', 'B'])
  })
})
