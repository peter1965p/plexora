import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { reactive } from 'vue'
import { plain } from '../../app/utils/plain'
import { DEFAULT_INVITE, resolveInviteConfig } from '../../shared/mailTemplate'

describe('"Proxy object could not be cloned": reaktive Daten kopieren', () => {
  it('Ursache belegt: structuredClone wirft bei einem Vue-reactive-Objekt', () => {
    expect(() => structuredClone(reactive({ a: { b: 1 } }))).toThrow()
  })
  it('plain() kopiert reaktive Objekte tief und unabhängig', () => {
    const r = reactive({ a: { b: [1, 2] }, s: 'x' }); const c = plain(r)
    expect(c).toEqual({ a: { b: [1, 2] }, s: 'x' }); c.a.b.push(3); expect(r.a.b).toEqual([1, 2])
  })
  it('die komplette Vorlagen-Konfiguration übersteht reactive -> plain -> Auflösen unverändert', () => {
    const draft = reactive(plain(DEFAULT_INVITE)); draft.logo.mode = 'custom'
    expect(resolveInviteConfig(plain(draft))).toEqual(resolveInviteConfig({ ...DEFAULT_INVITE, logo: { ...DEFAULT_INVITE.logo, mode: 'custom' } }))
  })
  it('der Editor ruft nirgends structuredClone auf (Speichern und Testmail sind genau daran gescheitert)', () => {
    const src = readFileSync('app/components/MailTemplateEditor.vue', 'utf8')
    expect(src).not.toMatch(/structuredClone\s*\(/); expect(src).toContain("from '~/utils/plain'")
  })
})
