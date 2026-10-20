import { PDFDocument, PDFName, PDFString, PDFHexString, PDFArray, PDFDict, PDFRawStream, AFRelationship, decodePDFRawStream } from 'pdf-lib'
import { randomBytes } from 'node:crypto'
import { ZUGFERD_FILENAME } from '../../shared/einvoice'
import { buildSrgbIcc } from './srgbIcc'

// ZUGFeRD / Factur-X: die XML-Rechnung als Anhang "factur-x.xml" in das PDF einbetten (Beziehung "Alternative") und die Kennung (XMP) setzen.
// Grenze: Das PDF kommt aus dem Browser-Renderer; ob es streng PDF/A-3b erfüllt (Schriften, Farbprofil), ist nicht zertifiziert. Lesegeräte
// (z. B. Buchhaltungsprogramme) holen die Rechnung aus dem Anhang.
const xmpPacket = (title: string, created: string) => `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">${title.replace(/[<>&"]/g, '')}</rdf:li></rdf:Alt></dc:title></rdf:Description>
<rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/"><pdf:Producer>Plexora</pdf:Producer></rdf:Description>
<rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/"><xmp:CreatorTool>Plexora</xmp:CreatorTool><xmp:CreateDate>${created}</xmp:CreateDate></rdf:Description>
<rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"><pdfaid:part>3</pdfaid:part><pdfaid:conformance>B</pdfaid:conformance></rdf:Description>
<rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#"><fx:DocumentType>INVOICE</fx:DocumentType><fx:DocumentFileName>${ZUGFERD_FILENAME}</fx:DocumentFileName><fx:Version>1.0</fx:Version><fx:ConformanceLevel>EN 16931</fx:ConformanceLevel></rdf:Description>
<rdf:Description rdf:about="" xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/" xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#" xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#"><pdfaExtension:schemas><rdf:Bag><rdf:li rdf:parseType="Resource"><pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema><pdfaSchema:namespaceURI>urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI><pdfaSchema:prefix>fx</pdfaSchema:prefix><pdfaSchema:property><rdf:Seq>
<rdf:li rdf:parseType="Resource"><pdfaProperty:name>DocumentFileName</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>Name des eingebetteten XML-Dokuments</pdfaProperty:description></rdf:li>
<rdf:li rdf:parseType="Resource"><pdfaProperty:name>DocumentType</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>INVOICE</pdfaProperty:description></rdf:li>
<rdf:li rdf:parseType="Resource"><pdfaProperty:name>Version</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>Version des XML-Dokuments</pdfaProperty:description></rdf:li>
<rdf:li rdf:parseType="Resource"><pdfaProperty:name>ConformanceLevel</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>Konformitätsstufe</pdfaProperty:description></rdf:li>
</rdf:Seq></pdfaSchema:property></rdf:li></rdf:Bag></pdfaExtension:schemas></rdf:Description>
</rdf:RDF></x:xmpmeta><?xpacket end="w"?>`

export async function embedZugferd(pdf: Uint8Array | Buffer, xml: string, title: string): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdf, { updateMetadata: false })
  const now = new Date()
  await doc.attach(Buffer.from(xml, 'utf8'), ZUGFERD_FILENAME, { mimeType: 'text/xml', description: 'Rechnung im Format ZUGFeRD/Factur-X (EN 16931)', creationDate: now, modificationDate: now, afRelationship: AFRelationship.Alternative })
  await doc.flush()                                   // pdf-lib legt den Anhang erst beim Speichern/Flush an
  const ctx = doc.context
  // Anhang auch unter /AF im Katalog führen (Zuordnung der Datei zum Dokument)
  const names = doc.catalog.lookup(PDFName.of('Names'), PDFDict)
  const files = names.lookup(PDFName.of('EmbeddedFiles'), PDFDict).lookup(PDFName.of('Names'), PDFArray)
  const af = ctx.obj([]); af.push(files.get(1))
  doc.catalog.set(PDFName.of('AF'), af)
  const xmp = ctx.stream(Buffer.from(xmpPacket(title, now.toISOString()), 'utf8'), { Type: 'Metadata', Subtype: 'XML' })
  doc.catalog.set(PDFName.of('Metadata'), ctx.register(xmp))
  // PDF/A: Ausgabebedingung mit sRGB-Profil (sonst ist DeviceRGB nicht zulässig) und Dateikennung im Trailer
  const icc = ctx.register(ctx.stream(buildSrgbIcc(), { N: 3, Alternate: 'DeviceRGB' }))
  const intent = ctx.obj({ Type: 'OutputIntent', S: 'GTS_PDFA1', OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'), Info: PDFString.of('sRGB IEC61966-2.1'), RegistryName: PDFString.of('http://www.color.org'), DestOutputProfile: icc })
  doc.catalog.set(PDFName.of('OutputIntents'), ctx.obj([ctx.register(intent)]))
  const fid = randomBytes(16).toString('hex')
  ctx.trailerInfo.ID = ctx.obj([PDFHexString.of(fid), PDFHexString.of(fid)])
  doc.setTitle(title); doc.setProducer('Plexora'); doc.setCreator('Plexora')
  return await doc.save({ useObjectStreams: false })
}

/** Holt die eingebettete XML-Rechnung aus einem PDF (ZUGFeRD/Factur-X, auch ältere Dateinamen). null = kein passender Anhang. */
export async function extractEmbeddedXml(pdf: Uint8Array | Buffer): Promise<string | null> {
  let doc: PDFDocument
  try { doc = await PDFDocument.load(pdf, { ignoreEncryption: false, updateMetadata: false }) } catch { return null }
  const names = doc.catalog.lookupMaybe(PDFName.of('Names'), PDFDict)
  const files = names?.lookupMaybe(PDFName.of('EmbeddedFiles'), PDFDict)?.lookupMaybe(PDFName.of('Names'), PDFArray)
  if (!files) return null
  for (let i = 0; i + 1 < files.size(); i += 2) {
    const nm = files.lookup(i); const spec = files.lookupMaybe(i + 1, PDFDict)
    const name = nm instanceof PDFString || nm instanceof PDFHexString ? nm.decodeText() : ''
    if (!spec || !/\.xml$/i.test(name)) continue
    const stream = spec.lookupMaybe(PDFName.of('EF'), PDFDict)?.lookup(PDFName.of('F'))
    if (stream instanceof PDFRawStream) return Buffer.from(decodePDFRawStream(stream).decode()).toString('utf8')
  }
  return null
}
