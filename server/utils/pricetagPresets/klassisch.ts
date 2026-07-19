export const klassischTemplate = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<style>
  @page { size: A5; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a1a; }
  .card { width: 148mm; min-height: 210mm; padding: 16mm 14mm; position: relative; }

  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10mm; }
  .logo img { max-height: 14mm; max-width: 50mm; object-fit: contain; }
  .haendler-name { font-size: 12pt; font-weight: 700; margin: 0; }
  .haendler-meta { font-size: 8pt; color: #6b6b6b; margin-top: 2mm; line-height: 1.5; }

  .titel { font-size: 20pt; font-weight: 800; margin: 4mm 0 1mm; letter-spacing: -0.3pt; }
  .variante { font-size: 10pt; color: #6b6b6b; margin: 0 0 2mm; }
  .baujahr { font-size: 9pt; color: #9a9a9a; margin: 0 0 8mm; }

  .preis-badge { display: inline-block; background: {{haendler.farbe}}; color: #fff; font-size: 22pt; font-weight: 800; padding: 4mm 8mm; border-radius: 4mm; margin-bottom: 8mm; }

  .content-zone { font-size: 10pt; line-height: 1.6; }
  .content-zone ul { padding-left: 0; list-style: none; margin: 0 0 6mm; }
  .content-zone li { margin: 0 0 2mm; }
  .content-zone p { margin: 0 0 4mm; }

  .footer { position: absolute; left: 14mm; right: 14mm; bottom: 10mm; font-size: 7pt; color: #b0b0b0; text-align: center; }
</style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">{{#if haendler.logo}}<img src="{{haendler.logo}}" alt="Logo">{{/if}}</div>
      <div style="text-align:right">
        <p class="haendler-name">{{haendler.name}}</p>
        <div class="haendler-meta">{{#if haendler.telefon}}{{haendler.telefon}}<br>{{/if}}{{#if haendler.email}}{{haendler.email}}{{/if}}</div>
      </div>
    </div>

    <div class="titel">{{fahrzeug.marke}} {{fahrzeug.modell}}</div>
    {{#if fahrzeug.variante}}<p class="variante">{{fahrzeug.variante}}</p>{{/if}}
    <p class="baujahr">Baujahr {{fahrzeug.baujahr}} · {{fahrzeug.km}}{{#if fahrzeug.kraftstoff}} · {{fahrzeug.kraftstoff}}{{/if}}</p>

    <div class="preis-badge">{{fahrzeug.preis}}</div>

    <div class="content-zone">__PRICETAG_CONTENT__</div>

    <div class="footer">{{haendler.name}}{{#if haendler.adresse}} · {{haendler.adresse}}{{/if}}</div>
  </div>
</body>
</html>
`
