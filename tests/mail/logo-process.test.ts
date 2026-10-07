import { describe, it, expect } from 'vitest'
import { crc32 } from 'node:zlib'
import { PNG } from 'pngjs'
import jpeg from 'jpeg-js'
import { processLogo, detectLogoType, assertSafeFileName, LogoError, MAX_LOGO_BYTES, LOGO_OUT_W, LOGO_OUT_H, LOGO_MIN_W, LOGO_MIN_H } from '../../server/utils/mailLogo'

// ── Testbilder selbst erzeugen ──
const png = (w: number, h: number, fill: (x: number, y: number) => [number, number, number, number] = () => [20, 80, 200, 255]) => {
  const p = new PNG({ width: w, height: h }); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; const [r, g, b, a] = fill(x, y); p.data[o] = r; p.data[o + 1] = g; p.data[o + 2] = b; p.data[o + 3] = a } return PNG.sync.write(p)
}
const jpg = (w: number, h: number) => { const data = Buffer.alloc(w * h * 4); for (let i = 0; i < w * h; i++) { data[i * 4] = 200; data[i * 4 + 1] = 60; data[i * 4 + 2] = 20; data[i * 4 + 3] = 255 } return Buffer.from(jpeg.encode({ data, width: w, height: h }, 90).data) }
const chunk = (type: string, body: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(body.length); const t = Buffer.from(type, 'latin1'); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, body])) >>> 0); return Buffer.concat([len, t, body, crc]) }
const pngWithChunk = (buf: Buffer, type: string, body: Buffer) => { const iend = buf.length - 12; return Buffer.concat([buf.subarray(0, iend), chunk(type, body), buf.subarray(iend)]) }
const jpgWithExif = (buf: Buffer, text: string) => { const body = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), Buffer.from(text, 'latin1')]); const seg = Buffer.alloc(4); seg[0] = 0xff; seg[1] = 0xe1; seg.writeUInt16BE(body.length + 2, 2); return Buffer.concat([buf.subarray(0, 2), seg, body, buf.subarray(2)]) }
const asString = (b: Buffer) => b.toString('latin1')

describe('Typ an den Magic Bytes, nicht an Endung oder Angabe', () => {
  it('erkennt PNG und JPG; alles andere ist null', () => {
    expect(detectLogoType(png(4, 4))).toBe('png'); expect(detectLogoType(jpg(8, 8))).toBe('jpg')
    for (const b of [Buffer.from('GIF89a....'), Buffer.from('RIFF\0\0\0\0WEBPVP8 '), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), Buffer.from('<!DOCTYPE html><html></html>'), Buffer.from('%PDF-1.4'), Buffer.alloc(0), Buffer.from('MZ\x90\x00')]) expect(detectLogoType(b)).toBeNull()
  })
  it('SVG, GIF, WebP und ein als PNG benanntes HTML/SVG werden abgelehnt – auch mit passender Endung und Dateiname', () => {
    const fakes: Record<string, Buffer> = { 'logo.png': Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'), 'bild.png': Buffer.from('<!DOCTYPE html><script>alert(1)</script>'), 'a.jpg': Buffer.from('GIF89a\x01\x00\x01\x00'), 'b.png': Buffer.from('RIFF\x24\x00\x00\x00WEBPVP8 ') }
    for (const [name, buf] of Object.entries(fakes)) expect(() => processLogo(buf, name), name).toThrow(/kein PNG oder JPG/)   // genau wegen der Magic Bytes, nicht zufällig später
  })
})

describe('Dateiname: Pfadangriffe und Doppelendungen', () => {
  it('lehnt ab', () => {
    for (const n of ['../../etc/passwd.png', '..\\..\\x.png', 'a/b.png', 'a\\b.png', '/abs.png', 'logo.html.png', 'logo.php.png', 'logo.svg.png', 'logo.png.html', 'logo.png.php', 'logo.js.jpg', '.htaccess', '.png', 'x\u0000.png', 'x\n.png', 'a%2e%2e%2fb.png', 'logo.svg', 'logo.gif', 'logo.webp', 'logo', 'a'.repeat(130) + '.png', 'evil‮gnp.exe', 'a:b.png', 'a|b.png', 'a<b>.png']) expect(() => assertSafeFileName(n), JSON.stringify(n)).toThrow(LogoError)
  })
  it('erlaubt normale Namen (der Name wird ohnehin nie gespeichert)', () => { for (const n of ['logo.png', 'Firmenlogo.v2.png', 'LOGO.JPG', 'mein logo.jpeg', undefined, '']) expect(() => assertSafeFileName(n), String(n)).not.toThrow() })
})

describe('processLogo prüft den Dateinamen selbst (nicht nur die Hilfsfunktion)', () => {
  it('ein gültiges Bild mit bösem Dateinamen wird abgelehnt, mit normalem Namen und ganz ohne Namen verarbeitet', () => {
    for (const n of ['../../etc/passwd.png', 'logo.html.png', 'a/b.png', 'x\u0000.png', 'logo.svg']) expect(() => processLogo(png(20, 20), n), n).toThrow(LogoError)
    expect(() => processLogo(png(20, 20), 'Logo.png')).not.toThrow(); expect(() => processLogo(png(20, 20))).not.toThrow()
  })
})

describe('Warnung bei zu kleinen Bildern (empfohlen mindestens 250 x 100)', () => {
  it('kleiner als 250 x 100: Warnung mit den echten Maßen, aber verarbeitet und nicht vergrößert; ab 250 x 100 keine Warnung', () => {
    const small = processLogo(png(120, 40), 'x.png'); expect(small.warning).toMatch(/120 × 40/); expect(small.warning).toMatch(/250 × 100/); expect([small.width, small.height]).toEqual([120, 40])
    expect(processLogo(png(250, 99), 'x.png').warning).toBeTruthy(); expect(processLogo(png(249, 100), 'x.png').warning).toBeTruthy()
    expect(processLogo(png(250, 100), 'x.png').warning).toBeUndefined(); expect(processLogo(png(1000, 400), 'x.png').warning).toBeUndefined()
    expect(processLogo(png(1000, 400), 'x.png')).toMatchObject({ origWidth: 1000, origHeight: 400 })   // Warnung bezieht sich auf das Original, nicht auf das verkleinerte Ergebnis
  })
})

describe('Größen und kaputte Dateien', () => {
  it('zu große Datei (über 300 KB) und leere Datei', () => {
    const noise = new PNG({ width: 400, height: 400 }); for (let i = 0; i < noise.data.length; i++) noise.data[i] = Math.floor(Math.random() * 256)
    const big = PNG.sync.write(noise); expect(big.length).toBeGreaterThan(MAX_LOGO_BYTES); expect(() => processLogo(big, 'x.png')).toThrow(/zu groß/)
    expect(() => processLogo(Buffer.alloc(0))).toThrow(/leer/)
  })
  it('zu großes Bild (über 2000 × 2000) wird vor dem Dekodieren abgelehnt, 2000 × 2000 geht', () => {
    expect(() => processLogo(png(2001, 1), 'x.png')).toThrow(/zu groß/); expect(() => processLogo(png(1, 2001), 'x.png')).toThrow(/zu groß/)
    const ok = processLogo(png(2000, 2000), 'x.png'); expect(ok.width).toBeLessThanOrEqual(LOGO_OUT_W); expect(ok.height).toBeLessThanOrEqual(LOGO_OUT_H)
  })
  it('beschädigte, abgeschnittene und erfundene Dateien', () => {
    const p = png(50, 50), j = jpg(50, 50)
    for (const b of [p.subarray(0, 40), p.subarray(0, p.length - 20), j.subarray(0, 100), j.subarray(0, j.length - 5), Buffer.concat([PNG_HEAD(), Buffer.from('nur müll')]), Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])]) expect(() => processLogo(b, 'x.png')).toThrow(LogoError)
  })
})
function PNG_HEAD() { return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }

describe('Polyglots und Tarnung', () => {
  it('gültiges Bild mit angehängtem HTML/Skript oder anderen Daten hinter dem Bildende wird abgelehnt', () => {
    for (const tail of ['<html><script>alert(1)</script></html>', '<svg onload=alert(1)>', 'PK\x03\x04', 'AAAA', '\n']) {
      expect(() => processLogo(Buffer.concat([png(20, 20), Buffer.from(tail)]), 'x.png'), `png + ${JSON.stringify(tail)}`).toThrow(LogoError)
      expect(() => processLogo(Buffer.concat([jpg(20, 20), Buffer.from(tail)]), 'x.jpg'), `jpg + ${JSON.stringify(tail)}`).toThrow(LogoError)
    }
  })
  it('gültiges Bild mit Skript/Markup in einem Metadatenblock wird abgelehnt', () => {
    for (const evil of ['<script>alert(1)</script>', '<svg onload=alert(1)>', '<?php system($_GET[0]); ?>', 'javascript:alert(1)', '<html><body>']) {
      expect(() => processLogo(pngWithChunk(png(20, 20), 'tEXt', Buffer.from('Comment\0' + evil)), 'x.png'), evil).toThrow(/verdächtig/)
      expect(() => processLogo(jpgWithExif(jpg(20, 20), evil), 'x.jpg'), evil).toThrow(/verdächtig/)
    }
  })
})

describe('Neu kodiert: Metadaten sind weg, Ergebnis ist ein sauberes Bild', () => {
  it('EXIF-Standort aus dem JPG ist nach der Verarbeitung entfernt', () => {
    const src = jpgWithExif(jpg(300, 120), 'GPSLatitudeRef=N GPSLatitude=52.5200 GPSLongitude=13.4050 Make=SecretCam')
    expect(asString(src)).toContain('GPSLatitude')
    const out = processLogo(src, 'foto.jpg')
    for (const needle of ['Exif', 'GPS', 'SecretCam', '52.5200', '13.4050']) expect(asString(out.data), needle).not.toContain(needle)
    expect(detectLogoType(out.data)).toBe('jpg'); expect(jpeg.decode(out.data).width).toBe(out.width)
  })
  it('Textblöcke, EXIF- und Profilblöcke aus dem PNG sind entfernt; das Ergebnis enthält nur Bilddaten', () => {
    let src = png(300, 120)
    src = pngWithChunk(src, 'tEXt', Buffer.from('Location\0Berlin-Mitte secret')); src = pngWithChunk(src, 'eXIf', Buffer.from('MM\0*GPSsecret')); src = pngWithChunk(src, 'iTXt', Buffer.from('XML:com.adobe.xmp\0\0\0\0\0<x:xmpmeta/>'))
    expect(asString(src)).toContain('Berlin-Mitte')
    const out = processLogo(src, 'x.png')
    for (const needle of ['tEXt', 'eXIf', 'iTXt', 'zTXt', 'iCCP', 'Berlin-Mitte', 'secret', 'xmpmeta']) expect(asString(out.data), needle).not.toContain(needle)
    const chunks: string[] = []; for (let p = 8; p < out.data.length;) { const len = out.data.readUInt32BE(p); chunks.push(out.data.toString('latin1', p + 4, p + 8)); p += 12 + len }
    expect(chunks.filter(c => !['IHDR', 'IDAT', 'IEND'].includes(c))).toEqual([])
  })
  it('verkleinert in den Rahmen 500 x 200 (doppelte Auflösung für die Anzeige mit 250 x 100), vergrößert nie, behält das Seitenverhältnis', () => {
    expect([LOGO_OUT_W, LOGO_OUT_H, LOGO_MIN_W, LOGO_MIN_H]).toEqual([500, 200, 250, 100])
    const big = processLogo(png(1200, 480), 'x.png'); expect([big.width, big.height]).toEqual([500, 200])
    const tall = processLogo(png(100, 1000), 'x.png'); expect([tall.width, tall.height]).toEqual([20, 200])
    const square = processLogo(png(400, 400), 'x.png'); expect([square.width, square.height]).toEqual([200, 200])
    const small = processLogo(png(120, 40), 'x.png'); expect([small.width, small.height]).toEqual([120, 40])
    const mid = processLogo(png(300, 100), 'x.png'); expect([mid.width, mid.height]).toEqual([300, 100])
    const j = processLogo(jpg(960, 320), 'x.jpg'); expect([j.width, j.height]).toEqual([500, 167])
  })
  it('Transparenz bleibt erhalten (transparente Logos), Farben bleiben richtig', () => {
    const half = png(10, 10, (x) => (x < 5 ? [255, 0, 0, 0] : [0, 128, 255, 255]))
    const out = processLogo(half, 'x.png'); const dec = PNG.sync.read(out.data)
    expect(dec.data[3]).toBe(0); expect(dec.data[(9) * 4 + 3]).toBe(255); expect([dec.data[36], dec.data[37], dec.data[38]]).toEqual([0, 128, 255])
    const scaled = PNG.sync.read(processLogo(png(480, 200, (x) => (x < 240 ? [10, 200, 10, 255] : [200, 10, 10, 255])), 'x.png').data)
    expect(scaled.data[0]).toBeLessThan(40); expect(scaled.data[(scaled.width - 1) * 4]).toBeGreaterThan(160)   // links grün, rechts rot, keine Mischfarben am Rand
  })
  it('PNG bleibt PNG, JPG bleibt JPG (Typ wird aus dem Inhalt abgeleitet, nicht aus dem Dateinamen)', () => {
    expect(processLogo(png(30, 30), 'bild.jpg').type).toBe('png'); expect(processLogo(jpg(30, 30), 'bild.png').type).toBe('jpg')
  })
})
