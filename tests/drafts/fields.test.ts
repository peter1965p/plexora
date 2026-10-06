import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { MARKETING_CAMPAIGN_DRAFT_FIELDS } from '../../shared/draftFields'
import { DRAFT_SCHEMAS } from '../../server/utils/drafts/schema'

describe('Konsistenz Client <-> Server', () => {
  it('die Feldliste des Frontends entspricht der Server-Whitelist exakt', () => {
    expect([...MARKETING_CAMPAIGN_DRAFT_FIELDS].sort()).toEqual(Object.keys(DRAFT_SCHEMAS['marketing-campaign'].fields).sort())
  })

  it('jedes Entwurfs-Feld existiert im Formular der Marketing-Seite', () => {
    const page = readFileSync('app/pages/marketing/index.vue', 'utf8')
    const formBlock = page.slice(page.indexOf('const form = reactive({'), page.indexOf('// ── Entwurfs-Autosave'))
    for (const f of MARKETING_CAMPAIGN_DRAFT_FIELDS) expect(formBlock, f).toContain(`${f}:`)
  })

  it('Timer und Autosave verwenden denselben Ereignisnamen', () => {
    const idle = readFileSync('app/composables/useIdleTimer.ts', 'utf8')
    const auto = readFileSync('app/composables/useDraftAutosave.ts', 'utf8')
    expect(idle).toContain("'plx:session-expiring'")
    expect(auto).toContain("'plx:session-expiring'")
  })
})

describe('Einbau im Kampagnen-Modal', () => {
  const page = readFileSync('app/pages/marketing/index.vue', 'utf8')
  it('Autosave nur beim Neuanlegen (nicht beim Bearbeiten) und Entwurf wird nach dem Anlegen gelöscht', () => {
    expect(page).toContain('if (open && !editing.value) void draft.begin()')
    expect(page).toContain('if (!editing.value) await draft.clear()')
  })
  it('der Button "Kampagne erstellen" validiert weiter Pflichtfelder (Entwürfe dagegen nicht)', () => {
    expect(page).toContain(':disabled="!form.name || !form.formId || saving"')
  })
})
