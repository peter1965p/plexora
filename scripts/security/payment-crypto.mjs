// AES-256-GCM im selben Format wie server/utils/crypto.ts (iv 12 Byte : Auth-Tag 16 Byte : Chiffrat, hex). Gemeinsam genutzt vom Migrationsskript und seinem Test.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
export const ENC = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/
export const seal = (key, text) => { const iv = randomBytes(12); const c = createCipheriv('aes-256-gcm', key, iv); const ct = Buffer.concat([c.update(text, 'utf8'), c.final()]); return `${iv.toString('hex')}:${c.getAuthTag().toString('hex')}:${ct.toString('hex')}` }
export const reveal = (key, enc) => { const [iv, tag, ct] = enc.split(':'); const d = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex')); d.setAuthTag(Buffer.from(tag, 'hex')); return Buffer.concat([d.update(Buffer.from(ct, 'hex')), d.final()]).toString('utf8') }
