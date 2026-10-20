// Ein kleines sRGB-Farbprofil (ICC v2, Matrix/Kurven), selbst erzeugt aus den veröffentlichten sRGB-Werten (IEC 61966-2.1, Primärfarben auf D50 angepasst).
// Wird als "Ausgabebedingung" (OutputIntent) in ZUGFeRD-PDFs gebraucht, weil PDF/A für Farben ein Profil verlangt. Kein fremdes Profil, keine Lizenzfragen.
const s15 = (v: number) => { const b = Buffer.alloc(4); b.writeInt32BE(Math.round(v * 65536)); return b }
const xyz = (x: number, y: number, z: number) => Buffer.concat([Buffer.from('XYZ \0\0\0\0', 'latin1'), s15(x), s15(y), s15(z)])
const pad4 = (b: Buffer) => (b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - (b.length % 4))]) : b)

export function buildSrgbIcc(): Buffer {
  const trc = Buffer.alloc(12 + 1024 * 2)
  trc.write('curv', 0, 'latin1'); trc.writeUInt32BE(1024, 8)
  for (let i = 0; i < 1024; i++) { const x = i / 1023, v = x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); trc.writeUInt16BE(Math.round(v * 65535), 12 + i * 2) }
  const name = 'sRGB IEC61966-2.1'
  const desc = Buffer.alloc(12 + name.length + 1 + 4 + 4 + 3 + 67)
  desc.write('desc', 0, 'latin1'); desc.writeUInt32BE(name.length + 1, 8); desc.write(name, 12, 'latin1')
  const cprt = Buffer.concat([Buffer.from('text\0\0\0\0', 'latin1'), Buffer.from('Public Domain\0', 'latin1')])
  const tags: Array<[string, Buffer]> = [['desc', desc], ['cprt', cprt], ['wtpt', xyz(0.9642, 1.0, 0.8249)], ['rXYZ', xyz(0.4360747, 0.2225045, 0.0139322)], ['gXYZ', xyz(0.3850649, 0.7168786, 0.0971045)], ['bXYZ', xyz(0.1430804, 0.0606169, 0.7141733)], ['rTRC', trc]]
  const tableSize = 4 + (tags.length + 2) * 12
  let offset = 128 + tableSize
  const entries: Buffer[] = [], bodies: Buffer[] = []
  for (const [sig, data] of tags) {
    const e = Buffer.alloc(12); e.write(sig, 0, 'latin1'); e.writeUInt32BE(offset, 4); e.writeUInt32BE(data.length, 8); entries.push(e)
    const padded = pad4(data); bodies.push(padded)
    if (sig === 'rTRC') for (const other of ['gTRC', 'bTRC']) { const o = Buffer.alloc(12); o.write(other, 0, 'latin1'); o.writeUInt32BE(offset, 4); o.writeUInt32BE(data.length, 8); entries.push(o) }
    offset += padded.length
  }
  const head = Buffer.alloc(128)
  head.writeUInt32BE(offset, 0); head.writeUInt32BE(0x02100000, 8); head.write('mntr', 12, 'latin1'); head.write('RGB ', 16, 'latin1'); head.write('XYZ ', 20, 'latin1')
  head.writeUInt16BE(2026, 24); head.writeUInt16BE(1, 26); head.writeUInt16BE(1, 28); head.write('acsp', 36, 'latin1')
  s15(0.9642).copy(head, 68); s15(1.0).copy(head, 72); s15(0.8249).copy(head, 76)
  const count = Buffer.alloc(4); count.writeUInt32BE(entries.length)
  return Buffer.concat([head, count, ...entries, ...bodies])
}
